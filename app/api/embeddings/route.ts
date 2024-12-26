import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
 import {db} from '@/lib/db';
import dotenv from 'dotenv';
import {  system_prompt } from "../prompts/review-prompt";

dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;

interface ContentResponse{
    sha:string;
    content:string;
    encoding:string
}


async function fetchContents(url:string):Promise<ContentResponse>{
    try{
        const res = await fetch(url,{
            headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const contentRes:ContentResponse = await res.json();
        return contentRes;
    }
    catch(e){
        console.log(e);
        throw e;
    }   
   
}


async function getSummary(text:string):Promise<string>{
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

async function getSummaryEmbeddings(text:string):Promise<number[]>{
    try{
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "text-embedding-004"});
        const embeddings = await model.embedContent(text);
       return embeddings.embedding.values;
    }
    catch(e){
        console.log(e);
        throw e;
    }
}
export async function POST(req:NextRequest) {
    try {
        const { fileName,url } = await req.json();
        if (!url) {
            return NextResponse.json({ success: false, error: "No text provided" }); 
        }

        // Extract filename and path


        const content = await fetchContents(url);
        const decodedText = Buffer.from(content.content, 'base64').toString('utf-8');
        
        const summary = await getSummary(decodedText);
        const summaryEmbeddings = await getSummaryEmbeddings(summary);

       const embedding =  await db.embedding.create({
            data:{
                fileName,
                rawContent:decodedText,
                summary:summary,
                type:"SUMMARY",
                url,
                updatedAt:new Date()
            }
        })
        // Raw SQL insert using Prisma
        await db.$executeRaw`
            UPDATE embeddings (
                embeddings,
               updatedAt
            ) 
            VALUES (
                ${summaryEmbeddings}::vector,
                CURRENT_TIMESTAMP
            )
            WHERE id = ${embedding.id}
        `;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error storing embeddings:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to store embeddings' 
        }, { status: 500 });
    }
}