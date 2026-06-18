import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = 'edge';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const SYSTEM = `You are a career advisor for BeOneOfUs, a professional growth platform.
Given a user's current skills and a target role or job description, analyze the gap.
Return ONLY valid JSON with this exact shape — no markdown, no extra text:
{
  "have": ["skill1", "skill2"],
  "weak": [{"skill": "x", "reason": "brief reason max 10 words"}],
  "missing": [{"skill": "x", "reason": "brief reason max 10 words", "priority": "high"|"medium"|"low"}],
  "score": 0-100,
  "summary": "one sentence on overall readiness max 20 words"
}
"have" = skills they clearly possess that are relevant.
"weak" = skills they have partially but need to deepen.
"missing" = important skills they lack entirely, sorted by priority.
Limit: have max 8, weak max 5, missing max 8.`;

async function callAI(userPrompt) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 800,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  return response.content[0].text;
}

export async function POST(req) {
  if (!anthropic) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetRole, jobDescription } = await req.json();
  if (!targetRole && !jobDescription) return NextResponse.json({ error: "Provide targetRole or jobDescription" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role, field, skills, work_status")
    .eq("id", user.id)
    .single();

  const { data: certs } = await supabase
    .from("user_certificates")
    .select("courses(title, category)")
    .eq("user_id", user.id)
    .limit(20);

  const { data: completedCourses } = await supabase
    .from("user_course_progress")
    .select("courses(title, category)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .limit(20);

  const profileSkills = profile?.skills || [];
  const certTopics = certs?.map(c => c.courses?.title).filter(Boolean) || [];
  const courseTopics = completedCourses?.map(c => c.courses?.title).filter(Boolean) || [];
  const allSkills = [...new Set([...profileSkills, ...certTopics, ...courseTopics])];

  const userPrompt = `User profile:
- Current role: ${profile?.role || "not specified"}
- Field: ${profile?.field || "not specified"}
- Work status: ${profile?.work_status || "not specified"}
- Known skills: ${allSkills.join(", ") || "none listed"}
- Completed courses/certifications: ${[...certTopics, ...courseTopics].slice(0, 10).join(", ") || "none"}

Target: ${targetRole ? `Role — ${targetRole}` : ""}
${jobDescription ? `Job Description:\n${jobDescription.slice(0, 1500)}` : ""}

Analyze the skill gap. Return JSON only.`;

  try {
    const raw = await callAI(userPrompt);

    let result;
    try {
      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
      result = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });
    }

    return NextResponse.json({ gap: result, profile: { skills: allSkills } });
  } catch (err) {
    if (err.status === 401) {
      return NextResponse.json({ error: "AI service is misconfigured. Contact support." }, { status: 503 });
    }
    if (err.status === 429) {
      return NextResponse.json({ error: "AI service is busy. Please try again in a moment." }, { status: 503 });
    }
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
