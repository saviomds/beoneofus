import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabase(cookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const supabase = getSupabase(cookieStore);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id, cover_letter, portfolio_url } = await request.json();
    if (!job_id) return NextResponse.json({ error: 'job_id is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('job_applications')
      .upsert(
        {
          job_id,
          applicant_id: user.id,
          cover_letter: cover_letter?.trim() || null,
          portfolio_url: portfolio_url?.trim() || null,
          status: 'submitted',
        },
        { onConflict: 'job_id,applicant_id', ignoreDuplicates: false }
      )
      .select('id, status, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, application: data });
  } catch (err) {
    console.error('[jobs/apply]', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const supabase = getSupabase(cookieStore);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('job_applications')
      .select('job_id, status, created_at')
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ applications: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
