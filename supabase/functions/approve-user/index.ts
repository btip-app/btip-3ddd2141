import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is an admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!callerRole || callerRole.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(
        JSON.stringify({ error: "requestId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the access request
    const { data: request, error: reqErr } = await supabaseAdmin
      .from("access_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !request) {
      return new Response(
        JSON.stringify({ error: "Access request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (request.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Request already ${request.status}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate temp password and create auth user
    const tempPassword = generateTempPassword();

    const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: request.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: request.full_name },
    });

    if (createErr) {
      return new Response(
        JSON.stringify({ error: "Failed to create user: " + createErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // The handle_new_user trigger creates profile + viewer role.
    // Now set the requested role if not viewer.
    const requestedRole = request.role_requested || "viewer";
    if (requestedRole !== "viewer") {
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .update({ role: requestedRole })
        .eq("user_id", userId);

      if (roleErr) {
        console.error("Role update failed:", roleErr);
      }
    }

    // Update the profile with organization if provided
    if (request.organization) {
      await supabaseAdmin
        .from("profiles")
        .update({ organization: request.organization })
        .eq("user_id", userId);
    }

    // Mark request as approved
    await supabaseAdmin
      .from("access_requests")
      .update({
        status: "approved",
        reviewed_by: caller.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return new Response(
      JSON.stringify({
        success: true,
        email: request.email,
        role: requestedRole,
        tempPassword,
        message: `Account created for ${request.email} with role "${requestedRole}". Share the temporary password securely.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
