-- ============================================================
--  03_storage.sql — Bucket avatars + RLS policies
--  Chạy trong Supabase Dashboard → SQL Editor
-- ============================================================
--  Note: bucket "avatars" cũng có thể tạo qua Dashboard UI:
--    Storage → New bucket → name=avatars, public=true
--  File này tự động hóa cùng với việc set policies
-- ============================================================

-- 1) Tạo bucket avatars (public read)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Cho phép authenticated user upload vào folder tên = user.id của mình
drop policy if exists "avatars_authenticated_upload" on storage.objects;
create policy "avatars_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Cho phép update file của chính mình (upsert)
drop policy if exists "avatars_authenticated_update" on storage.objects;
create policy "avatars_authenticated_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) Cho phép xóa file của chính mình
drop policy if exists "avatars_authenticated_delete" on storage.objects;
create policy "avatars_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5) Cho mọi người (kể cả chưa login) đọc avatar — bucket đã set public=true
--    nên select policy không bắt buộc. Nếu muốn explicit:
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
