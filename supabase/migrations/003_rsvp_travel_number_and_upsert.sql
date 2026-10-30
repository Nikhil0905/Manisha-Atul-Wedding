-- ============================================================
-- 003_rsvp_travel_number_and_upsert.sql
-- Add travel_number column to rsvps table
-- Provide upsert_rsvp RPC function to update existing RSVPs
-- Update host_get_rsvps RPC function to return travel_number
-- ============================================================

alter table public.rsvps add column if not exists travel_number text;

-- RPC to insert or update an RSVP record without duplicates
create or replace function public.upsert_rsvp(
  p_id uuid,
  p_name text,
  p_phone text,
  p_attending text,
  p_member_count integer,
  p_member_count_exact integer,
  p_days integer[],
  p_arrival_date integer,
  p_arrival_slot text,
  p_arrival_time text,
  p_travel_mode text,
  p_travel_number text,
  p_wa_group_joined boolean,
  p_wa_group_count integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if char_length(p_name) < 1 or char_length(p_name) > 60 then
    raise exception 'Invalid name length';
  end if;
  if p_phone !~ '^[0-9]{10}$' then
    raise exception 'Invalid phone format';
  end if;
  if p_attending not in ('yes', 'no') then
    raise exception 'Invalid attending status';
  end if;

  if p_id is not null and exists (select 1 from public.rsvps where id = p_id) then
    update public.rsvps
    set name = p_name,
        phone = p_phone,
        attending = p_attending,
        member_count = coalesce(p_member_count, 1),
        member_count_exact = p_member_count_exact,
        days = p_days,
        arrival_date = p_arrival_date,
        arrival_slot = p_arrival_slot,
        arrival_time = p_arrival_time,
        travel_mode = p_travel_mode,
        travel_number = p_travel_number,
        wa_group_joined = coalesce(p_wa_group_joined, false),
        wa_group_count = coalesce(p_wa_group_count, 0),
        updated_at = now()
    where id = p_id
    returning id into v_id;
  else
    if (select count(*) from public.rsvps where phone = p_phone) >= 3 then
      raise exception 'Phone number % already has 3 RSVP records (maximum allowed)', p_phone
        using errcode = 'P0001';
    end if;

    insert into public.rsvps (
      name, phone, attending, member_count, member_count_exact,
      days, arrival_date, arrival_slot, arrival_time, travel_mode, travel_number,
      wa_group_joined, wa_group_count
    ) values (
      p_name, p_phone, p_attending, coalesce(p_member_count, 1), p_member_count_exact,
      p_days, p_arrival_date, p_arrival_slot, p_arrival_time, p_travel_mode, p_travel_number,
      coalesce(p_wa_group_joined, false), coalesce(p_wa_group_count, 0)
    )
    returning id into v_id;
  end if;

  return v_id;
end;
$$;
grant execute on function public.upsert_rsvp(uuid, text, text, text, integer, integer, integer[], integer, text, text, text, text, boolean, integer) to anon, authenticated;

-- Update host_get_rsvps to include travel_number
drop function if exists public.host_get_rsvps(text);
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
  travel_number text,
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
           r.travel_number,
           r.wa_group_joined, r.wa_group_count, r.created_at, r.updated_at
    from public.rsvps r
    order by r.created_at desc;
end;
$$;
grant execute on function public.host_get_rsvps(text) to anon, authenticated;
