// Edge Function: skapar ett konto (admin eller kund).
// Säkerhet:
//  - Endast inloggade admins får anropa (kontrolleras här, inte i frontend).
//  - Secret/service-role-nyckeln finns bara här, på servern, och lämnar aldrig Supabase.
//  - Rollen sätts i app_metadata, som klienter inte kan ändra själva.
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

function getServiceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const key = keys.default ?? Object.values(keys)[0];
  if (!key) throw new Error("Ingen service-nyckel konfigurerad");
  return key as string;
}

const ROLES = ["admin", "customer"] as const;
type Role = (typeof ROLES)[number];

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
  if (caller?.role !== "admin") return json({ error: "Endast admin får skapa konton." }, 403);

  // 3. Validera indata.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig JSON." }, 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const fullName = String(body.full_name ?? "").trim();
  const companyName = String(body.company_name ?? "").trim() || null;
  const role = String(body.role ?? "customer") as Role;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Ogiltig e-postadress." }, 400);
  if (password.length < 8) return json({ error: "Lösenordet måste vara minst 8 tecken." }, 400);
  if (!fullName) return json({ error: "Namn krävs." }, 400);
  if (!ROLES.includes(role)) return json({ error: "Ogiltig roll." }, 400);

  // 4. Skapa kontot. Triggern handle_new_user skapar profilen automatiskt.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, company_name: companyName },
    app_metadata: { role },
  });

  if (error) {
    const status = error.code === "email_exists" ? 409 : 400;
    const message = status === 409 ? "Det finns redan ett konto med den e-posten." : error.message;
    return json({ error: message }, status);
  }

  return json({ id: data.user.id, email, role }, 201);
});