do $$
begin
  if exists (
    select lower(trim(username))
    from public.profiles
    group by lower(trim(username))
    having count(*) > 1
  ) then
    raise exception 'Cannot normalize profile usernames because case-insensitive duplicates exist';
  end if;
end
$$;

update public.profiles
set
  username = lower(trim(username)),
  display_name = trim(display_name),
  timezone = coalesce(nullif(trim(timezone), ''), 'UTC');

alter table public.profiles
  drop constraint profiles_username_key,
  alter column timezone set not null,
  add constraint profiles_username_format_check
    check (username ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_display_name_length_check
    check (char_length(display_name) between 1 and 50),
  add constraint profiles_timezone_not_empty_check
    check (char_length(trim(timezone)) > 0);

create unique index profiles_username_lower_key
  on public.profiles (lower(username));

create index profiles_username_lookup_idx
  on public.profiles (username);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read their avatar objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can upload their avatar objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete their avatar objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
