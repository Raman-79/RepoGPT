'use client';
import React, { useState,   JSX, useEffect } from 'react';
import { Send, Github } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useParams } from 'next/navigation';

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
  const { repo, owner } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>();

  const codeEmbedding = async (): Promise<ApiResponse | null> => {
    try {
      const response = await fetch('/api/embedding/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, owner }), 
      });
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  };


  useEffect(()=>{
    const loadData = async () => {
        try {
          setIsLoading(true);
          const data = await codeEmbedding();
          if (data) {
            console.log(data);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    loadData();
  },[repo,owner]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/fetch-info/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });

      if (!response.ok) throw new Error('Failed to fetch response');

      const data: ApiResponse = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'system',
        content: 'Sorry, there was an error processing your request.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const renderExamplePrompt = (text: string): JSX.Element => <p className="text-xs">{text}</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <Card className="w-full max-w-3xl h-[700px] flex flex-col bg-white shadow-xl rounded-xl">
        <div className="bg-gray-900 text-white p-6 rounded-t-xl flex justify-center items-center space-x-3">
          <Github className="w-6 h-6" />
        </div>

        <div className="bg-gray-50 p-4 border-b">
          <p className="text-sm text-gray-600">
            Ask questions about your repository&apos;s code, documentation, or architecture.
          </p>
        </div>

        <ScrollArea className="flex-grow p-6">
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
                  <p className="text-sm">{message.content}</p>
                  <time className="text-xs opacity-70 mt-1 block">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </time>
                </div>
              </div>
            ))}
            {isLoading && (
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
  disabled={isLoading}
  aria-label="Repository question input"
  aria-disabled={isLoading}
/>
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;
