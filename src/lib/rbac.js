import { supabaseAdmin } from './supabaseAdmin';

/** Ordered hierarchy: higher index = more permissions */
const ROLE_HIERARCHY = ['member', 'verified', 'premium', 'admin', 'founder'];

function rankOf(role) {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? 0 : idx;
}

/**
 * Validates the Bearer token AND checks the caller has at least `minRole`.
 *
 * @param {Request} request
 * @param {'member'|'verified'|'premium'|'admin'|'founder'} minRole
 * @returns {Promise<{ user: object|null, profile: object|null, error: string|null, status: number }>}
 *
 * @example
 * const { user, profile, error, status } = await requireRole(request, 'admin');
 * if (error) return Response.json({ error }, { status });
 */
export async function requireRole(request, minRole = 'member') {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { user: null, profile: null, error: 'Missing authorization token', status: 401 };
  }

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return { user: null, profile: null, error: 'Invalid or expired token', status: 401 };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_verified, is_premium, is_admin')
    .eq('id', user.id)
    .single();

  // Derive effective role from profile columns
  let effectiveRole = profile?.role ?? 'member';
  if (!effectiveRole || effectiveRole === 'member') {
    if (profile?.is_premium)  effectiveRole = 'premium';
    else if (profile?.is_verified) effectiveRole = 'verified';
  }
  if (profile?.is_admin && rankOf(effectiveRole) < rankOf('admin')) {
    effectiveRole = 'admin';
  }

  if (rankOf(effectiveRole) < rankOf(minRole)) {
    return { user: null, profile: null, error: 'Insufficient permissions', status: 403 };
  }

  return { user, profile: { ...profile, effectiveRole }, error: null, status: 200 };
}
