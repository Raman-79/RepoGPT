import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/db';
import { handleApiError, ExternalServiceError, ValidationError } from '@/lib/errors';
import { validateInput, embeddingSchema } from '@/lib/validation';
import type { EmbeddingData } from '@/lib/types';

const CLOUDFLARE_ACCOUNT_ID = process.env.ACCOUNT_ID!;
const CLOUDFLARE_API_TOKEN = process.env.WORKERS_AI!;

interface ContentResponse {
  sha: string;
  content: string;
  encoding: string;
}

async function storeEmbeddingsWithTransaction(summaryData: EmbeddingData, codeData: EmbeddingData) {
  return await db.$transaction(async (tx) => {
    const summaryInsertResult = await tx.embedding.create({
      data: {
        fileName: summaryData.fileName,
        rawContent: summaryData.rawContent,
        summary: summaryData.summary,
        type: summaryData.type,
        url: summaryData.url,
      }
    });

    await tx.$executeRaw`
      UPDATE "embedding"
      SET embedding = ${summaryData.embedding}::vector
      WHERE id = ${summaryInsertResult.id};
    `;

    const codeInsertResult = await tx.embedding.create({
      data: {
        fileName: codeData.fileName,
        rawContent: codeData.rawContent,
        summary: codeData.summary,
        type: codeData.type,
        url: codeData.url,
      }
    });

    await tx.$executeRaw`
      UPDATE "embedding"
      SET embedding = ${codeData.embedding}::vector
      WHERE id = ${codeInsertResult.id};
    `;

    return {
      summaryId: summaryInsertResult.id,
      codeId: codeInsertResult.id
    };
  }, {
    maxWait: 20000,
    timeout: 30000,
  });
}

async function fetchContents(url: string): Promise<ContentResponse> {
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!res.ok) {
      throw new ExternalServiceError('GitHub', `Failed to fetch file content: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    if (error instanceof ExternalServiceError) throw error;
    throw new ExternalServiceError('GitHub', 'Failed to fetch file content');
  }
}

async function getSummary(text: string): Promise<string> {
  try {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new ValidationError('Missing Cloudflare credentials');
    }

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
            { 
              role: "system", 
              content: 'You are an AI assistant that specializes in generating concise summaries. Analyze the provided text and create a clear, informative summary that captures the key points while maintaining context and relevance.' 
            },
            { role: "user", content: text }
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new ExternalServiceError('Cloudflare AI', `Summary generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.response?.toString() || 'Summary generation failed';
  } catch (error) {
    if (error instanceof ExternalServiceError || error instanceof ValidationError) throw error;
    throw new ExternalServiceError('Cloudflare AI', 'Summary generation failed');
  }
}

export async function getEmbeddings(text: string): Promise<number[]> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ValidationError('Missing GEMINI_API_KEY environment variable');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ExternalServiceError('Google AI', 'Embedding generation failed');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, url } = validateInput(embeddingSchema, body);

    // Fetch and process content
    const content = await fetchContents(url);
    const decodedText = Buffer.from(content.content, 'base64').toString('utf-8');

    // Generate summary and embeddings
    const summary = await getSummary(decodedText);
    const summaryEmbeddings = await getEmbeddings(summary);
    const codeEmbeddings = await getEmbeddings(decodedText);

    // Prepare data for storage
    const summaryData: EmbeddingData = {
      fileName,
      rawContent: decodedText,
      summary,
      type: "SUMMARY",
      url,
      embedding: summaryEmbeddings,
    };

    const codeData: EmbeddingData = {
      fileName,
      rawContent: decodedText,
      summary,
      type: "FULL",
      url,
      embedding: codeEmbeddings,
    };

    // Store both embeddings in a single transaction
    await storeEmbeddingsWithTransaction(summaryData, codeData);

    return NextResponse.json({ 
      success: true,
      message: 'Embeddings stored successfully'
    });
  } catch (error) {
    console.error('Error storing embeddings:', error);
    const { message, statusCode } = handleApiError(error);
    return NextResponse.json({
      success: false,
      error: message
    }, { status: statusCode });
  }
}