-- Forward-only: repair profiles missing before the auth.users insert trigger.
-- Role/status are database defaults, never OAuth metadata. Existing rows stay intact.
begin;
insert into public.profiles (id, email, display_name, avatar_url)
select u.id, coalesce(u.email, ''),
  left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(coalesce(u.email, ''), '@', 1)), 200),
  case when public.v2u_https_url(u.raw_user_meta_data ->> 'avatar_url') then u.raw_user_meta_data ->> 'avatar_url' end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
commit;
