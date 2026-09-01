import { supabase } from "../app/supabaseClient";

export async function logActivity(userId, type, content, metadata = {}) {
  if (!userId) return;
  try {
    await supabase.from("user_activity").insert({
      user_id: userId,
      type,
      content,
      metadata,
    });
  } catch (_) {}
}
