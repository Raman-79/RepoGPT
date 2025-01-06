import { NextResponse } from 'next/server'
import { system_prompt } from '../prompts/review-prompt'
import { db } from '@/lib/db'
import { getEmbeddings } from '../embeddings/route'


export async function POST(request: Request) {
  try {
   
    const { user_prompt } = await request.json()
    
    const CLOUDFLARE_ACCOUNT_ID = process.env.ACCOUNT_ID
    const CLOUDFLARE_API_TOKEN = process.env.WORKERS_AI
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new Error('Missing required environment variables')
    }

    // Generate embedding for user prompt
    const embeddings = await getEmbeddings(user_prompt)
    const queryVector = `[${embeddings.join(',')}]`
    
    let user_prompt_res_embedding
    try {
      user_prompt_res_embedding = await db.$queryRaw`
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
      ` as { fileName: string; rawContent: string; summary: string }[]
    } catch (dbError) {
      console.error('Database query failed:', dbError)
      return NextResponse.json(
        { error: 'Failed to retrieve context from database' },
        { status: 500 }
      )
    }

    let context = ''
    for (const doc of user_prompt_res_embedding) {
      context += `source ${doc.fileName}\ncode content:${doc.rawContent}\n summary of file: ${doc.summary} `
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

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
              { role: "user", content: JSON.stringify(user_prompt) }
            ],
            stream: true
          }),
          
        }
      )

      clearTimeout(timeout)
      //Need a custom response 
      if (!response.ok) {
        const errorBody = await response.text()
        console.error('Cloudflare API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        })
        
        if (response.status === 404) {
          return NextResponse.json(
            { error: 'Cloudflare Workers AI endpoint not found. Please verify the API endpoint.' },
            { status: 404 }
          )
        }
        
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Authentication failed. Please check your Cloudflare API credentials.' },
            { status: 401 }
          )
        }

        throw new Error(`Cloudflare API returned ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const stream = new TransformStream()
      const writer = stream.writable.getWriter()
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      const reader = response.body.getReader()
      
      let buffer = ''
      
      ;(async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              if (buffer.trim()) {
                processChunk(buffer.trim())
              }
              await writer.close()
              break
            }

            buffer += decoder.decode(value, { stream: true })
            
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            
            for (const line of lines) {
              await processChunk(line.trim())
            }
          }
        } catch (error) {
          console.error('Error processing stream:', error)
          await writer.abort(error)
        }
      })()

      // Helper function to process each chunk
      async function processChunk(chunk: string) {
        if (!chunk) return
        
        // Remove "data: " prefix if it exists
        const jsonStr = chunk.startsWith('data: ') 
          ? chunk.slice(6)
          : chunk
        
        // Handle stream termination message
        if (jsonStr === '[DONE]') {
          return
        }
          
        try {
          const json = JSON.parse(jsonStr)
          if (json.response) {
            await writer.write(encoder.encode(json.response))
          }
        } catch (e) {
          // Only log parsing errors for non-[DONE] messages
          if (jsonStr !== '[DONE]') {
            console.error('Error parsing chunk:', e, 'Chunk:', jsonStr)
          }
        }
      }

      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })

    } catch (error) {
      //@ts-expect-error abc
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out' },
          { status: 504 }
        )
      }
      throw error
    }

  } catch (error) {
  
    console.error('Error in chat API:', error)
    return NextResponse.json(
      //@ts-expect-error abc
      { error: 'Failed to process chat message', details: error.message },
      { status: 500 }
    )
  }
}