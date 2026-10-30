-- ============================================================
-- 002_wishes_public_read.sql
-- Enable public global read access to wishes guestbook & realtime
-- ============================================================

drop policy if exists "wishes_anon_select" on public.wishes;

create policy "wishes_anon_select" on public.wishes
  for select to anon using (true);

alter publication supabase_realtime add table public.wishes;
