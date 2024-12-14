export interface Repository {
    id: number;
    name: string;
    html_url: string;
    owner:{
      login:string
    }
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
    encoding:string | null;
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
    id: number;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}