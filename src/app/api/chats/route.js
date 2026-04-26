import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
    }

    const systemPrompt = `You are a highly skilled software engineering AI assistant for the beoneofus platform.
    
IMPORTANT RULES:
1. You must ONLY answer questions related to programming, software engineering, or the beoneofus platform itself. Politely decline anything else.
2. Keep responses EXTREMELY brief and to the point (maximum 3-4 sentences). Do not use conversational filler, pleasantries, or long introductions/conclusions. Use bullet points and short code blocks where possible.

BEONEOFUS PLATFORM DOCUMENTATION:
- Overview: A developer-centric social networking and collaboration platform built with Next.js and Supabase.
- Owner/Creator: The platform was founded and is owned by Dominique Savio M.
- Nodes: Verified user identities with a status (e.g., Active) and security clearance.
- Handshakes: Direct peer-to-peer connection requests. They remain 'pending' until authorized. Users can also 'Sever' (block) connections.
- Secured Workspaces (Channels): Public or private collaborative chat rooms. Private spaces require an exact username invite or join request.
- Public Feed: The main broadcast terminal. Users can share text, images, and formatted Code Snippets.
- Bookmarks: Users can save snippets locally categorized as 'Code' or 'General'.
- beoneofus AI: The AI assistant currently being used to talk to the user.`;

    // Pointing to Groq Cloud API for fast, free open-source models
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast, free open-source model hosted on Groq
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'API Error' }, { status: response.status });
    }

    return NextResponse.json({ message: data.choices[0].message });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}