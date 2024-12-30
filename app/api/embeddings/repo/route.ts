import { NextRequest, NextResponse } from "next/server";
import { excludedFiles, excludedFolders } from "@/lib/consts";
import { getServerSession } from "next-auth";
import { NEXT_AUTH } from "@/lib/auth";

interface GithubTree {
    sha: string;
    url: string;
    tree: GithubTreeItem[];
}

interface GithubTreeItem { 
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    size: number;
    sha: string;
    url: string;
}

export async function POST(req: NextRequest) {
    try {
        const { owner, repo,branch } = await req.json();
       
        const session = await getServerSession(NEXT_AUTH);
       
        // @ts-expect-error abc
        if (!session?.accessToken) {
            return NextResponse.json(
                { success: false, error: 'No access token found' },
                { status: 401 }
            );
        }


        const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
            {
                headers: {
                    //@ts-expect-error abc
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Accept': 'application/vnd.github+json',
                  
                }
            }
        );

        if (!res.ok) {
            console.error(`GitHub API error: ${res.statusText}`);
            return NextResponse.json(
                { success: false, error: `GitHub API responded with status ${res.status}` },
                { status: res.status }
            );
        }

        const data: GithubTree = await res.json();
        
        const file_names = data.tree
            .filter(file => file.type === 'blob' && file.path)
            .map(file => ({
                name: file.path,
                url: file.url
            }));

            const filteredFiles = file_names.filter(file => {
                // Split the path into segments
                const pathSegments = file.name.split('/');
                
                // Check if any segment is in excludedFolders
                const hasExcludedFolder = pathSegments.some(segment => 
                    excludedFolders.has(segment)
                );
                if (hasExcludedFolder) return false;
    
                // Check if the file extension or name is in excludedFiles
                const fileName = pathSegments[pathSegments.length - 1];
                const hasExcludedExtension = Array.from(excludedFiles).some(ext => 
                    fileName.toLowerCase().endsWith(ext.toLowerCase())
                );
                
                return !hasExcludedExtension;
            });
    
        console.log(filteredFiles);

        await Promise.all(filteredFiles.map(file => 
            fetch('http://localhost:3000/api/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    fileName: file.name,
                    url: file.url
                })
            })
        ));
        return NextResponse.json({ 
            success: true, 
            data: filteredFiles,
            message: 'Files filtered successfully'
        });

    } catch (error) {
        console.error('Error fetching repository data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch repository data' },
            { status: 500 }
        );
    }
}