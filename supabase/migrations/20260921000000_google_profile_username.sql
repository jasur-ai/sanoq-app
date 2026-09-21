-- Allow Google OAuth users to receive a valid unique username automatically.
-- Existing email/username signups are unchanged.
create or replace function public.handle_new_sanoq_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  requested_username text;
  requested_name text;
  suffix integer := 0;
  candidate text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'Sanoq foydalanuvchisi'));

  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    base_username := lower(regexp_replace(split_part(coalesce(new.email, 'sanoq_user'), '@', 1), '[^a-z0-9_]+', '_', 'g'));
    base_username := trim(both '_' from base_username);
    if length(base_username) < 3 then base_username := 'user'; end if;
    base_username := left(base_username, 16);
    candidate := base_username;
    while exists (select 1 from public.profiles where username = candidate) loop
      suffix := suffix + 1;
      candidate := left(base_username, greatest(1, 24 - length(suffix::text) - 1)) || '_' || suffix::text;
    end loop;
    requested_username := candidate;
  end if;

  insert into public.profiles (id, username, full_name, email)
  values (new.id, requested_username, requested_name, lower(new.email));

  return new;
end;
$$;
