-- Sanoq online account, unique username and per-account statistics.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own"
  on public.user_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own"
  on public.user_data for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own"
  on public.user_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own"
  on public.user_data for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.handle_new_sanoq_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_username text;
  requested_name text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', 'Sanoq foydalanuvchisi'));

  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'username_format_invalid';
  end if;

  insert into public.profiles (id, username, full_name, email)
  values (new.id, requested_username, requested_name, lower(new.email));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sanoq on auth.users;
create trigger on_auth_user_created_sanoq
after insert on auth.users
for each row execute procedure public.handle_new_sanoq_user();

create or replace function public.lookup_email_by_username(p_username text)
returns text
language sql
stable
security definer set search_path = public
as $$
  select email
  from public.profiles
  where username = lower(trim(p_username))
  limit 1;
$$;

grant execute on function public.lookup_email_by_username(text) to anon, authenticated;
