'use client';
import React, { useState, useEffect, useRef, JSX } from 'react';
import { Send, Github } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchParams } from 'next/navigation';

type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  role: MessageRole;
  content: string;
  timestamp: string;
}

interface ApiResponse {
  message: string;
}

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const codeEmbedding = async (): Promise<ApiResponse | null> => {
    try {
      const response = await fetch('/api/embeddings/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, owner, branch }),
      });
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // TODO : Remove codeEmbedding api all from here cause it generates the embeddings again on page reload
        await codeEmbedding();
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [repo, owner, branch]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add an empty assistant message that will be updated with the stream
    const assistantMessage: Message = {
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

      if (!response.ok) throw new Error('Failed to fetch response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      // Handle the streaming response
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and append it to the assistant's message
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
      console.error('Error:', error);
      setError('Sorry, there was an error processing your request.');
    } finally {
      setIsStreaming(false);
    }
  };

  // Auto-scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const getMessageStyles = (role: MessageRole): string => {
    switch (role) {
      case 'user':
        return 'bg-blue-600 text-white';
      case 'system':
        return 'bg-red-50 text-red-900 border border-red-100';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const renderExamplePrompt = (text: string): JSX.Element => (
    <p className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer" onClick={() => setInput(text)}>
      {text}
    </p>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <Card className="w-full max-w-3xl h-[700px] flex flex-col bg-white shadow-xl rounded-xl">
        <div className="bg-gray-900 text-white p-6 rounded-t-xl flex justify-center items-center space-x-3">
          <Github className="w-6 h-6" />
          <h1 className="text-lg font-semibold">Code Chat</h1>
        </div>

        <div className="bg-gray-50 p-4 border-b">
          <p className="text-sm text-gray-600">
            Ask questions about your repository&apos;s code, documentation, or architecture.
          </p>
        </div>

        <ScrollArea ref={scrollAreaRef} className="flex-grow p-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-sm">No messages yet. Start by asking a question about your repository!</p>
              <div className="mt-4 text-xs space-y-2">
                {renderExamplePrompt("What's the main functionality of this codebase?")}
                {renderExamplePrompt('Can you explain the project structure?')}
                {renderExamplePrompt('What are the key dependencies used?')}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
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
                <div className="bg-gray-100 rounded-xl p-4">
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

        <CardContent className="border-t p-6 bg-white">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder="Ask about your repository..."
                className="flex-grow p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                disabled={isStreaming}
                aria-label="Repository question input"
                aria-disabled={isStreaming}
              />
              <Button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="px-6 rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;