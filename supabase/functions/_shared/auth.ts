import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

export async function requireAdminOrAnalyst(req: Request): Promise<
  { authorized: true; userId: string } | { authorized: false; response: Response }
> {
  const authHeader = req.headers.get("Authorization");

  // 1. BYPASS: Allow Service Role Key (for Cron jobs and CLI testing)
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (authHeader === `Bearer ${serviceRoleKey}`) {
    return { authorized: true, userId: "system" };
  }

  if (!authHeader) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    };
  }

  // 2. Standard User Role Check (Keep your existing logic below)
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await anonClient.auth.getUser();
  if (userError || !user) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    };
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roleData } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleData || !["admin", "analyst"].includes(roleData.role)) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    };
  }

  return { authorized: true, userId: user.id };
}