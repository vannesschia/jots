alter table public.profiles enable row level security;
alter table public.journal_entries enable row level security;
alter table public.comments enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

create policy "Authenticated users can read profiles"
on public.profiles for select to authenticated
using (true);

create policy "Users can create their own profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Authors can read their journal entries"
on public.journal_entries for select to authenticated
using ((select auth.uid()) = author_id);

create policy "Authors can create journal entries"
on public.journal_entries for insert to authenticated
with check ((select auth.uid()) = author_id);

create policy "Authors can update their journal entries"
on public.journal_entries for update to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

create policy "Authors can delete their journal entries"
on public.journal_entries for delete to authenticated
using ((select auth.uid()) = author_id);

create policy "Comment participants can read comments"
on public.comments for select to authenticated
using (
  (select auth.uid()) = author_id
  or exists (
    select 1
    from public.journal_entries
    where journal_entries.id = comments.entry_id
      and journal_entries.author_id = (select auth.uid())
  )
);

create policy "Authors can create comments on accessible entries"
on public.comments for insert to authenticated
with check (
  (select auth.uid()) = author_id
  and exists (
    select 1
    from public.journal_entries
    where journal_entries.id = comments.entry_id
      and journal_entries.author_id = (select auth.uid())
  )
);

create policy "Authors can update comments on accessible entries"
on public.comments for update to authenticated
using (
  (select auth.uid()) = author_id
  and exists (
    select 1
    from public.journal_entries
    where journal_entries.id = comments.entry_id
      and journal_entries.author_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = author_id
  and exists (
    select 1
    from public.journal_entries
    where journal_entries.id = comments.entry_id
      and journal_entries.author_id = (select auth.uid())
  )
);

create policy "Authors can delete comments on accessible entries"
on public.comments for delete to authenticated
using (
  (select auth.uid()) = author_id
  and exists (
    select 1
    from public.journal_entries
    where journal_entries.id = comments.entry_id
      and journal_entries.author_id = (select auth.uid())
  )
);

create policy "Participants can read friend requests"
on public.friend_requests for select to authenticated
using (
  (select auth.uid()) = requester_id
  or (select auth.uid()) = receiver_id
);

create policy "Users can create friend requests"
on public.friend_requests for insert to authenticated
with check (
  (select auth.uid()) = requester_id
  and requester_id <> receiver_id
);

create policy "Participants can read friendships"
on public.friendships for select to authenticated
using (
  (select auth.uid()) = user_low_id
  or (select auth.uid()) = user_high_id
);
