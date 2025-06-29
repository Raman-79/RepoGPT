import { NextResponse } from 'next/server';
import { system_prompt } from '../prompts/review-prompt';
import { db } from '@/lib/db';
import { getEmbeddings } from '../embeddings/route';
import { handleApiError, ExternalServiceError } from '@/lib/errors';
import { validateInput, chatMessageSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_prompt } = validateInput(chatMessageSchema, body);
    
    const CLOUDFLARE_ACCOUNT_ID = process.env.ACCOUNT_ID;
    const CLOUDFLARE_API_TOKEN = process.env.WORKERS_AI;
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new Error('Missing required environment variables: ACCOUNT_ID or WORKERS_AI');
    }

    // Generate embedding for user prompt
    const embeddings = await getEmbeddings(user_prompt);
    const queryVector = `[${embeddings.join(',')}]`;
    
    let contextDocuments;
    try {
      contextDocuments = await db.$queryRaw`
        SELECT "fileName", "rawContent", "summary"
        FROM (
          SELECT "fileName", "rawContent", "summary",
                 1 - ("embedding" <=> ${queryVector}::vector) AS similarity
          FROM "embedding"
          WHERE "type" = 'SUMMARY'
        ) subquery
        WHERE similarity > 0.5
        ORDER BY similarity DESC
        LIMIT 10
      ` as { fileName: string; rawContent: string; summary: string }[];
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      throw new ExternalServiceError('Database', 'Failed to retrieve context');
    }

    const context = contextDocuments
      .map(doc => `source ${doc.fileName}\ncode content:${doc.rawContent}\nsummary of file: ${doc.summary}`)
      .join('\n\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-2-7b-chat-int8`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: system_prompt(context) },
              { role: "user", content: user_prompt }
            ],
            stream: true
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Cloudflare API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        
        throw new ExternalServiceError('Cloudflare AI', `API returned ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const reader = response.body.getReader();
      let buffer = '';
      
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (buffer.trim()) {
                await processChunk(buffer.trim());
              }
              await writer.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              await processChunk(line.trim());
            }
          }
        } catch (error) {
          console.error('Error processing stream:', error);
          await writer.abort(error);
        }
      })();

      async function processChunk(chunk: string) {
        if (!chunk) return;
        
        const jsonStr = chunk.startsWith('data: ') ? chunk.slice(6) : chunk;
        
        if (jsonStr === '[DONE]') return;
          
        try {
          const json = JSON.parse(jsonStr);
          if (json.response) {
            await writer.write(encoder.encode(json.response));
          }
        } catch (e) {
          if (jsonStr !== '[DONE]') {
            console.error('Error parsing chunk:', e, 'Chunk:', jsonStr);
          }
        }
      }

      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out' },
          { status: 504 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Error in chat API:', error);
    const { message, statusCode } = handleApiError(error);
    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }
}