import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiClient } from '../../../../lib/aiClient';
import { sendNotificationEmail } from '../../../../lib/sendNotificationEmail';


const groq = aiClient; // Groq when a real gsk_ key exists, else Anthropic fallback

const DEFAULT_CHALLENGE = {
  title: 'Two Sum',
  description: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers that add up to target.

You may assume that each input has exactly one solution and you may not use the same element twice.

**Example 1:**
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]

**Example 2:**
Input: nums = [3, 2, 4], target = 6
Output: [1, 2]`,
  starterCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Write your solution here

}

// Test
console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
console.log(twoSum([3, 2, 4], 6));       // [1, 2]`,
  language: 'javascript',
  difficulty: 'medium',
  testCases: [
    { input: '[2,7,11,15], 9', expected: '[0,1]' },
    { input: '[3,2,4], 6', expected: '[1,2]' },
  ],
};

async function getApplicantContact(supabase, applicantId) {
  const [{ data: { user } }, { data: profile }] = await Promise.all([
    supabase.auth.admin.getUserById(applicantId),
    supabase.from('profiles').select('username').eq('id', applicantId).single(),
  ]);
  return { email: user?.email, name: profile?.username || 'there' };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, roomId, applicantId, code, language } = body;

    if (!roomId || !applicantId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: room, error: roomErr } = await supabase
      .from('interview_rooms')
      .select('id, applicant_id, admin_id, job_title, company, coding_challenge, status')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }
    if (room.applicant_id !== applicantId) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // ── GENERATE ──────────────────────────────────────────────────────────────
    if (action === 'generate') {
      if (room.coding_challenge) {
        return NextResponse.json({ success: true, challenge: room.coding_challenge });
      }

      let challenge = DEFAULT_CHALLENGE;

      if (groq) {
        const prompt = `You are a technical interviewer creating a coding challenge for a ${room.job_title}${room.company ? ` at ${room.company}` : ''} role.

Generate a MEDIUM difficulty algorithmic coding problem solvable in 20-30 minutes.

Respond ONLY with a valid JSON object — no extra text, no markdown fences:
{
  "title": "<problem name>",
  "description": "<clear problem statement with 2 examples using markdown bold for labels>",
  "starterCode": "<complete JavaScript starter code with JSDoc, function signature, and 2 console.log test calls>",
  "language": "javascript",
  "difficulty": "medium",
  "testCases": [
    { "input": "<description of input>", "expected": "<expected output>" },
    { "input": "<description of input 2>", "expected": "<expected output 2>" }
  ]
}`;

        try {
          const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 1024,
          });
          const raw = completion.choices[0].message.content;
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            challenge = JSON.parse(jsonMatch[0]);
          }
        } catch (aiErr) {
          console.warn('Challenge generation failed, using default:', aiErr.message);
        }
      }

      await supabase
        .from('interview_rooms')
        .update({ coding_challenge: challenge, status: 'coding', updated_at: new Date().toISOString() })
        .eq('id', roomId);

      // In-app notification — coding phase started
      await supabase.from('notifications').insert({
        receiver_id: applicantId,
        actor_id: applicantId,
        type: 'interview_coding_started',
        content: `Your coding challenge for "${room.job_title}" is ready. You have 20-30 minutes — good luck!`,
        unread: true,
      });

      return NextResponse.json({ success: true, challenge });
    }

    // ── SUBMIT ────────────────────────────────────────────────────────────────
    if (action === 'submit') {
      if (!code) {
        return NextResponse.json({ error: 'No code submitted.' }, { status: 400 });
      }

      const challenge = room.coding_challenge || DEFAULT_CHALLENGE;

      let feedback = 'Code received. Good effort!';
      let score = 55;
      let passed = false;
      let timeComplexity = 'O(n)';
      let spaceComplexity = 'O(n)';

      if (groq) {
        const prompt = `You are an expert code reviewer. Evaluate this coding solution.

Problem: ${challenge.title}
Description: ${challenge.description}

Submitted Code (${language || 'javascript'}):
\`\`\`${language || 'javascript'}
${code}
\`\`\`

Respond ONLY with a valid JSON object:
{
  "score": <integer 0-100>,
  "passed": <true if the solution is correct and reasonably efficient>,
  "feedback": "<3-4 sentences covering correctness, efficiency, and code quality — be specific>",
  "timeComplexity": "<Big-O notation>",
  "spaceComplexity": "<Big-O notation>"
}`;

        try {
          const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 512,
          });
          const raw = completion.choices[0].message.content;
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            score = Math.min(100, Math.max(0, Number(parsed.score) || 55));
            passed = Boolean(parsed.passed);
            feedback = parsed.feedback || feedback;
            timeComplexity = parsed.timeComplexity || timeComplexity;
            spaceComplexity = parsed.spaceComplexity || spaceComplexity;
          }
        } catch (aiErr) {
          console.warn('Code evaluation failed:', aiErr.message);
        }
      }

      await supabase.from('interview_code_submissions').insert({
        room_id: roomId,
        applicant_id: applicantId,
        code,
        language: language || 'javascript',
        ai_feedback: feedback,
        ai_score: score,
        passed,
        time_complexity: timeComplexity,
        space_complexity: spaceComplexity,
      });

      // Compute overall score from all answers + code
      const { data: answers } = await supabase
        .from('interview_answers')
        .select('ai_score')
        .eq('room_id', roomId);

      const allScores = [...(answers || []).map(a => a.ai_score || 0), score];
      const overallScore = Math.round(allScores.reduce((s, n) => s + n, 0) / allScores.length);

      await supabase
        .from('interview_rooms')
        .update({ status: 'completed', overall_score: overallScore, updated_at: new Date().toISOString() })
        .eq('id', roomId);

      const grade = overallScore >= 85 ? 'Excellent' : overallScore >= 70 ? 'Good' : overallScore >= 55 ? 'Fair' : 'Needs Work';

      // In-app notification — applicant: interview complete
      await supabase.from('notifications').insert({
        receiver_id: applicantId,
        actor_id: applicantId,
        type: 'interview_completed',
        content: `Your interview for "${room.job_title}" is complete! Overall score: ${overallScore}% (${grade}). View your full results in the Interview section.`,
        unread: true,
      });

      // In-app notification — admin: candidate finished
      await supabase.from('notifications').insert({
        receiver_id: room.admin_id,
        actor_id: applicantId,
        type: 'interview_completed',
        content: `A candidate has completed the "${room.job_title}" interview with an overall score of ${overallScore}% (${grade}).`,
        unread: true,
      });

      // Email — applicant: results summary
      const { email, name } = await getApplicantContact(supabase, applicantId);
      await sendNotificationEmail({
        type: 'interview_completed',
        email,
        name,
        extra: {
          jobTitle: room.job_title,
          company: room.company || '',
          overallScore,
          grade,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
        },
      });

      return NextResponse.json({ success: true, feedback, score, passed, timeComplexity, spaceComplexity, overallScore });
    }

    return NextResponse.json({ error: 'Invalid action. Use "generate" or "submit".' }, { status: 400 });
  } catch (err) {
    console.error('Coding challenge error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
