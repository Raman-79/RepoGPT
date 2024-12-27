import React from 'react'
import DOMPurify from 'dompurify';
import {Bot, User} from 'lucide-react';
function Messagearea() {
     const [messages, setMessages] = useState<Message[]>([]);
    const renderMessageText = (text: string) => {
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\n/g, '<br>');
        return DOMPurify.sanitize(formattedText);
    };
  return (
    <div className="flex-grow overflow-y-auto px-4 lg:px-8 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${
                                msg.sender === 'bot' ? 'justify-start' : 'justify-end'
                            }`}
                        >
                            <div className={`flex max-w-[85%] items-start space-x-3 ${
                                msg.sender === 'user' && 'flex-row-reverse space-x-reverse'
                            }`}>
                                {/* Avatar */}
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center
                                    ${msg.sender === 'bot' ? 'bg-blue-600' : 'bg-[#238636]'}
                                `}>
                                    {msg.sender === 'bot' ? (
                                        <Bot size={16} className="text-white" />
                                    ) : (
                                        <User size={16} className="text-white" />
                                    )}
                                </div>
                                
                                {/* Message Content */}
                                <div className={`
                                    px-4 py-3 rounded-lg
                                    ${msg.sender === 'bot' 
                                        ? 'bg-[#1c2128] text-gray-100 border border-[#363b42]' 
                                        : 'bg-[#238636] text-white'}
                                `}>
                                    <div 
                                        className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                                        dangerouslySetInnerHTML={{ 
                                            __html: renderMessageText(msg.text) 
                                        }} 
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
            </div>
  )
}

export default Messagearea