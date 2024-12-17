import { NextRequest, NextResponse } from 'next/server';
import {run }from '@/app/api/chat/init/route'

export async function POST(req:NextRequest) {
    const body = await req.json();
    const {action , files} = body;
    if(!action || !files){
        return NextResponse.json({message:'ERROR NO ACTION OR BODY DEFINED'},{status:404});
    }

    //Call the LLM fetch the relavent files for the response
    const initialResponse = await run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: system_prompt_action },
            { role: "user", content: JSON.stringify(data) },
            { role: "assistant", content: agent_prompt_action  },
          ],
        });
    
    console.log("Initial response:", initialResponse);
}

export async function GET(req:NextRequest){


    //Given a particular {ACTION}  and [relavent_files] return the LLM response

    return NextResponse.json({});
}