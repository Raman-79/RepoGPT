
import GithubProvider from 'next-auth/providers/github';
import { NextAuthOptions, SessionStrategy } from 'next-auth';


export const NEXT_AUTH: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
            authorization:{
              url:"https://github.com/login/oauth/authorize",
              params:{
                scope:'read: user repo'
              },
            },
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET || "secr3t",
    session: {
       strategy: "jwt" as SessionStrategy,
       maxAge:30*24*60*60, //30 days
       updateAge: 24* 60 *60 //24 hrs
     },
    callbacks:{
      async jwt({token,account}) {
        if(account){
          //console.log(account)
          token.accessToken = account.access_token;
        }
        return token;
      },
      async session({session,token}){
        if(token){
          //@ts-expect-error abc
          session.accessToken = token.accessToken
        }
        return session;
      },
    },
}