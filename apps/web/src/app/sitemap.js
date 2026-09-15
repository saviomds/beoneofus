import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://b1overs.com';

const STATIC_ROUTES = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/vision', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/roadmap', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/growth', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/how-it-works', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/for-institutions', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/study-abroad', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/work-abroad', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/apply', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/requirements', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/sponsors', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/organizations', changeFrequency: 'daily', priority: 0.8 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.9 },
  { path: '/docs', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/auth', changeFrequency: 'yearly', priority: 0.3 },
];

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function sitemap() {
  const staticEntries = STATIC_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const supabase = makeSupabase();
  if (!supabase) return staticEntries;

  const [{ data: posts }, { data: orgs }] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('slug, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('organizations')
      .select('slug, created_at')
      .order('created_at', { ascending: false }),
  ]);

  const postEntries = (posts || []).map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const orgEntries = (orgs || []).map((o) => ({
    url: `${BASE_URL}/organizations/${o.slug}`,
    lastModified: o.created_at ? new Date(o.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticEntries, ...postEntries, ...orgEntries];
}
