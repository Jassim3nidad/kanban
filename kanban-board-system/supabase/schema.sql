-- =========================================
-- Kanban Board System - Database Schema
-- Supabase (PostgreSQL) — Production Ready
-- =========================================

-- Drop existing tables if they exist to allow clean setups
drop table if exists public.shared_links cascade;
drop table if exists public.tasks cascade;
drop table if exists public.columns cascade;
drop table if exists public.board_members cascade;
drop table if exists public.boards cascade;
drop table if exists public.users cascade;

-- 1. USERS (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar not null,
  display_name varchar,
  role varchar not null check (role in ('member', 'admin')) default 'member',
  created_at timestamp default now()
);

-- 2. BOARDS
create table public.boards (
  board_id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete cascade not null,
  title varchar not null,
  created_at timestamp default now()
);

-- 3. BOARD_MEMBERS (internal users with direct role assignments)
create table public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.boards(board_id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role varchar not null check (role in ('viewer', 'editor', 'owner')),
  unique (board_id, user_id)
);

-- 4. COLUMNS (Backlog, To Do, In Progress, Review, Testing, Done)
create table public.columns (
  column_id uuid primary key default gen_random_uuid(),
  board_id uuid references public.boards(board_id) on delete cascade not null,
  title varchar not null,
  position int not null
);

-- 5. TASKS
create table public.tasks (
  task_id uuid primary key default gen_random_uuid(),
  column_id uuid references public.columns(column_id) on delete cascade not null,
  board_id uuid references public.boards(board_id) on delete cascade not null,
  title varchar not null,
  description text,
  position int not null default 0,
  tag varchar, -- e.g., 'Backend', 'Frontend'
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp default now()
);

-- 6. SHARED_LINKS (external guest access)
create table public.shared_links (
  link_id uuid primary key default gen_random_uuid(),
  board_id uuid references public.boards(board_id) on delete cascade not null,
  created_by uuid references public.users(id) on delete set null,
  permission_type varchar not null check (permission_type in ('viewer', 'editor')),
  token varchar unique not null,
  expiry_date timestamp,   -- null = no expiry
  is_active boolean default true not null,
  created_at timestamp default now()
);

-- =========================================
-- TRIGGERS FOR USER SYNC
-- =========================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync auth.users with public.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill any existing users in auth.users into public.users
insert into public.users (id, email, display_name, role)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', email),
  coalesce(raw_user_meta_data->>'role', 'member')
from auth.users
on conflict (id) do nothing;

-- =========================================
-- ROW-LEVEL SECURITY (RLS)
-- =========================================

alter table public.users enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.shared_links enable row level security;

-- 1. USERS POLICIES
create policy "Allow public read access to profiles"
  on public.users for select
  using (true);

create policy "Allow users to update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- 2. BOARDS POLICIES
create policy "Allow read access to boards based on membership or shared link"
  on public.boards for select
  using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.board_members
      where board_members.board_id = boards.board_id and board_members.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.shared_links
      where shared_links.board_id = boards.board_id and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
    )
  );

create policy "Allow owners to insert boards"
  on public.boards for insert
  with check (owner_id = auth.uid());

create policy "Allow owners, editors, and guest editors to update boards"
  on public.boards for update
  using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.board_members
      where board_members.board_id = boards.board_id and board_members.user_id = auth.uid() and board_members.role in ('editor', 'owner')
    ) or
    exists (
      select 1 from public.shared_links
      where shared_links.board_id = boards.board_id and shared_links.permission_type = 'editor' and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
    )
  );

create policy "Allow owners to delete boards"
  on public.boards for delete
  using (owner_id = auth.uid());

-- 3. BOARD MEMBERS POLICIES
create policy "Allow read access to board memberships"
  on public.board_members for select
  using (true);

create policy "Allow board owners to insert memberships"
  on public.board_members for insert
  with check (
    exists (
      select 1 from public.boards
      where boards.board_id = board_members.board_id and boards.owner_id = auth.uid()
    )
  );

create policy "Allow board owners to update memberships"
  on public.board_members for update
  using (
    exists (
      select 1 from public.boards
      where boards.board_id = board_members.board_id and boards.owner_id = auth.uid()
    )
  );

create policy "Allow board owners to delete memberships"
  on public.board_members for delete
  using (
    exists (
      select 1 from public.boards
      where boards.board_id = board_members.board_id and boards.owner_id = auth.uid()
    )
  );

-- 4. COLUMNS POLICIES
create policy "Allow read access to columns if user has access to board"
  on public.columns for select
  using (
    exists (
      select 1 from public.boards
      where boards.board_id = columns.board_id and (
        boards.owner_id = auth.uid() or
        exists (
          select 1 from public.board_members
          where board_members.board_id = columns.board_id and board_members.user_id = auth.uid()
        ) or
        exists (
          select 1 from public.shared_links
          where shared_links.board_id = columns.board_id and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
        )
      )
    )
  );

create policy "Allow insert access to columns if user has write access to board"
  on public.columns for insert
  with check (
    exists (
      select 1 from public.boards
      where boards.board_id = columns.board_id and (
        boards.owner_id = auth.uid() or
        exists (
          select 1 from public.board_members
          where board_members.board_id = columns.board_id and board_members.user_id = auth.uid() and board_members.role in ('editor', 'owner')
        ) or
        exists (
          select 1 from public.shared_links
          where shared_links.board_id = columns.board_id and shared_links.permission_type = 'editor' and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
        )
      )
    )
  );

create policy "Allow update access to columns if user has write access to board"
  on public.columns for update
  using (
    exists (
      select 1 from public.boards
      where boards.board_id = columns.board_id and (
        boards.owner_id = auth.uid() or
        exists (
          select 1 from public.board_members
          where board_members.board_id = columns.board_id and board_members.user_id = auth.uid() and board_members.role in ('editor', 'owner')
        ) or
        exists (
          select 1 from public.shared_links
          where shared_links.board_id = columns.board_id and shared_links.permission_type = 'editor' and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
        )
      )
    )
  );

create policy "Allow delete access to columns if user has write access to board"
  on public.columns for delete
  using (
    exists (
      select 1 from public.boards
      where boards.board_id = columns.board_id and (
        boards.owner_id = auth.uid() or
        exists (
          select 1 from public.board_members
          where board_members.board_id = columns.board_id and board_members.user_id = auth.uid() and board_members.role in ('editor', 'owner')
        ) or
        exists (
          select 1 from public.shared_links
          where shared_links.board_id = columns.board_id and shared_links.permission_type = 'editor' and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
        )
      )
    )
  );

-- 5. TASKS POLICIES
create policy "Allow read access to tasks if user has access to board"
  on public.tasks for select
  using (
    exists (
      select 1 from public.boards
      where boards.board_id = tasks.board_id and (
        boards.owner_id = auth.uid() or
        exists (
          select 1 from public.board_members
          where board_members.board_id = tasks.board_id and board_members.user_id = auth.uid()
        ) or
        exists (
          select 1 from public.shared_links
          where shared_links.board_id = tasks.board_id and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
        )
      )
    )
  );

create policy "Allow insert access to tasks if user has write access to board"
  on public.tasks for insert
  with check (
    exists (
      select 1 from public.boards
      where boards.board_id = tasks.board_id and (
        boards.owner_id = auth.uid() or
        exists (
          select 1 from public.board_members
          where board_members.board_id = tasks.board_id and board_members.user_id = auth.uid() and board_members.role in ('editor', 'owner')
        ) or
        exists (
          select 1 from public.shared_links
          where shared_links.board_id = tasks.board_id and shared_links.permission_type = 'editor' and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
        )
      )
    )
  );

create policy "Allow update access to tasks if user has write access to board"
  on public.tasks for update
  using (
    exists (
      select 1 from public.boards
      where boards.board_id = tasks.board_id and (
        boards.owner_id = auth.uid() or
        exists (
          select 1 from public.board_members
          where board_members.board_id = tasks.board_id and board_members.user_id = auth.uid() and board_members.role in ('editor', 'owner')
        ) or
        exists (
          select 1 from public.shared_links
          where shared_links.board_id = tasks.board_id and shared_links.permission_type = 'editor' and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
        )
      )
    )
  );

create policy "Allow delete access to tasks if user has write access to board"
  on public.tasks for delete
  using (
    exists (
      select 1 from public.boards
      where boards.board_id = tasks.board_id and (
        boards.owner_id = auth.uid() or
        exists (
          select 1 from public.board_members
          where board_members.board_id = tasks.board_id and board_members.user_id = auth.uid() and board_members.role in ('editor', 'owner')
        ) or
        exists (
          select 1 from public.shared_links
          where shared_links.board_id = tasks.board_id and shared_links.permission_type = 'editor' and shared_links.is_active = true and (shared_links.expiry_date is null or shared_links.expiry_date > now())
        )
      )
    )
  );

-- 6. SHARED LINKS POLICIES
create policy "Allow anyone to fetch active shared links, and creators to view theirs"
  on public.shared_links for select
  using (
    (is_active = true and (expiry_date is null or expiry_date > now())) or
    created_by = auth.uid()
  );

-- SECURITY DEFINER functions to break infinite recursion cycle between boards and shared_links
create or replace function public.is_board_owner_or_editor(board_uuid uuid)
returns boolean as $$
declare
  is_valid boolean;
begin
  select exists (
    select 1 from public.boards
    where board_id = board_uuid and (
      owner_id = auth.uid() or
      exists (
        select 1 from public.board_members
        where board_members.board_id = board_uuid and board_members.user_id = auth.uid() and board_members.role in ('editor', 'owner')
      )
    )
  ) into is_valid;
  return is_valid;
end;
$$ language plpgsql security definer;

create or replace function public.is_board_owner(board_uuid uuid)
returns boolean as $$
declare
  is_valid boolean;
begin
  select exists (
    select 1 from public.boards
    where board_id = board_uuid and owner_id = auth.uid()
  ) into is_valid;
  return is_valid;
end;
$$ language plpgsql security definer;

create policy "Allow owners and editors to generate shared links"
  on public.shared_links for insert
  with check (public.is_board_owner_or_editor(board_id));

create policy "Allow owners to update shared links"
  on public.shared_links for update
  using (public.is_board_owner(board_id));

create policy "Allow owners to delete shared links"
  on public.shared_links for delete
  using (public.is_board_owner(board_id));

-- =========================================
-- REALTIME SUBSCRIPTIONS
-- =========================================

-- Create supabase_realtime publication if not exists
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
exception
  when others then null;
end $$;

-- Safely add tables to the publication
do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.columns;
exception when others then null;
end $$;

-- Enable replica identity full for deletion event payloads in Realtime
alter table public.tasks replica identity full;
alter table public.columns replica identity full;

-- =========================================
-- ADMINISTRATOR BYPASS POLICIES
-- =========================================

create policy "Allow admins full access to boards" on public.boards for all using (
  exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
);

create policy "Allow admins full access to columns" on public.columns for all using (
  exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
);

create policy "Allow admins full access to tasks" on public.tasks for all using (
  exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
);

create policy "Allow admins full access to board_members" on public.board_members for all using (
  exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
);

create policy "Allow admins full access to shared_links" on public.shared_links for all using (
  exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
);

