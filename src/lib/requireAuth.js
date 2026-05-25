import { supabaseAdmin } from './supabaseAdmin';

/**
 * Validates the Bearer token from the Authorization header.
 * Returns { user, error, status }.
 * Always use `user.id` from this result — never trust body.userId.
 *
 * @param {Request} request
 * @returns {Promise<{ user: object|null, error: string|null, status: number }>}
 */
export async function requireAuth(request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { user: null, error: 'Missing authorization token', status: 401 };
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: 'Invalid or expired token', status: 401 };
  }

  return { user, error: null, status: 200 };
}
