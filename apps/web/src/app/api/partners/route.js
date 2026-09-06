import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public list of accepted partnership logos for the landing page.
// RLS on `partnerships` restricts SELECT to the owner/admins, so this reads
// with the service role and returns only the non-sensitive display fields.
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('partnerships')
      .select('id, company_name, logo_url, website, created_at')
      .eq('status', 'accepted')
      .not('logo_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    const partners = (data || [])
      .filter((p) => p.logo_url && p.logo_url.trim())
      .map((p) => ({
        id: p.id,
        company_name: p.company_name,
        logo_url: p.logo_url,
        website: p.website || null,
      }));

    return NextResponse.json({ partners });
  } catch (err) {
    console.error('[partners] GET error:', err.message);
    return NextResponse.json({ partners: [] });
  }
}
