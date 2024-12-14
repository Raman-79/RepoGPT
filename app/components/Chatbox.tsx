'use client'
import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from 'lucide-react';
import { Message } from "../interfaces";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
export const ChatBox: React.FC = () => {
    const searchParams = useSearchParams()
    const session = useSession();
    const owner = searchParams.get('username');
    const repo = searchParams.get('repo');
    const [prompt, setPrompt] = useState<string>("");
    const chatEndRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
      // Input area
      const [messages, setMessages] = useState<Message[]>([
        {
            id:1,
            text:"I went through your repo here is what I think you made..",
            sender:'bot',
            timestamp:new Date()
        }
    ]);
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => {
        fetch(`api/fetch-info?owner=${owner}&repo=${repo}`,{
            headers:{
                //@ts-expect-error abc
                Authorization: `Bearer ${session.data?.user.accessToken}`,
                "Accept": "application/vnd.github.v3+json"
            }
        })
        .then((res)=>{
            const data = res.json();
            //The files json to the LLM 
            fetch('/api/chat/init',{
                method:'POST',
                body:JSON.stringify({res}),
            })
            .then((response)=>{
                console.log(response);
            })
        })
        scrollToBottom();
    }, [messages]);
    
    const handleSend = () => {
        if (prompt.trim() === '') return;

        const userMessage: Message = {
            id: messages.length + 1,
            text: prompt,
            sender: 'user',
            timestamp: new Date()
        };

        // Clear input first
        setPrompt('');

        // Add user message
        setMessages(prevMessages => [...prevMessages, userMessage]);

        // Simulate bot response (replace with actual API call)
        setTimeout(() => {
            const botMessage: Message = {
                id: Date.now(),
                text: `You said: ${prompt}`,
                sender: 'bot',
                timestamp: new Date()
            };
    
            setMessages(prevMessages => [...prevMessages, botMessage]);
        }, 1000);
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    }

    return (
    <div className="flex flex-col min-h-screen w-full max-w-4xl mx-auto">
        {/* Chat Messages Area */}
        <div className="flex-grow px-4 md:px-24 py-8 space-y-6 overflow-y-auto">
            {messages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex ${
                        msg.sender === 'bot' 
                            ? 'justify-start' 
                            : 'justify-end'
                    }`}
                >
                    <div 
                        className={`w-full max-w-2xl ${
                            msg.sender === 'bot' 
                                ? 'bg-gray-100 text-black' 
                                : 'bg-blue-500 text-white'
                        } p-4 rounded-xl`}
                    >
                        {msg.text}
                    </div>
                </div>
            ))}
            <div ref={chatEndRef} />
        </div>

        {/*Input area*/}
        <div className="sticky bottom-0 bg-white shadow-lg">
            <div className="max-w-4xl mx-auto px-4 md:px-24 py-6">
                <div className="flex items-center bg-gray-100 rounded-xl p-2">
                    <input 
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Message Claude"
                        className="flex-grow bg-transparent px-4 py-2 focus:outline-none text-lg"
                    />
                    <button 
                        onClick={handleSend}
                        className="bg-blue-900 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
                        aria-label="Send message"
                    >
                        <SendHorizonal size={24} />
                    </button>
                </div>
            </div>
        </div>
    </div>
    )
}