'use client';
import React, { useState, useEffect, useRef, JSX, Suspense } from 'react';
import { Send, Github, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchParams } from 'next/navigation';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Loading } from '@/components/ui/loading';
import type { Message, ApiResponse } from '@/lib/types';

const ChatInterface: React.FC = () => {
  const searchParams = useSearchParams();
  const repo = searchParams.get('repo');
  const owner = searchParams.get('owner');
  const branch = searchParams.get('branch');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [embeddingStatus, setEmbeddingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const processEmbeddings = async (): Promise<ApiResponse | null> => {
    try {
      setEmbeddingStatus('loading');
      const response = await fetch('/api/embeddings/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, owner, branch }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Error: ${response.statusText}`);
      }
      
      setEmbeddingStatus('success');
      return data;
    } catch (error) {
      console.error('Embedding processing error:', error);
      setEmbeddingStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to process repository');
      return null;
    }
  };

  useEffect(() => {
    if (repo && owner && branch && embeddingStatus === 'idle') {
      processEmbeddings();
    }
  }, [repo, owner, branch, embeddingStatus]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    setInput('');
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_prompt: input }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);

        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content += chunk;
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setError(error instanceof Error ? error.message : 'Sorry, there was an error processing your request.');
      
      // Remove the empty assistant message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const getMessageStyles = (role: Message['role']): string => {
    switch (role) {
      case 'user':
        return 'bg-blue-600 text-white';
      case 'system':
        return 'bg-red-50 text-red-900 border border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const renderExamplePrompt = (text: string): JSX.Element => (
    <p 
      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer transition-colors" 
      onClick={() => setInput(text)}
    >
      {text}
    </p>
  );

  if (!repo || !owner || !branch) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Missing Repository Information</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please select a repository from the main page to start chatting.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex flex-col items-center">
      <Card className="w-full max-w-4xl h-[700px] flex flex-col bg-white dark:bg-gray-800 shadow-xl rounded-xl">
        <div className="bg-gray-900 dark:bg-gray-950 text-white p-6 rounded-t-xl flex justify-center items-center space-x-3">
          <Github className="w-6 h-6" />
          <h1 className="text-lg font-semibold">
            {owner}/{repo} - {branch}
          </h1>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ask questions about your repository&apos;s code, documentation, or architecture.
            </p>
            <div className="flex items-center space-x-2">
              {embeddingStatus === 'loading' && (
                <div className="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Processing repository...</span>
                </div>
              )}
              {embeddingStatus === 'success' && (
                <div className="flex items-center space-x-2 text-xs text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span>Repository ready</span>
                </div>
              )}
              {embeddingStatus === 'error' && (
                <div className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <span>Processing failed</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <ScrollArea ref={scrollAreaRef} className="flex-grow p-6">
          {embeddingStatus === 'loading' && messages.length === 0 && (
            <Loading message="Processing repository files..." />
          )}
          
          {messages.length === 0 && embeddingStatus !== 'loading' && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <p className="text-sm">No messages yet. Start by asking a question about your repository!</p>
              <div className="mt-4 text-xs space-y-2">
                {renderExamplePrompt("What's the main functionality of this codebase?")}
                {renderExamplePrompt('Can you explain the project structure?')}
                {renderExamplePrompt('What are the key dependencies used?')}
                {renderExamplePrompt('Are there any potential security issues?')}
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-4 ${getMessageStyles(message.role)}`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <time className="text-xs opacity-70 mt-1 block">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </time>
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <CardContent className="border-t dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder={embeddingStatus === 'loading' ? 'Processing repository...' : 'Ask about your repository...'}
                className="flex-grow p-3 border dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                disabled={isStreaming || embeddingStatus === 'loading'}
                aria-label="Repository question input"
              />
              <Button
                type="submit"
                disabled={isStreaming || !input.trim() || embeddingStatus === 'loading'}
                className="px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm mt-2 text-center">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function ChatPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading fullScreen message="Loading chat interface..." />}>
        <ChatInterface />
      </Suspense>
    </ErrorBoundary>
  );
}

export default ChatPage;