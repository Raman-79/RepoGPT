 'use client';

 import { useChat } from "@/hooks/useChat";

 export default function Page(){
    const { messages, input, handleInputChange, handleSubmit } = useChat({api:'/api/chat'});
    return (
        <>
          {messages.map(message => (
            <div key={message.id}>
              {message.role === 'user' ? 'User: ' : 'AI: '}
              {message.content}
            </div>
          ))}
    
          <form onSubmit={handleSubmit}>
            <input name="prompt" value={input} onChange={handleInputChange} />
            <button type="submit">Submit</button>
          </form>
        </>
      );

 }