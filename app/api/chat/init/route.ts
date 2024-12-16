import { NextRequest, NextResponse } from "next/server";
import { agent_prompt, system_prompt } from "../prompts";
import dotenv from "dotenv";

dotenv.config();
const key = process.env.WORKERS_AI!;
async function run(model: string, input: any) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/ai/run/${model}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(input),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API error:", errorData);
      throw new Error(`API returned status ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error in run function:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const initialResponse = await run("@cf/meta/llama-3-8b-instruct", {
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: JSON.stringify(data) },
        { role: "assistant", content: agent_prompt },
      ],
    });

    console.log("Initial response:", initialResponse);

    return NextResponse.json({ response: initialResponse.result.response });
  } catch (error) {
    console.error("Error in POST /api/chat/init:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
