import { FilesAndContent, GithubResponse } from "@/app/interfaces";
import { NEXT_AUTH } from "@/app/utils/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Stack } from "@/app/interfaces/stack";


async function fetchFileContent(file: GithubResponse, token: string, stk: Stack<string>): Promise<FilesAndContent | null> {
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

async function recursiveFileCall(path: GithubResponse, owner: string, repo: string, token: string, stk: Stack<string>): Promise<FilesAndContent[]> {
    // Push the current directory name to the stack
    stk.push(path.name);

    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path.path}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
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
            if (item.type === 'file' ) {
                const fileContent = await fetchFileContent(item, token, stk);
                if (fileContent) {
                    files.push(fileContent);
                }
            } else if (item.type === 'dir') {
                // Create a new stack for each directory to maintain separate path context
                const dirStack = new Stack<string>();
                // Copy existing stack items to the new stack by reversing the elements. 
                while (!stk.isEmpty()) {
                    dirStack.push(stk.pop()!);
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
        const file_names : string[] = [];

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
                dirFiles.map((file)=>{file_names.push(file.name)})
            }
        }
       //Api call to get the relavent files array for an action to perform
       const relavent_file_action = fetch(`/api/getRelavant-files`,{
        body:JSON.stringify({
            action:'Review',
            file_names
        })
       });
        
        return NextResponse.json({ data: files });
    } catch (error) {
        console.error("Unexpected error:", error);
        return Response.json({ 
            error: "An unexpected error occurred" 
        }, { status: 500 });
    }
}