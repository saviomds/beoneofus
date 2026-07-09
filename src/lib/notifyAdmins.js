// Best-effort admin notifications. Used by server routes that already hold a
// service-role Supabase client (so these inserts bypass RLS). Never throws —
// a failed notification must not block the underlying action.

/**
 * Ping every platform admin that an organization has requested verification.
 * @param supabase   service-role Supabase client
 * @param org        { id, name } the requesting organization
 * @param requesterId uuid of the manager who submitted (nullable)
 */
export async function notifyAdminsOfVerification(supabase, org, requesterId) {
  try {
    const { data: admins } = await supabase
      .from('profiles').select('id').eq('is_admin', true);
    if (!admins?.length) return;
    await supabase.from('notifications').insert(
      admins
        .filter((a) => a.id !== requesterId) // don't notify a requester who is also an admin
        .map((a) => ({
          receiver_id: a.id,
          actor_id: requesterId || null,
          type: 'verification_request',
          content: `${org?.name || 'An organization'} requested verification. Review it in the trust queue.`,
          unread: true,
        }))
    );
  } catch {
    /* best-effort — swallow */
  }
}
