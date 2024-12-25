import { NextResponse } from 'next/server'
import { agent_prompt, system_prompt } from '../../prompts/review-prompt'

export async function POST(request: Request) {
  const { message} = await request.json()

  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-2-7b-chat-int8`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
         { role: "system", content: system_prompt },
         { role: "user", content: JSON.stringify(message) },
         { role: "assistant", content: agent_prompt },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to get response from Cloudflare Workers AI')
    }

    const data = await response.json()
    return NextResponse.json({ message: data.result.response })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 })
  }
}

