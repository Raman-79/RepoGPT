import { FilesAndContent, GithubResponse } from "@/app/interfaces";
import { NEXT_AUTH } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Stack } from "@/app/interfaces/stack";

async function fetchFileContent(file: GithubResponse, token: string, stk: Stack<string>): Promise<FilesAndContent | null> {
    if (file.type !== 'file' || !file.url) return null;

    try {
        const res = await fetch(file.url, {
            headers: {
                'Authorization': `token ${token}`,
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
                // Use the stack to create the full path
                name: `${stk.getCurrentPath()}/${file.name}`, 
                content: content 
            };
        }

        return null;
    } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        return null;
    }
}

async function recursiveFileCall(
    path: GithubResponse, 
    owner: string, 
    repo: string, 
    token: string, 
    stk: Stack<string>
): Promise<FilesAndContent[]> {
    // Push the current directory name to the stack
    stk.push(path.name);

    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path.path}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!res.ok) {
            console.error(`Failed to fetch contents for ${path.path}`);
            stk.pop(); // Remove the last pushed item before returning
            return [];
        }

        const data: GithubResponse[] = await res.json();
        
        // Recursively process each item 
        const files: FilesAndContent[] = [];
        for (const item of data) {
            if (item.type === 'file') {
                const fileContent = await fetchFileContent(item, token, stk);
                if (fileContent) {
                    files.push(fileContent);
                }
            } else if (item.type === 'dir') {
                const dirStack = new Stack<string>();
                
                // Copy existing stack items to the new stack 
                const tempStack: string[] = [];
                while (!stk.isEmpty()) {
                    tempStack.push(stk.pop()!);
                }
                
                // Restore stack in correct order
                while (tempStack.length > 0) {
                    dirStack.push(tempStack.pop()!);
                }
                
                const dirFiles = await recursiveFileCall(item, owner, repo, token, dirStack);
                files.push(...dirFiles);
            }
        }

        // Pop the current directory from the stack before returning
        stk.pop();

        return files;
    } catch (error) {
        console.error(`Error processing ${path.path}:`, error);
        stk.pop(); // Remove the last pushed item in case of error
        return [];
    }
}


export async function GET(req: NextRequest) {
    const session = await getServerSession(NEXT_AUTH);
    
    // Safely check for access token
    //@ts-expect-error abc
    if (!session || typeof session.accessToken !== 'string') {
        return NextResponse.json({ 
            error: "Authentication required" 
        }, { status: 401 });
    }
    //@ts-expect-error abc
    const token = session.accessToken;

    try {
        const searchParams = req.nextUrl.searchParams;
        const owner = searchParams.get('owner');
        const repo = searchParams.get('repo');
        

        if (!owner || !repo) {
            return NextResponse.json({ 
                error: "Owner and repository name are required" 
            }, { status: 400 });
        }

        // Correct method for fetching repository contents (GET, not POST)
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!res.ok) {
            return NextResponse.json({ 
                error: "Failed to fetch repository contents",
                details: await res.text()
            }, { status: res.status });
        }

        const initial_files: GithubResponse[] = await res.json();
        const file_names: string[] = [];

        // Collect files through recursive traversal
        const files: FilesAndContent[] = [];
        const stack = new Stack<string>();
        
        for (const file of initial_files) {
            if (file.type === 'file') {
                const fileContent = await fetchFileContent(file, token, stack);
                if (fileContent) {
                    files.push(fileContent);
                    file_names.push(file.name);
                }
            } else if (file.type === 'dir') {
                const dirStack = new Stack<string>();
                const dirFiles = await recursiveFileCall(file, owner, repo, token, dirStack);
                files.push(...dirFiles);
                dirFiles.forEach((file) => file_names.push(file.name));
            }
        }

        // Correct API call with proper fetch configuration
        const relevantFileAction = await fetch(`http://localhost:3000/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'Review',
                file_names
            })
        });

        const actionData = await relevantFileAction.json();
        console.log(actionData);
        
        return NextResponse.json({ 
            data: files,
            actionData 
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ 
            error: "An unexpected error occurred",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}