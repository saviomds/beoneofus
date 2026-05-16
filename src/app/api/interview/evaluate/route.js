import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { sendNotificationEmail } from '../../../../lib/sendNotificationEmail';

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export async function POST(req) {
  try {
    const body = await req.json();
    const { roomId, applicantId, questionIndex, questionText, answerText, jobTitle, company } = body;

    if (!roomId || !applicantId || questionIndex === undefined || !questionText || !answerText) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: room, error: roomErr } = await supabase
      .from('interview_rooms')
      .select('id, applicant_id, status, questions, job_title, company, admin_id')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Interview room not found.' }, { status: 404 });
    }
    if (room.applicant_id !== applicantId) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const resolvedJobTitle = jobTitle || room.job_title;
    const resolvedCompany  = company  || room.company;

    let score = 65;
    let feedback = 'Your answer has been recorded.';
    let strengths = [];
    let improvements = [];

    if (groq) {
      const prompt = `You are an expert technical interviewer for a ${resolvedJobTitle}${resolvedCompany ? ` position at ${resolvedCompany}` : ''} role.

Interview Question: ${questionText}

Candidate's Answer: ${answerText}

Evaluate this answer professionally and respond ONLY with a valid JSON object — no extra text:
{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentence overall assessment — be direct and constructive>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"]
}

Scoring guide: 90-100 = exceptional, 75-89 = strong, 60-74 = adequate, 40-59 = needs work, below 40 = insufficient.`;

      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 512,
        });

        const raw = completion.choices[0].message.content;
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          score = Math.min(100, Math.max(0, Number(parsed.score) || 65));
          feedback = parsed.feedback || feedback;
          strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
          improvements = Array.isArray(parsed.improvements) ? parsed.improvements : [];
        }
      } catch (aiErr) {
        console.warn('AI evaluation failed, using defaults:', aiErr.message);
      }
    }

    const { data: answer, error: saveErr } = await supabase
      .from('interview_answers')
      .upsert(
        {
          room_id: roomId,
          applicant_id: applicantId,
          question_index: questionIndex,
          question_text: questionText,
          answer_text: answerText,
          ai_feedback: feedback,
          ai_score: score,
          strengths,
          improvements,
        },
        { onConflict: 'room_id,question_index' }
      )
      .select()
      .single();

    if (saveErr) throw saveErr;

    // Check if all questions are answered
    const totalQuestions = Array.isArray(room.questions) ? room.questions.length : 0;
    const { count } = await supabase
      .from('interview_answers')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId);

    const allAnswered = count >= totalQuestions;

    if (allAnswered && room.status === 'active') {
      await supabase
        .from('interview_rooms')
        .update({ status: 'answers_complete', updated_at: new Date().toISOString() })
        .eq('id', roomId);

      // In-app notification — applicant
      await supabase.from('notifications').insert({
        receiver_id: applicantId,
        actor_id: applicantId,
        type: 'interview_answers_complete',
        content: `All questions answered for "${resolvedJobTitle}". Your coding challenge is now unlocked — head to the Interview section to complete it.`,
        unread: true,
      });

      // In-app notification — admin
      await supabase.from('notifications').insert({
        receiver_id: room.admin_id,
        actor_id: applicantId,
        type: 'interview_answers_complete',
        content: `A candidate has answered all questions for the "${resolvedJobTitle}" interview room.`,
        unread: true,
      });

      // Email — applicant
      const { data: { user } } = await supabase.auth.admin.getUserById(applicantId);
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', applicantId)
        .single();

      await sendNotificationEmail({
        type: 'interview_answers_complete',
        email: user?.email,
        name: profile?.username || 'there',
        extra: {
          jobTitle: resolvedJobTitle,
          company: resolvedCompany || '',
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
        },
      });
    }

    return NextResponse.json({ success: true, answer, allAnswered });
  } catch (err) {
    console.error('Interview evaluate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
