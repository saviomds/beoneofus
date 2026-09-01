import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch expired stories that have storage files
  const { data: expired, error: fetchErr } = await supabase
    .from("stories")
    .select("id, media_url, type")
    .lt("expires_at", new Date().toISOString());

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }

  if (!expired?.length) {
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
  }

  // Extract storage paths from public URLs
  const storagePaths = expired
    .filter((s) => s.media_url && (s.type === "image" || s.type === "video"))
    .map((s) => {
      try {
        const url = new URL(s.media_url);
        // URL format: .../storage/v1/object/public/stories/<path>
        const marker = "/object/public/stories/";
        const idx = url.pathname.indexOf(marker);
        return idx !== -1 ? url.pathname.slice(idx + marker.length) : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as string[];

  if (storagePaths.length) {
    await supabase.storage.from("stories").remove(storagePaths);
  }

  // Delete expired DB rows
  const { error: delErr } = await supabase
    .from("stories")
    .delete()
    .lt("expires_at", new Date().toISOString());

  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ deleted: expired.length, filesRemoved: storagePaths.length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
