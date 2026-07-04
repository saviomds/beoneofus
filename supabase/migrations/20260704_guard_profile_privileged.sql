-- Close the profiles privilege-escalation hole.
--
-- The profiles UPDATE policy is `auth.uid() = id` with NO column scope, so any
-- authenticated user could write trust columns on their own row
-- (is_admin / is_verified / is_premium …). RLS can't restrict columns, so we use
-- a BEFORE UPDATE trigger that blocks changes to the privileged columns for any
-- request carrying a client JWT (authenticated / anon). The service role (server
-- APIs) and direct no-JWT superuser contexts (migrations, SQL editor) may still
-- write them. Request-flags (verification_status, premium_requested) stay
-- user-writable so the "request verification / premium" flows keep working.
--
-- Admin actions that legitimately set these columns now go through the
-- admin-gated /api/admin/user-flags endpoint (service role).

create or replace function public.guard_profile_privileged_cols()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role'),
    ''
  );
begin
  -- Server (service_role) or a direct no-JWT superuser context may change anything.
  if jwt_role = 'service_role'
     or (jwt_role = '' and current_user in
         ('service_role','postgres','supabase_admin','supabase_auth_admin'))
  then
    return new;
  end if;

  -- A client JWT (authenticated / anon) cannot change trust columns.
  if new.is_admin           is distinct from old.is_admin
  or new.role               is distinct from old.role
  or new.is_verified        is distinct from old.is_verified
  or new.is_premium         is distinct from old.is_premium
  or new.is_trial_premium   is distinct from old.is_trial_premium
  or new.premium_expires_at is distinct from old.premium_expires_at
  or new.is_suspended       is distinct from old.is_suspended
  then
    raise exception 'Not authorized to modify privileged profile fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileged on public.profiles;
create trigger trg_guard_profile_privileged
before update on public.profiles
for each row execute function public.guard_profile_privileged_cols();
