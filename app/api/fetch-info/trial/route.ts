
import {  NextResponse } from "next/server";

interface GithubTree{
    sha:string,
    url:string,
    tree:GithubResponse[]
}
interface GithubResponse{ 
        path:string,
        type:string,
        size:number,
        url:string
}
export async function GET(){

    const file_names: string[] = [];
    const folders : string[]= [];
    //Step 1 : Get the name of all the files in a repo main branch 
    const res = await fetch('https://api.github.com/repos/Raman-79/newtube/git/trees/main?recursive=1')
    const data:GithubTree = await res.json();
    for(const file of data.tree){
        if(file.type == 'blob'){
            file_names.push(file.path);
        }
        else folders.push(file.path);
    }

   
    //Step 2:  traverse through the response and store all the contents in hash in a nosql db
    const relevant_folders = await fetch('/api/chat/trial',{
        body:JSON.stringify({
            action:'Review',
            message:'What are the relevant files and folders you require to review and make necessary changes. Note: Do not include files and folders like packages etc etc'
        })
    });

    const relevant_folders_data = await relevant_folders.json(); // this will be an array or we can use RAG for fetching relevant file contents
    

return NextResponse.json({data});


//Step 3: 
}


