import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request) {
  const supa = adminClient();

  try {
    const body = await request.json();
    const {
      level = 'error',
      category = 'client',
      message,
      stack,
      url,
      component,
      user_id,
      user_agent,
      metadata = {},
    } = body;

    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const safeMsg  = String(message).slice(0, 1000);
    const safeUrl  = url  ? String(url).slice(0, 500) : null;
    const safeStack = stack ? String(stack).slice(0, 3000) : null;

    // Dedup: if same message + url logged in last 5 min, just increment count
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: existing } = await supa
      .from('error_logs')
      .select('id, count')
      .eq('message', safeMsg)
      .eq('url', safeUrl || '')
      .gte('created_at', fiveMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supa.from('error_logs')
        .update({ count: (existing.count || 1) + 1, last_seen_at: new Date().toISOString() })
        .eq('id', existing.id);
      return NextResponse.json({ deduplicated: true });
    }

    // New error — insert
    const { data: inserted, error: insertErr } = await supa
      .from('error_logs')
      .insert({
        level,
        category,
        message: safeMsg,
        stack: safeStack,
        url: safeUrl,
        component: component ? String(component).slice(0, 200) : null,
        user_id: user_id || null,
        user_agent: user_agent ? String(user_agent).slice(0, 500) : null,
        metadata,
        count: 1,
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;

    // Notify admins for error-level events (not warn/info)
    if (level === 'error') {
      const { data: admins } = await supa
        .from('profiles')
        .select('id')
        .eq('is_admin', true);

      if (admins?.length) {
        const preview = safeMsg.slice(0, 120);
        await supa.from('notifications').insert(
          admins.map(a => ({
            receiver_id: a.id,
            actor_id: user_id || null,
            type: 'system_error',
            content: `[${category.toUpperCase()} ERROR] ${preview}`,
            unread: true,
          }))
        );
      }
    }

    return NextResponse.json({ id: inserted.id });
  } catch (err) {
    console.error('log-error route:', err);
    // Return 200 so client doesn't retry in a loop
    return NextResponse.json({ error: err.message }, { status: 200 });
  }
}
