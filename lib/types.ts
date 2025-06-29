export interface Repository {
  id: number;
  name: string;
  html_url: string;
  private: boolean;
  language: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  owner: {
    login: string;
  };
  description: string;
  default_branch: string;
}

export interface TypewriterProps {
  text: string;
  delay: number;
}

export interface GithubResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  encoding: string | null;
  content: string | null;
  type: 'file' | 'dir';
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface FilesAndContent {
  name: string;
  content: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface EmbeddingData {
  fileName: string;
  rawContent: string;
  summary: string;
  type: "SUMMARY" | "FULL";
  url: string;
  embedding: number[];
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}