-- ============================================================
-- 004_security_hardening.sql
-- 1. Enforce IDOR protection on upsert_rsvp: verify phone ownership when updating
-- 2. Validate travel_number length
-- ============================================================

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
  v_existing_phone text;
begin
  -- Input validation
  if char_length(p_name) < 1 or char_length(p_name) > 60 then
    raise exception 'Invalid name length';
  end if;
  if p_phone !~ '^[0-9]{10}$' then
    raise exception 'Invalid phone format';
  end if;
  if p_attending not in ('yes', 'no') then
    raise exception 'Invalid attending status';
  end if;
  if p_travel_number is not null and char_length(p_travel_number) > 40 then
    raise exception 'Invalid travel number length';
  end if;

  if p_id is not null then
    -- Check if record exists
    select phone into v_existing_phone from public.rsvps where id = p_id;

    if v_existing_phone is not null then
      -- Security Guard (IDOR prevention): phone number must match the existing record
      if v_existing_phone != p_phone then
        raise exception 'Unauthorized RSVP update: phone number mismatch' using errcode = '42501';
      end if;

      update public.rsvps
      set name = p_name,
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
      where id = p_id and phone = p_phone
      returning id into v_id;

      return v_id;
    end if;
  end if;

  -- Initial insert: limit to max 3 RSVPs per phone number
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

  return v_id;
end;
$$;

grant execute on function public.upsert_rsvp(uuid, text, text, text, integer, integer, integer[], integer, text, text, text, text, boolean, integer) to anon, authenticated;
