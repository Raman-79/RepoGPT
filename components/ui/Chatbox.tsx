'use client'
import React, { useEffect, useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { Message } from '../interfaces';

interface ChatBoxProps {
    initialMessage: Message | null;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ initialMessage }) => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<Message[]>(
        initialMessage ? [initialMessage] : []
    );

    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (prompt.trim() === '') return;

        const userMessage: Message = {
            id: messages.length + 1,
            text: prompt,
            sender: 'user',
            timestamp: new Date(),
        };

        // Clear input and add user message
        setPrompt('');
        setMessages((prevMessages) => [...prevMessages, userMessage]);

        try {
            // Actual API call for bot response
            const response = await fetch('/api/chat/continue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    messages: [...messages, userMessage],
                    prompt: prompt 
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();

            const botMessage: Message = {
                id: Date.now(),
                text: data.response,
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages((prevMessages) => [...prevMessages, botMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            
            const errorMessage: Message = {
                id: Date.now(),
                text: 'Sorry, something went wrong. Please try again.',
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // Function to render message text with formatting
    const renderMessageText = (text: string) => {
        // Replace ** with bold tags
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Replace \n with <br> tags
        formattedText = formattedText.replace(/\n/g, '<br>');
        return formattedText;
    };

    return (
        <div className="flex flex-col min-h-screen w-full max-w-4xl mx-auto">
            {/* Chat Messages Area */}
            <div className="flex-grow px-4 md:px-24 py-8 space-y-6 overflow-y-auto">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${
                            msg.sender === 'bot' ? 'justify-start' : 'justify-end'
                        }`}
                    >
                        <div
                            className={`w-full max-w-2xl ${
                                msg.sender === 'bot'
                                    ? 'bg-gray-100 text-black'
                                    : 'bg-blue-500 text-white'
                            } p-4 rounded-xl`}
                        >
                            <div 
                                dangerouslySetInnerHTML={{ 
                                    __html: renderMessageText(msg.text) 
                                }} 
                            />
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="sticky bottom-0 bg-white shadow-lg">
                <div className="max-w-4xl mx-auto px-4 md:px-24 py-6">
                    <div className="flex items-center bg-gray-100 rounded-xl p-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Message RepoGenie"
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
    );
};