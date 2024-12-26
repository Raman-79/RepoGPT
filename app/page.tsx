'use client';
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Typewriter from "@/components/ui/Typewriter";
import { Repository } from "./interfaces";
import { redirect, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
    const router = useRouter();

    // const handleRedirect = (owner: string, repo: string) => {
    //   router.push(`/chat?username=${owner}&repo=${repo}`);
    // };

  const fetchRepos = async () => {
    //@ts-expect-error abc
    if (session?.accessToken) {
      setLoading(true);
      try {
        const response = await fetch("https://api.github.com/user/repos", {
          headers: {
            //@ts-expect-error abc
            Authorization: `Bearer ${session.accessToken}`,
            "Accept": "application/vnd.github.v3+json",
          },
        });
        const data: Repository[] = await response.json();
        setRepos(data);
      } catch (error) {
        console.error("Error fetching repos:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted">
        <h1 className="text-3xl font-bold mb-4">Not signed in</h1>
        <Button variant="outline" onClick={() => signIn("github")}>
          Sign in with GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Welcome, <span className="text-primary">{session.user?.name}</span>
        </h1>
        <Button variant="destructive" onClick={() => signOut()}>
          Sign out
        </Button>
      </header>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Repositories</h2>
        <Typewriter text="Which among these repos do you want me to help with?" delay={50} />
      </div>

      {loading ? (
        <div className="flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : repos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo) => (
            <Card key={repo.id} onClick={()=> redirect('/chat')} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-primary">{repo.name}</CardTitle>
              </CardHeader>
              <CardContent >
                <p className="text-sm text-muted-foreground ">
                  {repo.description ?? "No description"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground italic">No repositories found.</p>
      )}
    </div>
  );
}
