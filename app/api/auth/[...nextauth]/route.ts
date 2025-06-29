import { NEXT_AUTH } from "@/lib/auth"
import NextAuth from "next-auth"

const GET = async (req: Request) => {
  const handler = NextAuth(NEXT_AUTH);
  return handler(req);
}

const POST = async (req: Request) => {
  const handler = NextAuth(NEXT_AUTH);
  return handler(req);
}

export { GET, POST }