-- =====================================================================
-- Mini-ATS: schema + RLS
-- Kör hela filen en gång i Supabase SQL Editor på en tom databas.
--
-- Säkerhetsmodell i korthet:
--   * Roll (admin/customer) sätts ENBART via app_metadata, som bara
--     service-role (Edge Function) kan skriva. user_metadata går att
--     sätta av vem som helst vid signup och används därför aldrig för roll.
--   * RLS på alla tabeller: kund ser bara sina egna rader, admin ser allt.
--   * Kolumnrättigheter: klienten kan inte ändra sin roll, inte skriva
--     ai_assessment och inte förfalska created_by/created_at.
--   * Stäng av publik signup: Authentication -> Sign In / Providers ->
--     "Allow new users to sign up" = av. Konton skapas bara av admin.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Typer
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'customer');

create type public.candidate_stage as enum (
  'applied', 'screening', 'interview', 'offer', 'hired', 'rejected'
);


-- ---------------------------------------------------------------------
-- 2. Tabeller
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'customer',
  full_name    text not null default '',
  company_name text,
  email        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  -- Kund sätter inget: default = inloggad användare.
  -- Admin skickar med customer_id när den skapar jobb åt en kund.
  customer_id uuid not null default auth.uid()
              references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.candidates (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null references public.jobs (id) on delete cascade,
  full_name      text not null check (char_length(full_name) between 1 and 200),
  email          text,
  phone          text,
  linkedin_url   text check (
                   linkedin_url is null
                   or linkedin_url ~* '^https?://([a-z0-9-]+\.)*linkedin\.com/'
                 ),
  cv_text        text,
  stage          public.candidate_stage not null default 'applied',
  -- Sorteringsordning inom en kanban-kolumn. Float så att ett kort kan
  -- läggas mellan två andra (snitt av grannarnas värden) utan omnumrering.
  position       double precision not null default 0,
  -- Skrivs bara av Edge Function (service role), se grants nedan.
  ai_assessment  jsonb,
  ai_assessed_at timestamptz,
  created_by     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index jobs_customer_id_idx       on public.jobs (customer_id);
create index candidates_job_id_idx      on public.candidates (job_id);
create index candidates_board_order_idx on public.candidates (job_id, stage, position);


-- ---------------------------------------------------------------------
-- 3. Hjälpfunktioner för RLS
--    security definer + tom search_path: läser profiles/jobs utan att
--    trigga RLS rekursivt, och kan inte kapas via search_path.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.can_access_job(p_job_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and (j.customer_id = (select auth.uid()) or public.is_admin())
  );
$$;

revoke execute on function public.is_admin()            from public, anon;
revoke execute on function public.can_access_job(uuid)  from public, anon;
grant  execute on function public.is_admin()            to authenticated;
grant  execute on function public.can_access_job(uuid)  to authenticated;


-- ---------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------

-- 4a. Skapa profil automatiskt när en auth-användare skapas.
--     Rollen läses från app_metadata (bara service role kan sätta den).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, company_name, email)
  values (
    new.id,
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'customer'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'company_name',
    new.email
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();



-- 4c. Nollställ AI-bedömningen när CV-texten ändras, så att ett gammalt betyg
--     aldrig visas för ett nytt CV. Körs bara när cv_text finns med i UPDATE
--     och bara om texten faktiskt ändrats (flytt på kanban påverkar inte).
create or replace function public.reset_ai_assessment_on_cv_change()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.cv_text is distinct from old.cv_text then
    new.ai_assessment := null;
    new.ai_assessed_at := null;
  end if;
  return new;
end;
$$;

create trigger candidates_reset_ai_on_cv_change
  before update of cv_text on public.candidates
  for each row execute function public.reset_ai_assessment_on_cv_change();

  

-- 4b. updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at   before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger jobs_updated_at       before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger candidates_updated_at before update on public.candidates
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 5. Rättigheter (tabell- och kolumnnivå)
--    Allt sätts explicit, så det fungerar oavsett om projektet har
--    "Automatically expose new tables" på eller av.
--    RLS styr VILKA RADER, grants styr VILKA KOLUMNER.
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.jobs, public.candidates from anon, authenticated;

-- service_role (Edge Functions) behöver full åtkomst; den kringgår RLS.
grant all on public.profiles, public.jobs, public.candidates to service_role;

-- Läsa och radera: rader begränsas av RLS-policies nedan.
grant select         on public.profiles   to authenticated;
grant select, delete on public.jobs       to authenticated;
grant select, delete on public.candidates to authenticated;

-- profiles: skapas av trigger, tas bort via Edge Function.
-- Klienten får bara ändra namn. Roll kan ALDRIG ändras från klienten.
grant  update (full_name, company_name) on public.profiles to authenticated;

-- jobs
-- id får skickas med vid insert (klientgenererad UUID -> optimistisk UI), men aldrig ändras.
grant  insert (id, customer_id, title, description, status) on public.jobs to authenticated;
grant  update (customer_id, title, description, status) on public.jobs to authenticated;

-- candidates: ai_assessment/ai_assessed_at/created_by är skrivskyddade för klienten.
grant  insert (id, job_id, full_name, email, phone, linkedin_url, cv_text, stage, position)
  on public.candidates to authenticated;
grant  update (job_id, full_name, email, phone, linkedin_url, cv_text, stage, position)
  on public.candidates to authenticated;


-- ---------------------------------------------------------------------
-- 6. Row Level Security
--    (select ...) runt auth.uid()/is_admin() gör att Postgres räknar ut
--    värdet en gång per query i stället för en gång per rad.
-- ---------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.jobs       enable row level security;
alter table public.candidates enable row level security;

-- profiles --------------------------------------------------------------
create policy "profiles: read own or admin reads all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles: update own or admin updates all"
  on public.profiles for update to authenticated
  using      (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- jobs ------------------------------------------------------------------
create policy "jobs: read own or admin"
  on public.jobs for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

create policy "jobs: create own or admin on behalf"
  on public.jobs for insert to authenticated
  with check (customer_id = (select auth.uid()) or (select public.is_admin()));

create policy "jobs: update own or admin"
  on public.jobs for update to authenticated
  using      (customer_id = (select auth.uid()) or (select public.is_admin()))
  with check (customer_id = (select auth.uid()) or (select public.is_admin()));

create policy "jobs: delete own or admin"
  on public.jobs for delete to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

-- candidates: åtkomst ärvs från jobbet --------------------------------
create policy "candidates: read via job"
  on public.candidates for select to authenticated
  using (public.can_access_job(job_id));

create policy "candidates: create via job"
  on public.candidates for insert to authenticated
  with check (public.can_access_job(job_id));

-- with check stoppar att en kandidat flyttas till någon annans jobb.
create policy "candidates: update via job"
  on public.candidates for update to authenticated
  using      (public.can_access_job(job_id))
  with check (public.can_access_job(job_id));

create policy "candidates: delete via job"
  on public.candidates for delete to authenticated
  using (public.can_access_job(job_id));


-- ---------------------------------------------------------------------
-- 7. (Valfritt) Realtime för kanban-tavlan
-- ---------------------------------------------------------------------
-- alter publication supabase_realtime add table public.candidates;


-- ---------------------------------------------------------------------
-- 8. Första admin (engångssteg)
--    1) Authentication -> Users -> Add user (email + lösenord, auto-confirm)
--    2) Kör nedan med rätt e-post. Därefter skapas alla konton via
--       Edge Function (auth.admin.createUser med app_metadata.role).
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'din@epost.se';
-- update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
--   where email = 'din@epost.se';
