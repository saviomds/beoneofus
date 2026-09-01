import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create a client with the requesting user's authorization to verify they are an admin
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // 2. Verify the requesting user is an admin in the profiles table
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) throw new Error('Forbidden: Only administrators can impersonate users.')

    // 3. Extract the target userId from the request body
    const { userId: targetUserId } = await req.json()
    if (!targetUserId) throw new Error('Missing target userId')

    // 4. Create an Admin Client to bypass normal restrictions (using the Service Role key)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 5. Get the target user's email address
    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
    if (targetUserError) throw targetUserError
    if (!targetUser?.user?.email) throw new Error('Target user has no email address registered.')

    // 6. Generate a magic link for the target user (this returns an action_link URL without sending an email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email,
    })

    if (linkError) throw linkError

    // 7. Return the magic link to the frontend
    return new Response(
      JSON.stringify({ action_link: linkData.properties.action_link }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
