import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ROADMAP_PHASES, ROADMAP_META, mergePhases, overallProgress } from "../../../lib/roadmapData";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdmin(req, supabase) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { error: "Unauthorized", status: 401 };
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { error: "Unauthorized", status: 401 };
  const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!prof?.is_admin) return { error: "Forbidden", status: 403 };
  return { user };
}

// GET /api/roadmap — public. Static content overlaid with live DB execution state.
export async function GET() {
  const supabase = admin();
  let overrides = [];
  try {
    const { data } = await supabase
      .from("roadmap_phases")
      .select("id, status, progress, timeline, note, updated_at");
    overrides = data || [];
  } catch { /* table not migrated yet → fall back to static config */ }

  const phases = mergePhases(overrides);
  return NextResponse.json({ meta: ROADMAP_META, phases, overall: overallProgress(phases) });
}

// PATCH /api/roadmap — admin. Body: { id, status?, progress?, timeline?, note? }
export async function PATCH(req) {
  const supabase = admin();
  const gate = await requireAdmin(req, supabase);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const { id } = body;
  if (!id || !ROADMAP_PHASES.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Unknown phase id" }, { status: 400 });
  }
  const phase = ROADMAP_PHASES.find((p) => p.id === id);

  const patch = { id, number: phase.number, updated_by: gate.user.id, updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!["planned", "in_progress", "completed"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.progress !== undefined) {
    const n = Number(body.progress);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ error: "progress must be 0–100" }, { status: 400 });
    }
    patch.progress = Math.round(n);
  }
  if (body.timeline !== undefined) patch.timeline = String(body.timeline).slice(0, 80);
  if (body.note !== undefined) patch.note = String(body.note).slice(0, 400);

  const { error } = await supabase.from("roadmap_phases").upsert(patch, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id, ...patch });
}
