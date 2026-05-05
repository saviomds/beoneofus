import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { messages } = await req.json();

    // System prompt to set the persona
    const systemMessage = {
      role: "system",
      content: "You are beoneofus AI, a highly skilled and helpful career assistant and software engineering mentor. You help users with coding, finding jobs, and improving their CVs. Be concise, professional, and encouraging."
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...messages],
      temperature: 0.7,
    });

    return NextResponse.json({
      message: { role: "assistant", content: completion.choices[0].message.content }
    });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error?.status === 429) {
      return NextResponse.json({ error: "The AI service is currently unavailable due to capacity limits. Please try again later." }, { status: 429 });
    }

    return NextResponse.json({ error: error.message || "Failed to fetch response from AI" }, { status: 500 });
  }
}