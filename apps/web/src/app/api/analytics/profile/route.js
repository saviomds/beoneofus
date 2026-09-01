import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Premium gate
    const { data: prof } = await supabase
      .from('profiles')
      .select('is_premium, is_admin, profile_views, role')
      .eq('id', user.id)
      .single();

    const isAllowed = prof?.is_premium || prof?.is_admin || ['admin', 'founder'].includes(prof?.role);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Premium required', premium_required: true }, { status: 403 });
    }

    const now   = new Date();
    const day7  = new Date(now - 7  * 86400000).toISOString();
    const day30 = new Date(now - 30 * 86400000).toISOString();

    const [viewsTotal, views7d, views30d, recentViewers, connections] = await Promise.all([
      // Total views
      supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('viewed_id', user.id),
      // Last 7 days
      supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('viewed_id', user.id).gte('viewed_at', day7),
      // Last 30 days
      supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('viewed_id', user.id).gte('viewed_at', day30),
      // Recent viewers (latest 8, with profile info)
      supabase.from('profile_views')
        .select('viewed_at, viewer_id, profiles(username, avatar_url, role, is_verified)')
        .eq('viewed_id', user.id)
        .not('viewer_id', 'is', null)
        .order('viewed_at', { ascending: false })
        .limit(8),
      // Connection count
      supabase.from('connections').select('id', { count: 'exact', head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted'),
    ]);

    // Daily breakdown last 7 days
    const { data: dailyRaw } = await supabase
      .from('profile_views')
      .select('viewed_at')
      .eq('viewed_id', user.id)
      .gte('viewed_at', day7)
      .order('viewed_at', { ascending: true });

    const dailyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[key] = 0;
    }
    (dailyRaw || []).forEach(v => {
      const key = new Date(v.viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (key in dailyMap) dailyMap[key]++;
    });

    return NextResponse.json({
      total_views:    viewsTotal.count  ?? 0,
      views_7d:       views7d.count     ?? 0,
      views_30d:      views30d.count    ?? 0,
      connections:    connections.count ?? 0,
      profile_views:  prof.profile_views ?? 0,
      recent_viewers: (recentViewers.data || []).map(v => ({
        viewed_at: v.viewed_at,
        ...v.profiles,
      })),
      daily_chart: Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
    });
  } catch (err) {
    console.error('analytics error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Record a profile view (called from public profile page)
export async function POST(request) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const { viewed_id, viewer_id } = await request.json();
    if (!viewed_id) return NextResponse.json({ error: 'viewed_id required' }, { status: 400 });

    // Don't count self-views
    if (viewer_id && viewer_id === viewed_id) return NextResponse.json({ ok: true });

    await supabase.from('profile_views').insert({ viewed_id, viewer_id: viewer_id || null });
    await supabase.rpc('increment_profile_views', { target_user_id: viewed_id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
