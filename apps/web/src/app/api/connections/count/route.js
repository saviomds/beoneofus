import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validate } from '../../../../lib/validate';

// Public endpoint: a profile's connection count is public information (like a
// social follower count). No auth is required, but `user_id` MUST be a valid
// UUID — it is interpolated into a PostgREST `.or()` filter, so an unvalidated
// value would be a filter-injection surface under the service-role client.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!validate.uuid(userId)) {
    return NextResponse.json({ error: 'A valid user_id is required' }, { status: 400 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { count, error } = await supabaseAdmin
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
