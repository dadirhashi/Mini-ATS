// Edge Function: raderar ett konto (admin eller kund).
// Säkerhet:
//  - Endast inloggade admins får anropa (kontrolleras här, inte i frontend).
//  - En admin kan inte radera sig själv, så det finns alltid minst en admin kvar.
//  - Databasen kaskaderar: auth-användare → profil → jobb → kandidater.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Fungerar både med äldre (service_role) och nyare (sb_secret_...) nyckelsystem.
function getServiceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const key = keys.default ?? Object.values(keys)[0];
  if (!key) throw new Error("Ingen service-nyckel konfigurerad");
  return key as string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Vem anropar? Verifiera token mot Supabase Auth.
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Inte inloggad." }, 401);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Ogiltig session." }, 401);

  // 2. Är anroparen admin? Läs rollen från databasen, lita aldrig på klienten.
  const { data: caller } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (caller?.role !== "admin") return json({ error: "Endast admin får radera konton." }, 403);

  // 3. Vilket konto?
  let userId = "";
  try {
    userId = String((await req.json()).user_id ?? "");
  } catch {
    return json({ error: "Ogiltig JSON." }, 400);
  }
  if (!UUID_RE.test(userId)) return json({ error: "Ogiltigt konto-id." }, 400);
  if (userId === userData.user.id) {
    return json({ error: "Du kan inte radera ditt eget konto." }, 400);
  }

  // 4. Radera. Profil, jobb och kandidater försvinner via on delete cascade.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    if (error.status === 404) return json({ error: "Kontot finns inte." }, 404);
    console.error("deleteUser:", error.message);
    return json({ error: "Kunde inte radera kontot." }, 500);
  }

  return json({ id: userId });
});