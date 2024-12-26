import { NextResponse } from "next/server";
import { excludedFiles, excludedFolders } from "@/lib/consts";

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
interface FileInfo {
    name: string;
    url: string;
}


export async function GET() {
    try {
        const file_names: FileInfo[] = [];
        
        const res = await fetch('https://api.github.com/repos/Raman-79/newtube/git/trees/main?recursive=1', {
            headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (!res.ok) {
            throw new Error(`GitHub API responded with status ${res.status}`);
        }

        const data: GithubTree = await res.json();

        for (const file of data.tree) {
            if (file.type === 'blob' && file.path) {
                file_names.push({
                    name: file.path,
                    url: file.url
                });
            }
        }

        const filteredFiles = file_names.filter((file) => 
            !excludedFiles.some((excludedFile) => file.name.includes(excludedFile)) && !excludedFolders.some((excludedFolder)=> file.name.includes(excludedFolder))
        );

        // Generate embeddings for the filtered files
        await Promise.all(filteredFiles.map(async (file) => {
            await fetch('/api/embeddings', {
                method:'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileName: file.name,url: file.url})
            })
        }))
        .then((res)=>{
            console.log(res);
        })
        .catch((err)=>{
            console.error(err);
        });

        return NextResponse.json({ success: true, data: filteredFiles,message:'Embeddings generated for the files as context and fully too.' });
    } catch (error) {
        console.error('Error fetching repository data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch repository data' },
            { status: 500 }
        );
    }
}