-- Gives an existing account the consultant role. Change the email, then run.
-- The user must have signed up/in at least once so the profile row exists.
update public.profiles set role = 'consultant' where email = 'reviewer@example.com';
select email, role from public.profiles order by created_at desc limit 10;
