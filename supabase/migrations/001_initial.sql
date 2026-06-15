-- Perfis de usuário (estende auth.users do Supabase)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Trigger: cria perfil automaticamente ao registrar novo usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Módulos do curso
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_image_url text,
  order_index integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- Aulas dentro dos módulos
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text not null default '',
  youtube_url text,
  content_text text,
  order_index integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- Fotos de uma aula
create table public.lesson_photos (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- Progresso do membro
create table public.member_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_photos enable row level security;
alter table public.member_progress enable row level security;

-- profiles: usuário lê e edita apenas o próprio; admin lê todos
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_select_admin" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "profiles_update_admin" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- modules: membros ativos leem publicados; admin faz tudo
create policy "modules_select_member" on public.modules
  for select using (
    is_published = true and
    exists (select 1 from public.profiles where id = auth.uid() and active = true)
  );

create policy "modules_all_admin" on public.modules
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- lessons: membros ativos leem publicadas; admin faz tudo
create policy "lessons_select_member" on public.lessons
  for select using (
    is_published = true and
    exists (select 1 from public.profiles where id = auth.uid() and active = true)
  );

create policy "lessons_all_admin" on public.lessons
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- lesson_photos: membros ativos leem fotos de aulas publicadas; admin faz tudo
create policy "lesson_photos_select_member" on public.lesson_photos
  for select using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.is_published = true
    ) and
    exists (select 1 from public.profiles where id = auth.uid() and active = true)
  );

create policy "lesson_photos_all_admin" on public.lesson_photos
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- member_progress: membro lê e escreve apenas o próprio; admin lê tudo
create policy "progress_select_own" on public.member_progress
  for select using (auth.uid() = user_id);

create policy "progress_insert_own" on public.member_progress
  for insert with check (auth.uid() = user_id);

create policy "progress_delete_own" on public.member_progress
  for delete using (auth.uid() = user_id);

create policy "progress_select_admin" on public.member_progress
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =====================
-- STORAGE
-- =====================

-- Bucket para fotos das aulas (crie manualmente no Supabase Dashboard: "lesson-photos", public)
