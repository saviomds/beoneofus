// Best-effort insert into admin_audit_log — never blocks the action it's
// logging. Takes the Supabase client as an argument so it works both from
// service-role API routes and directly from admin-facing client components.
export async function logAdminAction(client, { actorId, action, targetType, targetId, targetUserId, details = {} }) {
  const { error } = await client.from('admin_audit_log').insert({
    actor_id: actorId,
    action,
    target_type: targetType ?? null,
    target_id: targetId != null ? String(targetId) : null,
    target_user_id: targetUserId ?? null,
    details,
  });
  if (error) console.warn('audit log insert failed:', error.message);
}
