export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatRequest {
    messages: Message[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
}

export interface ChatResponse {
    result: {
        response: string;
    };
    success: boolean;
}

export interface CloudflareConfig {
    apiKey: string;
    accountId: string;
    model?: string;
    timeout?: number;
}