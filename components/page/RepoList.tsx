'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useSession } from 'next-auth/react';
import { GitFork, Star, Eye, Lock, Globe } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Loading } from '@/components/ui/loading';
import type { Repository } from '@/lib/types';

const RepoList: React.FC = () => {
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRepos = async () => {
      if (session?.accessToken) {
        try {
          setLoading(true);
          setError(null);
          
          const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });

          if (!res.ok) {
            throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
          }

          const data = await res.json();
          setRepos(data);
        } catch (error) {
          console.error('Error fetching repositories:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch repositories');
        } finally {
          setLoading(false);
        }
      } else if (status !== 'loading') {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [session, status]);

  const handleRedirect = (repoName: string, owner: string, defaultBranch: string) => {
    router.push(`/chat?repo=${encodeURIComponent(repoName)}&owner=${encodeURIComponent(owner)}&branch=${encodeURIComponent(defaultBranch)}`);
  };

  if (status === 'loading' || loading) {
    return <Loading fullScreen message="Loading repositories..." />;
  }

  if (!session) {
    return (
      <main className="p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to DevSpace
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in with GitHub to view and analyze your repositories
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Error Loading Repositories
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 min-h-screen">
      {repos.length > 0 ? (
        <>
          <div className="max-w-7xl mx-auto mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Your Repositories
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Select a repository to start analyzing and chatting about your code
            </p>
          </div>
          
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {repos.map((repo) => (
              <Card
                key={repo.id}
                className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                onClick={() => handleRedirect(repo.name, repo.owner.login, repo.default_branch)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      {repo.private ? (
                        <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      ) : (
                        <Globe className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      <span className="text-lg font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors truncate">
                        {repo.name}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-4 pt-0 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 min-h-[40px]">
                    {repo.description || 'No description available'}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          {repo.language}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
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
                  </div>
                  
                  <div className="pt-2 border-t dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Default branch: <span className="font-mono">{repo.default_branch}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No repositories found
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Repositories you create or have access to will appear here
          </p>
        </div>
      )}
    </main>
  );
};

export default function RepoListWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <RepoList />
    </ErrorBoundary>
  );
}