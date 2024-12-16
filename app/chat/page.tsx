'use client';

import React, { useEffect, useState } from 'react';
import { ChatBox } from '../components/Chatbox';
import { Message } from '../interfaces';
import { useSearchParams } from 'next/navigation';
import DOMPurify from 'dompurify';
export default function ChatPage() {
    const searchParams = useSearchParams();
    const owner = searchParams.get('username');
    const repo = searchParams.get('repo');
    const [codeReview, setCodeReview] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);

    // Function to render text with bold formatting, returning HTML string
    const renderFormattedText = (text: string): string => {
        // Replace ** with <strong> tags
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Replace \n with <br> tags
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        // Sanitize the HTML to prevent XSS
        return DOMPurify.sanitize(formattedText);
    };

    const fetchInitialChat = async () => {
        try {
            // Fetch repo info and contents
            const fetchInfoResponse = await fetch(`/api/fetch-info?owner=${owner}&repo=${repo}`);
            const fetchInfoData = await fetchInfoResponse.json();

            // Fetch initial chat response
            const initResponse = await fetch('/api/chat/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data: fetchInfoData }),
            });
            const initResponseData = await initResponse.json();
            const result = initResponseData.response;
            
            // Prepare the code review message
            const initialMessage: Message = {
                id: 1,
                text: result,
                sender: 'bot',
                timestamp: new Date(),
            };

            setCodeReview(initialMessage);
        } catch (error) {
            console.error('Error fetching initial chat:', error);
        }finally{
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!codeReview) {
            fetchInitialChat();
        }
    }, [codeReview]);
    if (loading) {
        return <div>Loading...</div>;
    }

    return <ChatBox initialMessage={codeReview} />;
}
