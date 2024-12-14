import { GoogleGenerativeAI } from "@google/generative-ai";
import { system_prompt } from "./prompts";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function init(user_files:string){
  const prompt = system_prompt;
  const result = await model.generateContent(prompt+user_files);
  console.log(result.response.text());
}