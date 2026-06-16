create unique index if not exists unique_pending_friend_request_pair
  on public.friend_requests (
    least(requester_id, receiver_id),
    greatest(requester_id, receiver_id)
  )
  where status = 'pending';

create or replace function public.create_friend_request(target_user_id uuid)
returns text
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  user_low uuid;
  user_high uuid;
begin
  if current_user_id is null then
    return 'unauthenticated';
  end if;

  if target_user_id is null then
    return 'target_required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
  ) then
    return 'profile_required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
  ) then
    return 'target_not_found';
  end if;

  if current_user_id = target_user_id then
    return 'self_request';
  end if;

  user_low := least(current_user_id, target_user_id);
  user_high := greatest(current_user_id, target_user_id);

  if exists (
    select 1
    from public.friendships
    where user_low_id = user_low
      and user_high_id = user_high
  ) then
    return 'already_friends';
  end if;

  if exists (
    select 1
    from public.friend_requests
    where status = 'pending'
      and (
        (requester_id = current_user_id and receiver_id = target_user_id)
        or (requester_id = target_user_id and receiver_id = current_user_id)
      )
  ) then
    return 'pending_exists';
  end if;

  insert into public.friend_requests (requester_id, receiver_id)
  values (current_user_id, target_user_id);

  return 'created';
exception
  when unique_violation then
    return 'pending_exists';
  when foreign_key_violation then
    return 'target_not_found';
end;
$$;

grant execute on function public.create_friend_request(uuid) to authenticated;
