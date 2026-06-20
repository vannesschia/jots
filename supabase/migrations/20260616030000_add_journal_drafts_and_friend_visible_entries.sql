alter table public.journal_entries
drop constraint if exists unique_daily_entry_per_group;

drop index if exists public.journal_entries_group_date_idx;

alter table public.journal_entries
drop column if exists group_id;

alter table public.journal_entries
add constraint unique_daily_entry_per_author unique (author_id, entry_date);

create table if not exists public.journal_entry_drafts (
  id uuid default gen_random_uuid() not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  content jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  entry_timezone text default 'UTC'::text not null,
  constraint journal_entry_drafts_pkey primary key (id),
  constraint unique_daily_draft_per_author unique (author_id, entry_date),
  constraint journal_entry_drafts_entry_timezone_not_empty check (length(trim(both from entry_timezone)) > 0)
);

create index if not exists journal_entry_drafts_author_date_idx
on public.journal_entry_drafts using btree (author_id, entry_date desc);

create or replace trigger set_journal_entry_drafts_updated_at
before update on public.journal_entry_drafts
for each row execute function public.set_updated_at();

alter table public.journal_entry_drafts enable row level security;

create policy "Authors can create journal entry drafts"
on public.journal_entry_drafts for insert to authenticated
with check ((select auth.uid()) = author_id);

create policy "Authors can delete their journal entry drafts"
on public.journal_entry_drafts for delete to authenticated
using ((select auth.uid()) = author_id);

create policy "Authors can read their journal entry drafts"
on public.journal_entry_drafts for select to authenticated
using ((select auth.uid()) = author_id);

create policy "Authors can update their journal entry drafts"
on public.journal_entry_drafts for update to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

drop policy if exists "Authors can read their journal entries"
on public.journal_entries;

create policy "Authors and friends can read journal entries"
on public.journal_entries for select to authenticated
using (
  (select auth.uid()) = author_id
  or exists (
    select 1
    from public.friendships
    where (
      friendships.user_low_id = (select auth.uid())
      and friendships.user_high_id = journal_entries.author_id
    )
    or (
      friendships.user_high_id = (select auth.uid())
      and friendships.user_low_id = journal_entries.author_id
    )
  )
);

grant all on table public.journal_entry_drafts to anon;
grant all on table public.journal_entry_drafts to authenticated;
grant all on table public.journal_entry_drafts to service_role;
