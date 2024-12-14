'use client';
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Typewriter from "./components/Typewriter";
import { Repository } from "./interfaces";
import { useRouter } from 'next/navigation'

export default function Home() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<Repository[]>([]);

  const router = useRouter();

  const handleRedirect = (owner:string,repo:string) => {
    router.push(`/chat?username=${owner}&repo=${repo}`);
  };

  
  useEffect(() => {
    //@ts-expect-error abc
    if (session?.accessToken) {
      fetch("https://api.github.com/user/repos", {
        headers: {
          //@ts-expect-error abc
          Authorization: `Bearer ${session.accessToken}`,
          "Accept": "application/vnd.github.v3+json"
        },
      })
      .then((response) => response.json())
      .then((data: Repository[]) => {
        setRepos(data);
      })
      .catch((error) => console.error('Error fetching repos:', error));
    }
  }, [session]);


  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Not signed in</h1>
        <button 
          onClick={() => signIn('github')} 
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 font-sans text-gray-800">
      <h1 className="text-2xl font-bold mb-4">Signed in as <span className="text-blue-500">{session.user?.name}</span></h1>
      <button 
        onClick={() => signOut()} 
        className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded mb-6"
      >
        Sign out
      </button>

      <h2 className="text-xl font-semibold mb-4">Your Repositories</h2>
      <h2 className="text-xl font-semibold mb-4"> <Typewriter text="Which among these repo do you want me to help with?" delay={50}/> </h2>
      {repos.length > 0 ? (
        <ul className="space-y-4">
          {repos.map((repo) => (
            <li 
              key={repo.id} 
              className="bg-white p-4 rounded shadow-md hover:shadow-lg transition-shadow"
              onClick={()=> {handleRedirect(repo.owner.login,repo.name)}}
            >
              <a 
                href={repo.html_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 font-bold hover:underline"
              >
                {repo.name}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 italic">Loading repositories...</p>
      )}
    </div>
  );
} 
