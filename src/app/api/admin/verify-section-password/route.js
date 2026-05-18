import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only co-founders and admins can attempt this
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || (!callerProfile.is_admin && callerProfile.role !== 'founder')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sectionPassword = process.env.ADMIN_SECTION_PASSWORD;
    if (!sectionPassword) {
      // Password not configured — treat sections as open
      return NextResponse.json({ success: true });
    }

    const { password } = await request.json();
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });

    const correct = password === sectionPassword;
    if (!correct) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
