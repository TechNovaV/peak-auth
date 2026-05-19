-- ============================================================
--  02_posts.sql — Bảng posts + likes + RLS
--  Chạy SAU 01_profiles.sql (cần bảng profiles tồn tại trước)
-- ============================================================

-- ============================================================
--  1) BẢNG POSTS
-- ============================================================
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  content     text not null check (char_length(content) > 0 and char_length(content) <= 1000),
  created_at  timestamptz not null default now()
);

create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists posts_created_at_desc_idx on public.posts(created_at desc);

alter table public.posts enable row level security;

-- Policies posts
drop policy if exists "select_posts_all" on public.posts;
create policy "select_posts_all"
  on public.posts for select
  to authenticated using (true);

drop policy if exists "insert_own_post" on public.posts;
create policy "insert_own_post"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "delete_own_post" on public.posts;
create policy "delete_own_post"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

-- ============================================================
--  2) BẢNG LIKES (junction many-to-many)
-- ============================================================
create table if not exists public.likes (
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists likes_post_id_idx on public.likes(post_id);
create index if not exists likes_user_id_idx on public.likes(user_id);

alter table public.likes enable row level security;

-- Policies likes
drop policy if exists "select_likes_all" on public.likes;
create policy "select_likes_all"
  on public.likes for select
  to authenticated using (true);

drop policy if exists "insert_own_like" on public.likes;
create policy "insert_own_like"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "delete_own_like" on public.likes;
create policy "delete_own_like"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);
