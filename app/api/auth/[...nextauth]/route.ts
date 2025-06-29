import { NEXT_AUTH } from "@/lib/auth"
import NextAuth from "next-auth"

// Initialize NextAuth within each handler to ensure proper request context
export async function GET(request: Request) {
  const handler = NextAuth(NEXT_AUTH);
  return handler(request);
}

export async function POST(request: Request) {
  const handler = NextAuth(NEXT_AUTH);
  return handler(request);
}