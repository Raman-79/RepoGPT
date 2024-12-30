
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/db';
import dotenv from 'dotenv';
dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.ACCOUNT_ID!;
const CLOUDFLARE_API_TOKEN = process.env.WORKERS_AI!;

interface ContentResponse {
    sha: string;
    content: string;
    encoding: string;
}

interface EmbeddingData {
    fileName: string;
    rawContent: string;
    summary: string;
    type: "SUMMARY" | "FULL";
    url: string;
    embedding: number[];
}

// Database operations
async function storeEmbeddingsWithTransaction(summaryData: EmbeddingData, codeData: EmbeddingData) {
    await db.$transaction(async (tx) => {
        // Store summary embeddings
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
        maxWait: 20000, // default: 2000
        timeout: 30000, // default: 5000
    });
}
// Existing utility functions
async function fetchContents(url: string): Promise<ContentResponse> {
    try {
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const contentRes: ContentResponse = await res.json();
        return contentRes;
    }
    catch (e) {
        console.log(e);
        throw e;
    }
}

async function getSummary(text: string): Promise<string> {
    try {
        const data = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-2-7b-chat-int8`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: 'You are an AI assistant that specializes in generating concise summaries. Analyze the provided text and create a clear, informative summary that captures the key points while maintaining context and relevance.' },
                    { role: "user", content: JSON.stringify(text) }
                ],
            }),
        });
        const response = await data.json();
       
        return response.result.response.toString();
    }
    catch (error) {
        console.error("Error generating summary:", error);
        throw error;
    }
}

export async function getEmbeddings(text: string): Promise<number[]> {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embeddings = await model.embedContent(text);
        return embeddings.embedding.values;
    }
    catch (e) {
        console.log(e);
        throw e;
    }
}


export async function POST(req: NextRequest) {
    try {
        const { fileName, url } = await req.json();
        if (!url) {
            return NextResponse.json({ success: false, error: "No text provided" });
        }

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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error storing embeddings:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to store embeddings'
        }, { status: 500 });
    }
}