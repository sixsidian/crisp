-- Supports the admin workflow: creating partner organizations, creating
-- users and assigning them to an organization, and reassigning existing
-- users. Also closes a defense-in-depth gap this work surfaced.
--
-- Run this whole script once against each Supabase project (crisp-dev,
-- then crisp-prod), same as 0002/0003/0004.

-- Forced password change on first login. Admin-created users get a
-- randomly generated temporary password (see app/admin/users/actions.ts)
-- shown once to the admin to relay out-of-band - not emailed. This flag
-- is checked in app/partner/layout.tsx and app/admin/layout.tsx and
-- redirects to /change-password until the user sets their own password,
-- which clears the flag itself (see app/change-password/page.tsx).
alter table public.profiles
  add column must_change_password boolean not null default false;

-- Defense in depth: "profiles: update own" (0001) only ever let a user
-- update their own row, so admin management of OTHER users' profiles
-- has so far only been possible through the service-role client (which
-- bypasses RLS) after an application-level admin check - see
-- lib/require-admin.ts. That's still what app/admin/users/actions.ts
-- uses. This policy just means an admin's own authenticated session can
-- also do it directly, consistent with every other table in this
-- schema (customers, submissions, reports, activity_log, partner_
-- organizations) already granting is_admin() a bypass. The existing
-- profiles_prevent_self_privilege_escalation trigger (0003) already
-- permits this: it only reverts role/partner_org_id changes when the
-- caller is authenticated and NOT an admin.
create policy "profiles: admin update" on public.profiles
  for update using (public.is_admin());
