create or replace function public.accept_friend_request(request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.friend_requests%rowtype;
  user_low uuid;
  user_high uuid;
begin
  if current_user_id is null then
    return 'unauthenticated';
  end if;

  if request_id is null then
    return 'request_required';
  end if;

  select *
  into request_record
  from public.friend_requests
  where id = request_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if request_record.receiver_id <> current_user_id then
    return 'not_receiver';
  end if;

  if request_record.status <> 'pending' then
    return 'not_pending';
  end if;

  user_low := least(request_record.requester_id, request_record.receiver_id);
  user_high := greatest(request_record.requester_id, request_record.receiver_id);

  insert into public.friendships (user_low_id, user_high_id)
  values (user_low, user_high)
  on conflict (user_low_id, user_high_id) do nothing;

  update public.friend_requests
  set status = 'accepted'
  where id = request_record.id;

  return 'accepted';
end;
$$;

create or replace function public.decline_friend_request(request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.friend_requests%rowtype;
begin
  if current_user_id is null then
    return 'unauthenticated';
  end if;

  if request_id is null then
    return 'request_required';
  end if;

  select *
  into request_record
  from public.friend_requests
  where id = request_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if request_record.receiver_id <> current_user_id then
    return 'not_receiver';
  end if;

  if request_record.status <> 'pending' then
    return 'not_pending';
  end if;

  update public.friend_requests
  set status = 'declined'
  where id = request_record.id;

  return 'declined';
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.decline_friend_request(uuid) to authenticated;
