import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/platform-stats
 * Returns REAL, live counts from the database — no fabricated marketing
 * numbers. Uses the service-role client so row-level security doesn't skew
 * the totals. Values grow on their own as the platform grows.
 */
export const dynamic = 'force-dynamic';

const admin = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Count rows in a table; return 0 on any error so one bad table never breaks
// the whole payload.
async function countOf(db, table) {
  try {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
    return error ? 0 : (count || 0);
  } catch {
    return 0;
  }
}

export async function GET() {
  const db = admin();

  const TABLES = [
    'profiles', 'pages', 'organizations', 'connections', 'projects',
    'jobs', 'services', 'contracts', 'marketplace_listings', 'freelance_jobs',
    'posts', 'blog_posts', 'page_posts',
  ];

  const counts = {};
  await Promise.all(TABLES.map(async (t) => { counts[t] = await countOf(db, t); }));

  // Compose truthful, meaningful metrics from raw counts.
  const stats = {
    members:       counts.profiles,
    organizations: counts.pages + counts.organizations,
    connections:   counts.connections,
    projects:      counts.projects,
    opportunities: counts.jobs + counts.services + counts.contracts + counts.marketplace_listings + counts.freelance_jobs,
    posts:         counts.posts + counts.blog_posts + counts.page_posts,
    generated_at:  new Date().toISOString(),
  };

  return NextResponse.json(stats, {
    // Cache at the edge for a minute so the DB isn't hit on every view, while
    // still reflecting growth quickly.
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
