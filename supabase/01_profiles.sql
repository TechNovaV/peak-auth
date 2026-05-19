-- ============================================================
--  01_profiles.sql — Bảng profiles + RLS + Auto-trigger
--  Chạy trong Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) Tạo bảng profiles (1-1 với auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  full_name   text,
  avatar_url  text,
  bio         text,
  school      text,
  class       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) Bật Row Level Security
alter table public.profiles enable row level security;

-- 3) Policies

-- 3a. Authenticated user xem được mọi profile (cho search, hiện tên/avatar)
drop policy if exists "view_all_profiles" on public.profiles;
create policy "view_all_profiles"
  on public.profiles for select
  to authenticated using (true);

-- 3b. User chỉ insert profile có id = uid của mình
drop policy if exists "insert_own_profile" on public.profiles;
create policy "insert_own_profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- 3c. User chỉ update profile của mình
drop policy if exists "update_own_profile" on public.profiles;
create policy "update_own_profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4) Trigger tự tạo profile khi user đăng ký
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Trigger tự cập nhật updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 6) Backfill profiles cho user đã đăng ký trước khi có trigger
insert into public.profiles (id, full_name)
select id, raw_user_meta_data->>'full_name'
from auth.users
where id not in (select id from public.profiles);
