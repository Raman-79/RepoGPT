import { NEXT_AUTH } from "@/app/utils/auth";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { GithubResponse, FilesAndContent} from "@/app/interfaces";

async function fetchFileContent(file: GithubResponse, token: string): Promise<FilesAndContent | null> {
    // If it's not a file or doesn't have a download URL, return null
    if (file.type !== 'file' || !file.url) return null;

    try {
        const res = await fetch(file.url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!res.ok) {
            console.error(`Failed to fetch content for ${file.name}`);
            return null;
        }

        const fileData: GithubResponse = await res.json();
        
        // Decode base64 content
        if (fileData.content && fileData.encoding === 'base64') {
            const content = Buffer.from(fileData.content.replace(/\s/g, ''), 'base64').toString('utf-8');
            return { 
                name: file.name, 
                content: content 
            };
        }

        return null;
    } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        return null;
    }
}

async function recursiveFileCall(path: GithubResponse, owner: string, repo: string, token: string): Promise<FilesAndContent[]> {
    // If it's a directory, fetch its contents
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path.path}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!res.ok) {
            console.error(`Failed to fetch contents for ${path.path}`);
            return [];
        }

        const data: GithubResponse[] = await res.json();
        
        // Recursively process each item 
        const files: FilesAndContent[] = [];
        for (const item of data) {
            if (item.type === 'file') {
                const fileContent = await fetchFileContent(item, token);
                if (fileContent) {
                    files.push(fileContent);
                }
            } else if (item.type === 'dir') {
                const dirFiles = await recursiveFileCall(item, owner, repo, token);
                files.push(...dirFiles);
            }
        }

        return files;
    } catch (error) {
        console.error(`Error processing ${path.path}:`, error);
        return [];
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(NEXT_AUTH);
    //@ts-expect-error abc
    const token  = session.accessToken;

    try {
        const searchParams = req.nextUrl.searchParams;
        const owner = searchParams.get('owner');
        const repo = searchParams.get('repo');

        if (!owner || !repo) {
            return Response.json({ 
                error: "Owner and repository name are required" 
            }, { status: 400 });
        }

        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!res.ok) {
            return Response.json({ 
                error: "Failed to fetch repository contents" 
            }, { status: res.status });
        }

        const initial_files: GithubResponse[] = await res.json();
        
        // Collect files through recursive traversal
        const files: FilesAndContent[] = [];
        for (const file of initial_files) {
            if (file.type === 'file') {
                const fileContent = await fetchFileContent(file, token);
                if (fileContent) {
                    files.push(fileContent);
                }
            } else if (file.type === 'dir') {
                const dirFiles = await recursiveFileCall(file, owner, repo, token);
                files.push(...dirFiles);
            }
        }
        
        return Response.json({ files });
    } catch (error) {
        console.error("Unexpected error:", error);
        return Response.json({ 
            error: "An unexpected error occurred" 
        }, { status: 500 });
    }
}