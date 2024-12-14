import { NextRequest, NextResponse } from 'next/server';
import { init } from '../LLM';

export async function POST(req:NextRequest){
    const body = await req.json();
    const {res} = body;
    const initial_response = init(res);
    return NextResponse.json({initial_response});
}