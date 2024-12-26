import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/db';
import dotenv from 'dotenv';
import { system_prompt } from "../prompts/review-prompt";

dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;

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
    embeddings: number[];
}

// Database operations
async function storeEmbeddingsWithTransaction(summaryData: EmbeddingData, codeData: EmbeddingData) {
    return await db.$transaction(async (tx) => {
        // Store summary embeddings
        const summaryRecord = await tx.embedding.create({
            data: {
                fileName: summaryData.fileName,
                rawContent: summaryData.rawContent,
                summary: summaryData.summary,
                type: summaryData.type,
                url: summaryData.url,
                updatedAt: new Date(),
            },
        });

        await tx.$executeRaw`
            UPDATE embeddings 
            SET 
                embeddings = ${summaryData.embeddings}::vector,
                updatedAt = CURRENT_TIMESTAMP
            WHERE id = ${summaryRecord.id}
        `;

        // Store code embeddings
        const codeRecord = await tx.embedding.create({
            data: {
                fileName: codeData.fileName,
                rawContent: codeData.rawContent,
                summary: codeData.summary,
                type: codeData.type,
                url: codeData.url,
                updatedAt: new Date(),
            },
        });

        await tx.$executeRaw`
            UPDATE embeddings 
            SET 
                embeddings = ${codeData.embeddings}::vector,
                updatedAt = CURRENT_TIMESTAMP
            WHERE id = ${codeRecord.id}
        `;

        return {
            summaryId: summaryRecord.id,
            codeId: codeRecord.id,
        };
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
                    { role: "system", content: system_prompt },
                    { role: "user", content: JSON.stringify(text) }
                ],
            }),
        });
        const res = await data.json();
        return res.result;
    }
    catch (error) {
        console.error("Error generating summary:", error);
        throw error;
    }
}

async function getSummaryEmbeddings(text: string): Promise<number[]> {
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

async function getCompleteCodeEmbeddings(code: string): Promise<number[]> {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "code-embedding-004" });
        const embeddings = await model.embedContent(code);
        return embeddings.embedding.values;
    } catch (error) {
        console.error("Error generating code embeddings:", error);
        throw error;
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
        const summaryEmbeddings = await getSummaryEmbeddings(summary);
        const codeEmbeddings = await getCompleteCodeEmbeddings(decodedText);

        // Prepare data for storage
        const summaryData: EmbeddingData = {
            fileName,
            rawContent: decodedText,
            summary,
            type: "SUMMARY",
            url,
            embeddings: summaryEmbeddings,
        };

        const codeData: EmbeddingData = {
            fileName,
            rawContent: decodedText,
            summary,
            type: "FULL",
            url,
            embeddings: codeEmbeddings,
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