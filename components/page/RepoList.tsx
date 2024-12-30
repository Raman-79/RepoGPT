'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useSession } from 'next-auth/react';
import { Repository } from '@/app/interfaces';
import { GitFork, Star, Eye } from 'lucide-react';

const RepoList: React.FC = () => {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const fetchRepos = async () => {
        //@ts-expect-error abc
      if (session?.accessToken) {
        try {
          const res = await fetch('https://api.github.com/user/repos', {
            headers: {
                //@ts-expect-error abc
              Authorization: `Bearer ${session.accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });
          const data = await res.json();
          setRepos(data);
        } catch (error) {
          console.error('Error fetching repositories:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchRepos();
  }, [session]);

  const handleRedirect = (repoName: string,owner:string,default_branch:string) => {

    router.push(`/chat?repo=${repoName}&owner=${owner}&branch=${default_branch}`);
  };

  if (session && loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <main className="p-8 min-h-screen">
      {session && repos.length > 0 ? (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo, index) => (
            <Card
              key={index}
              className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden"
              onClick={() => handleRedirect(repo.name,repo.owner.login,repo.default_branch)}
            >
              <CardHeader className="p-4 bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-b border-gray-700/50">
                <CardTitle className="flex items-center space-x-2">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-medium text-blue-400 hover:text-blue-300 transition-colors truncate"
                  >
                    {repo.name}
                  </a>
                  {repo.private && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
                      Private
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm text-gray-400 line-clamp-2 min-h-[40px]">
                  {repo.description ?? 'No description available'}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {repo.stargazers_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="w-4 h-4" />
                    {repo.forks_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {repo.watchers_count}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-lg text-gray-400 font-medium">No repositories found</p>
          <p className="text-sm text-gray-500">Repositories you create will appear here</p>
        </div>
      )}
    </main>
  );
};

export default RepoList;