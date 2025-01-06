import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ChatRequest, ChatResponse, CloudflareConfig } from './types';
import {Message} from './config'
export class CloudflareAI {
    private client: AiClient;
    
    constructor(config: CloudflareConfig) {
        this.client = new AiClient(config);
    }

    async chat(messages: Message[], stream = false): Promise<ChatResponse | ReadableStream> {
        const request: ChatRequest = {
            messages,
            stream
        };
        
        if (stream) {
            return this.client.stream('/chat/completions', request);
        }
        
        return this.client.request<ChatResponse>({
            method: 'POST',
            data: request
        });
    }
}

class AiClient {
    private axiosInstance: AxiosInstance;
    private config: CloudflareConfig;

    constructor(config: CloudflareConfig) {
        this.config = config;
        const baseURL = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/@cf/meta/${config.model || 'llama-2-7b-chat-int8'}`;
        
        this.axiosInstance = axios.create({
            baseURL,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: config.timeout || 30000
        });
    }

    async request<T>(config: AxiosRequestConfig): Promise<T> {
        try {
            const response = await this.axiosInstance(config);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`API request failed: ${error.message}`);
            }
            throw error;
        }
    }

    async stream(path: string, data: any): Promise<ReadableStream> {
        const response = await fetch(`${this.axiosInstance.defaults.baseURL}${path}`, {
            method: 'POST',
            headers: this.axiosInstance.defaults.headers as HeadersInit,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Stream request failed: ${response.statusText}`);
        }

        return response.body!;
    }
}

export const createClient = (config: CloudflareConfig): CloudflareAI => {
    return new CloudflareAI(config);
};