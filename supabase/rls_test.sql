-- =====================================================================
-- RLS-test för mini-ATS
-- Kör i Supabase SQL Editor EFTER schema.sql. Allt sker i en transaktion
-- som rullas tillbaka, så inget testdata blir kvar.
-- Om något brister avbryts skriptet med ett felmeddelande som börjar på FEL.
-- =====================================================================
begin;

-- Testdata (körs som postgres, dvs. förbi RLS)
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local',  '{"role":"admin"}', '{"full_name":"Test Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'kund-a@test.local', '{}',               '{"full_name":"Kund A"}'),
  ('00000000-0000-0000-0000-00000000000c', 'kund-b@test.local', '{}',               '{"full_name":"Kund B"}');

insert into public.jobs (id, customer_id, title) values
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Backendutvecklare (A)'),
  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Säljare (B)');

insert into public.candidates (id, job_id, full_name) values
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Anna Andersson'),
  ('20000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000c', 'Bertil Berg');

-- ---------------------------------------------------------------------
-- Som KUND A
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$
declare n int;
begin
  -- Läsning: bara eget
  assert (select count(*) from public.jobs) = 1,       'FEL: Kund A ser andras jobb';
  assert (select count(*) from public.candidates) = 1, 'FEL: Kund A ser andras kandidater';
  assert (select count(*) from public.profiles) = 1,   'FEL: Kund A ser andras profiler';

  -- Uppdatera B:s kandidat: ska påverka 0 rader
  update public.candidates set stage = 'hired'
    where id = '20000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  assert n = 0, 'FEL: Kund A kunde ändra B:s kandidat';

  -- Radera B:s jobb: ska påverka 0 rader
  delete from public.jobs where id = '10000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  assert n = 0, 'FEL: Kund A kunde radera B:s jobb';

  -- Lägga kandidat på B:s jobb: ska nekas
  begin
    insert into public.candidates (job_id, full_name)
      values ('10000000-0000-0000-0000-00000000000c', 'Intrång');
    raise exception 'FEL: Kund A kunde lägga kandidat på B:s jobb';
  exception when insufficient_privilege then null;
  end;

  -- Flytta egen kandidat till B:s jobb: ska nekas
  begin
    update public.candidates set job_id = '10000000-0000-0000-0000-00000000000c'
      where id = '20000000-0000-0000-0000-00000000000b';
    raise exception 'FEL: Kund A kunde flytta kandidat till B:s jobb';
  exception when insufficient_privilege then null;
  end;

  -- Skapa jobb i B:s namn: ska nekas
  begin
    insert into public.jobs (customer_id, title)
      values ('00000000-0000-0000-0000-00000000000c', 'Falskt jobb');
    raise exception 'FEL: Kund A kunde skapa jobb åt B';
  exception when insufficient_privilege then null;
  end;

  -- Göra sig själv till admin: ska nekas
  begin
    update public.profiles set role = 'admin'
      where id = '00000000-0000-0000-0000-00000000000b';
    raise exception 'FEL: Kund A kunde ändra sin roll';
  exception when insufficient_privilege then null;
  end;

  -- Skriva egen AI-bedömning: ska nekas
  begin
    update public.candidates set ai_assessment = '{"score":10}'
      where id = '20000000-0000-0000-0000-00000000000b';
    raise exception 'FEL: Kund A kunde skriva ai_assessment';
  exception when insufficient_privilege then null;
  end;

  -- Det som SKA fungera: skapa jobb, kandidat, flytta i kanban
  insert into public.jobs (title) values ('Nytt jobb A');
  insert into public.candidates (job_id, full_name, linkedin_url)
    values ('10000000-0000-0000-0000-00000000000b', 'Cecilia C', 'https://www.linkedin.com/in/cecilia');
  update public.candidates set stage = 'interview'
    where id = '20000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 1, 'FEL: Kund A kunde inte flytta egen kandidat';
end $$;

-- ---------------------------------------------------------------------
-- Som ADMIN
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare n int;
begin
  assert (select count(*) from public.profiles) = 3, 'FEL: Admin ser inte alla profiler';
  assert (select count(*) from public.jobs) = 3,     'FEL: Admin ser inte alla jobb';

  -- Admin skapar jobb och kandidat åt Kund B
  insert into public.jobs (id, customer_id, title)
    values ('10000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-00000000000c', 'Skapat av admin åt B');
  insert into public.candidates (job_id, full_name)
    values ('10000000-0000-0000-0000-0000000000cc', 'David D');

  update public.candidates set stage = 'offer'
    where id = '20000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  assert n = 1, 'FEL: Admin kunde inte flytta B:s kandidat';
end $$;

-- ---------------------------------------------------------------------
-- Som KUND B: ser nu adminskapat jobb, men inget av A:s
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.jobs) = 2,       'FEL: Kund B ser fel antal jobb';
  assert (select count(*) from public.candidates) = 2, 'FEL: Kund B ser fel antal kandidater';
  assert not exists (select 1 from public.jobs where title like '%(A)%'),
    'FEL: Kund B ser A:s jobb';
end $$;

-- ---------------------------------------------------------------------
-- Som ANONYM: ser ingenting
-- ---------------------------------------------------------------------
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.jobs;
    raise exception 'FEL: anon kan läsa jobs';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'Alla RLS-tester passerade ✅' as resultat;

rollback;
