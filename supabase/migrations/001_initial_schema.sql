-- ============================================================
-- Wedding Site — Supabase Migration 001
-- Manisha & Atul Wedding (16 November 2026)
-- Maximum expected guests: ~500
-- ============================================================

-- ============================================================
-- 1. WISHES / GUESTBOOK
-- ============================================================
create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  message     text not null,
  badge       text not null default 'ash',
  likes       integer not null default 0,
  created_at  timestamptz not null default now(),

  constraint wishes_name_length   check (char_length(name) between 1 and 40),
  constraint wishes_city_length   check (city is null or char_length(city) <= 40),
  constraint wishes_msg_length    check (char_length(message) between 1 and 240),
  constraint wishes_badge_valid   check (badge in ('ash','shub','love','bad')),
  constraint wishes_likes_valid   check (likes >= 0 and likes <= 100000)
);

create index if not exists wishes_created_at_idx on public.wishes (created_at desc);

-- ============================================================
-- 2. DIYAS (floating candles — public)
-- ============================================================
create table if not exists public.diyas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),

  constraint diyas_name_length check (char_length(name) between 1 and 24)
);

create index if not exists diyas_created_at_idx on public.diyas (created_at desc);

-- ============================================================
-- 3. SONGS (jukebox requests — public)
-- ============================================================
create table if not exists public.songs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  artist        text,
  requested_by  text,
  votes         integer not null default 1,
  created_at    timestamptz not null default now(),

  constraint songs_title_length  check (char_length(title) between 1 and 60),
  constraint songs_artist_length check (artist is null or char_length(artist) <= 40),
  constraint songs_by_length     check (requested_by is null or char_length(requested_by) <= 30),
  constraint songs_votes_valid   check (votes >= 0 and votes <= 100000)
);

create index if not exists songs_votes_idx on public.songs (votes desc, created_at asc);

-- ============================================================
-- 4. RSVP (private — host-only read)
-- ============================================================
create table if not exists public.rsvps (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  phone               text not null,
  attending           text not null,
  member_count        integer not null default 1,
  member_count_exact  integer,
  days                integer[],
  arrival_date        integer,
  arrival_slot        text,
  arrival_time        text,
  travel_mode         text,
  wa_group_joined     boolean not null default false,
  wa_group_count      integer default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint rsvps_name_length     check (char_length(name) between 1 and 60),
  constraint rsvps_phone_format    check (phone ~ '^[0-9]{10}$'),
  constraint rsvps_attending_valid check (attending in ('yes','no')),
  constraint rsvps_member_count    check (member_count >= 0 and member_count <= 300),
  constraint rsvps_arrival_date    check (arrival_date is null or arrival_date between 11 and 16),
  constraint rsvps_arrival_slot    check (arrival_slot is null or arrival_slot in ('morning','afternoon','evening','night')),
  constraint rsvps_travel_mode     check (travel_mode is null or travel_mode in ('train','flight','car','bus')),
  constraint rsvps_days_valid      check (days is null or days <@ array[12,13,15,16])
);

create index if not exists rsvps_phone_idx on public.rsvps (phone);

-- Enforce maximum 3 RSVPs per phone number
create or replace function public.check_rsvp_phone_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.rsvps where phone = new.phone) >= 3 then
    raise exception 'Phone number % already has 3 RSVP records (maximum allowed)', new.phone
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists rsvps_phone_limit on public.rsvps;
create trigger rsvps_phone_limit
  before insert on public.rsvps
  for each row execute function public.check_rsvp_phone_limit();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rsvps_updated_at on public.rsvps;
create trigger rsvps_updated_at
  before update on public.rsvps
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. PUSHP COUNTER (singleton shared petal counter)
-- ============================================================
create table if not exists public.pushp_counter (
  id    integer primary key default 1,
  count integer not null default 0,
  constraint pushp_counter_singleton check (id = 1),
  constraint pushp_count_valid check (count >= 0)
);

insert into public.pushp_counter (id, count)
  values (1, 0)
  on conflict (id) do nothing;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

alter table public.wishes         enable row level security;
alter table public.diyas          enable row level security;
alter table public.songs          enable row level security;
alter table public.rsvps          enable row level security;
alter table public.pushp_counter  enable row level security;

-- Drop existing policies if any
drop policy if exists "wishes_anon_insert" on public.wishes;
drop policy if exists "wishes_anon_select" on public.wishes;
drop policy if exists "wishes_auth_all"    on public.wishes;

drop policy if exists "diyas_anon_select"  on public.diyas;
drop policy if exists "diyas_anon_insert"  on public.diyas;
drop policy if exists "diyas_auth_all"     on public.diyas;

drop policy if exists "songs_anon_select"  on public.songs;
drop policy if exists "songs_anon_insert"  on public.songs;
drop policy if exists "songs_auth_all"     on public.songs;

drop policy if exists "rsvps_anon_insert"  on public.rsvps;
drop policy if exists "rsvps_auth_select"  on public.rsvps;
drop policy if exists "rsvps_auth_all"     on public.rsvps;

drop policy if exists "pushp_anon_select"  on public.pushp_counter;
drop policy if exists "pushp_auth_all"     on public.pushp_counter;

-- ---- WISHES policies ----
-- Public can submit blessings/wishes
create policy "wishes_anon_insert" on public.wishes
  for insert to anon with check (
    char_length(name) between 1 and 40
    and char_length(message) between 1 and 240
    and badge in ('ash','shub','love','bad')
    and (city is null or char_length(city) <= 40)
  );

-- Host authenticated has full access
create policy "wishes_auth_all" on public.wishes
  for all to authenticated using (true) with check (true);

-- ---- DIYAS policies (public) ----
create policy "diyas_anon_select" on public.diyas
  for select to anon using (true);

create policy "diyas_anon_insert" on public.diyas
  for insert to anon with check (
    char_length(name) between 1 and 24
  );

create policy "diyas_auth_all" on public.diyas
  for all to authenticated using (true) with check (true);

-- ---- SONGS policies (public) ----
create policy "songs_anon_select" on public.songs
  for select to anon using (true);

create policy "songs_anon_insert" on public.songs
  for insert to anon with check (
    char_length(title) between 1 and 60
    and (artist is null or char_length(artist) <= 40)
    and (requested_by is null or char_length(requested_by) <= 30)
  );

create policy "songs_auth_all" on public.songs
  for all to authenticated using (true) with check (true);

-- ---- RSVP policies (private — no anon select!) ----
create policy "rsvps_anon_insert" on public.rsvps
  for insert to anon with check (
    char_length(name) between 1 and 60
    and phone ~ '^[0-9]{10}$'
    and attending in ('yes','no')
  );

create policy "rsvps_auth_all" on public.rsvps
  for all to authenticated using (true) with check (true);

-- ---- PUSHP COUNTER policies (public read) ----
create policy "pushp_anon_select" on public.pushp_counter
  for select to anon using (true);

create policy "pushp_auth_all" on public.pushp_counter
  for all to authenticated using (true) with check (true);

-- ============================================================
-- 7. SECURE RPC FUNCTIONS
-- ============================================================

-- Atomically increment/decrement wish likes
create or replace function public.increment_likes(wish_id uuid, delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_val integer;
begin
  if delta not in (1, -1) then
    raise exception 'delta must be 1 or -1';
  end if;
  update public.wishes
    set likes = greatest(0, likes + delta)
    where id = wish_id
    returning likes into new_val;
  return coalesce(new_val, 0);
end;
$$;
grant execute on function public.increment_likes(uuid, integer) to anon, authenticated;

-- Atomically increment/decrement song votes
create or replace function public.vote_song(song_id uuid, delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_val integer;
begin
  if delta not in (1, -1) then
    raise exception 'delta must be 1 or -1';
  end if;
  update public.songs
    set votes = greatest(0, votes + delta)
    where id = song_id
    returning votes into new_val;
  return coalesce(new_val, 0);
end;
$$;
grant execute on function public.vote_song(uuid, integer) to anon, authenticated;

-- Atomically increment pushp petal shower counter (max +50 per call)
create or replace function public.increment_pushp(delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_val integer;
begin
  if delta < 1 or delta > 50 then
    raise exception 'delta must be between 1 and 50';
  end if;
  update public.pushp_counter
    set count = count + delta
    where id = 1
    returning count into new_val;
  return coalesce(new_val, 0);
end;
$$;
grant execute on function public.increment_pushp(integer) to anon, authenticated;

-- Host passcode verification
create or replace function public.host_verify_passcode(passcode text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select passcode = 'Yogesh@2026';
$$;
grant execute on function public.host_verify_passcode(text) to anon, authenticated;

-- Host get all RSVPs (securely guarded by passcode)
create or replace function public.host_get_rsvps(passcode text)
returns table (
  id uuid,
  name text,
  phone text,
  attending text,
  member_count integer,
  member_count_exact integer,
  days integer[],
  arrival_date integer,
  arrival_slot text,
  arrival_time text,
  travel_mode text,
  wa_group_joined boolean,
  wa_group_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if passcode != 'Yogesh@2026' then
    raise exception 'Unauthorized: invalid passcode' using errcode = '42501';
  end if;
  return query
    select r.id, r.name, r.phone, r.attending, r.member_count, r.member_count_exact,
           r.days, r.arrival_date, r.arrival_slot, r.arrival_time, r.travel_mode,
           r.wa_group_joined, r.wa_group_count, r.created_at, r.updated_at
    from public.rsvps r
    order by r.created_at desc;
end;
$$;
grant execute on function public.host_get_rsvps(text) to anon, authenticated;

-- Host get all guestbook wishes (securely guarded by passcode)
create or replace function public.host_get_wishes(passcode text)
returns table (
  id uuid,
  name text,
  city text,
  message text,
  badge text,
  likes integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if passcode != 'Yogesh@2026' then
    raise exception 'Unauthorized: invalid passcode' using errcode = '42501';
  end if;
  return query
    select w.id, w.name, w.city, w.message, w.badge, w.likes, w.created_at
    from public.wishes w
    order by w.created_at desc;
end;
$$;
grant execute on function public.host_get_wishes(text) to anon, authenticated;

-- ============================================================
-- 8. REALTIME REPLICATION
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table public.diyas, public.songs, public.pushp_counter;
exception when others then
  -- Ignore if already added
  null;
end;
$$;
