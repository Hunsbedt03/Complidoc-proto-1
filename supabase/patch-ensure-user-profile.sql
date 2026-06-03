-- Kjør i Supabase SQL Editor (fikser lagring når public.users-rad mangler / RLS 42501)

create or replace function public.ensure_user_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select email, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  into v_email, v_name
  from auth.users
  where id = auth.uid();
  insert into public.users (id, email, full_name)
  values (auth.uid(), coalesce(v_email, ''), v_name)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name);
end;
$$;

grant execute on function public.ensure_user_profile() to authenticated;

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
