import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../../../lib/requireAuth";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/pathways                      → list all published pathways (public)
// GET /api/pathways?id=uuid              → single pathway with stages (public)
// GET /api/pathways?userId=<any>         → the AUTHENTICATED caller's enrolments
//                                          (requires Bearer token; id is taken
//                                          from the token, not the query value)
// GET /api/pathways?leaderboard=true     → top completers (public)
export async function GET(req) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const userId = searchParams.get("userId");
  const leaderboard = searchParams.get("leaderboard");

  if (leaderboard === "true") {
    const { data } = await supabase
      .from("user_pathways")
      .select("user_id, completed_at, pathway_id, pathways(title), profiles!user_pathways_user_id_fkey(username, avatar_url, full_name)")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(50);
    return NextResponse.json({ leaderboard: data || [] });
  }

  if (id) {
    const { data, error } = await supabase
      .from("pathways")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ pathway: data });
  }

  if (userId) {
    // A user's enrollments are private — only the user themselves may read them.
    const { user, error: authError, status } = await requireAuth(req);
    if (authError) return NextResponse.json({ error: authError }, { status });
    const { data } = await supabase
      .from("user_pathways")
      .select("*, pathways(*)")
      .eq("user_id", user.id);
    return NextResponse.json({ enrolled: data || [] });
  }

  const { data } = await supabase
    .from("pathways")
    .select("id, title, description, target_role, category, level, estimated_weeks, cover_emoji, stages")
    .eq("is_published", true)
    .order("created_at", { ascending: true });
  return NextResponse.json({ pathways: data || [] });
}

// POST /api/pathways  body: { pathwayId }              → enroll (Bearer token)
// POST /api/pathways  body: { pathwayId, stageIndex }  → mark stage done (Bearer token)
export async function POST(req) {
  const supabase = getSupabase();
  // Always derive the user id from the verified access token, never the body.
  const { user, error: authError, status: authStatus } = await requireAuth(req);
  if (authError) return NextResponse.json({ error: authError }, { status: authStatus });
  const userId = user.id;
  const body = await req.json();
  const { pathwayId, stageIndex } = body;
  if (!pathwayId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (stageIndex !== undefined) {
    // Mark stage complete
    const { data: existing } = await supabase
      .from("user_pathways")
      .select("*")
      .eq("user_id", userId)
      .eq("pathway_id", pathwayId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "Not enrolled" }, { status: 400 });

    const completed = Array.from(new Set([...(existing.completed_stages || []), stageIndex]));
    const { data: pathway } = await supabase.from("pathways").select("stages").eq("id", pathwayId).single();
    const totalStages = (pathway?.stages || []).length;
    const isComplete = completed.length >= totalStages && totalStages > 0;

    const { data, error } = await supabase
      .from("user_pathways")
      .update({
        completed_stages: completed,
        current_stage: Math.max(existing.current_stage, stageIndex + 1),
        ...(isComplete && !existing.completed_at ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("user_id", userId)
      .eq("pathway_id", pathwayId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ progress: data, completed: isComplete });
  }

  // Enroll
  const { data, error } = await supabase
    .from("user_pathways")
    .upsert({ user_id: userId, pathway_id: pathwayId }, { onConflict: "user_id,pathway_id" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enrolled: data });
}

// DELETE /api/pathways?userId=x&pathwayId=x → unenroll
export async function DELETE(req) {
  const supabase = getSupabase();
  const { user, error: authError, status } = await requireAuth(req);
  if (authError) return NextResponse.json({ error: authError }, { status });
  const userId = user.id;
  const { searchParams } = new URL(req.url);
  const pathwayId = searchParams.get("pathwayId");
  if (!pathwayId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const { error } = await supabase
    .from("user_pathways")
    .delete()
    .eq("user_id", userId)
    .eq("pathway_id", pathwayId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
