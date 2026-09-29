-- Auto-create a public.profiles row whenever a new user is created in
-- Supabase Auth. Without this, any user created directly in the Auth
-- dashboard (there is no sign-up flow yet) has no matching profiles
-- row, and every insert into customers/submissions fails with a
-- foreign key violation on partner_id (profiles.id).
--
-- Pattern per Supabase docs: https://supabase.com/docs/guides/auth/managing-user-data

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
