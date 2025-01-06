import { useState } from "react";

type MessageRole = "user" | "assistant" | "system";

interface Message {
  id: number;
  role: MessageRole;
  content: string;
  timestamp: string;
}

interface UseChat {
  messages: Message[];
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => Promise<void>;
}

export function useChat({
  api,
  initialMessages,
}: {
  api?: string;
  initialMessages?: Message[];
}): UseChat {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages ? initialMessages : []
  );
  const [input, setInput] = useState("");

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInput(event.target.value);
  }

  async function handleSubmit() {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInput("");

    try {
      const res = await fetch(`${api}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [...messages, newMessage] }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const data = await res.json();

      // Add the assistant's response to messages
      setMessages((prevMessages) => [
        ...prevMessages,
        ...data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date().toISOString(),
        })),
      ]);
    } catch (error) {
      console.error("Error submitting chat:", error);
    }
  }

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
  };
}
