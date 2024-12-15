import { agent_prompt, system_prompt } from "./prompts";
export async function run(model: string, input: any) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/bc24d447d907f1eeea1c5f64af42f380/ai/run/${model}`,
      {
        headers: { Authorization: `Bearer ${process.env.WORKER_AI}` },
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    const result = await response.json();
    return result;
  }
  
  run("@cf/meta/llama-3-8b-instruct", {
    messages: [
      {
        role: "system",
        content: system_prompt,
      },
      {
        role:"user",
        content:""
      },
      {
        role:"assistant",
        content:agent_prompt
      }
    ],
  }).then((response) => {
    //console.log(JSON.stringify(response));
    return response.data;
  });
  