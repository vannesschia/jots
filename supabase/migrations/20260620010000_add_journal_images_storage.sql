insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'journal-images',
  'journal-images',
  false,
  5242880,
  array['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authors and friends can read journal image objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'journal-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (
      (storage.foldername(name))[2] = 'published'
      and exists (
        select 1
        from public.friendships
        where (
          friendships.user_low_id = (select auth.uid())
          and friendships.user_high_id::text = (storage.foldername(name))[1]
        )
        or (
          friendships.user_high_id = (select auth.uid())
          and friendships.user_low_id::text = (storage.foldername(name))[1]
        )
      )
    )
  )
);

create policy "Authors can upload journal image objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Authors can update journal image objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Authors can delete journal image objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
