import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/endorsements?endorseeId=uuid → skill endorsement counts for a user
export async function GET(req) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const endorseeId = searchParams.get("endorseeId");
  if (!endorseeId) return NextResponse.json({ error: "Missing endorseeId" }, { status: 400 });

  const { data, error } = await supabase
    .from("skill_endorsements")
    .select("skill, endorser_id")
    .eq("endorsee_id", endorseeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = {};
  (data || []).forEach(e => {
    if (!grouped[e.skill]) grouped[e.skill] = [];
    grouped[e.skill].push(e.endorser_id);
  });

  return NextResponse.json({ endorsements: grouped });
}

// POST /api/endorsements  body: { endorseeId, skill, token }
export async function POST(req) {
  const supabase = getSupabase();
  const { endorseeId, skill, token } = await req.json();
  if (!endorseeId || !skill || !token) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.id === endorseeId) return NextResponse.json({ error: "Cannot endorse yourself" }, { status: 400 });

  const { error } = await supabase.from("skill_endorsements").insert({
    endorsee_id: endorseeId,
    endorser_id: user.id,
    skill,
  });
  if (error && error.code === "23505") return NextResponse.json({ error: "Already endorsed" }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/endorsements?endorseeId=x&skill=x  header: Authorization Bearer token
export async function DELETE(req) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const endorseeId = searchParams.get("endorseeId");
  const skill = searchParams.get("skill");
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!endorseeId || !skill || !token) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("skill_endorsements")
    .delete()
    .eq("endorsee_id", endorseeId)
    .eq("endorser_id", user.id)
    .eq("skill", skill);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
