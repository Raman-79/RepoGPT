import { NextRequest, NextResponse } from "next/server";
import { excludedFiles, excludedFolders } from "@/lib/consts";
import { getServerSession } from "next-auth";
import { NEXT_AUTH } from "@/lib/auth";
import { handleApiError, AuthenticationError, ExternalServiceError } from '@/lib/errors';
import { validateInput, repositorySchema } from '@/lib/validation';

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
    const body = await req.json();
    const { owner, repo, branch } = validateInput(repositorySchema, body);
    
    const session = await getServerSession(NEXT_AUTH);
    
    if (!session?.accessToken) {
      throw new AuthenticationError('No access token found');
    }

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github+json',
        }
      }
    );

    if (!res.ok) {
      throw new ExternalServiceError('GitHub', `API responded with status ${res.status}: ${res.statusText}`);
    }

    const data: GithubTree = await res.json();
    
    const fileNames = data.tree
      .filter(file => file.type === 'blob' && file.path)
      .map(file => ({
        name: file.path,
        url: file.url
      }));

    const filteredFiles = fileNames.filter(file => {
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

    console.log(`Processing ${filteredFiles.length} files for embeddings`);

    // Process files in batches to avoid overwhelming the API
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < filteredFiles.length; i += batchSize) {
      const batch = filteredFiles.slice(i, i + batchSize);
      const batchPromises = batch.map(file => 
        fetch(`${req.nextUrl.origin}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            fileName: file.name,
            url: file.url
          })
        }).catch(error => {
          console.error(`Failed to process ${file.name}:`, error);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null));
      
      // Add a small delay between batches
      if (i + batchSize < filteredFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: filteredFiles,
      processed: results.length,
      total: filteredFiles.length,
      message: 'Repository files processed successfully'
    });

  } catch (error) {
    console.error('Error processing repository:', error);
    const { message, statusCode } = handleApiError(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: statusCode }
    );
  }
}