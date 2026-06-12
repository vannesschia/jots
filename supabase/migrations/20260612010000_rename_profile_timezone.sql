update public.profiles
set timezone = trim(timezone);

alter table public.profiles
  drop constraint if exists profiles_timezone_not_empty_check;

alter table public.profiles
  rename column timezone to preferred_timezone;

alter table public.profiles
  alter column preferred_timezone set default 'America/New_York',
  alter column preferred_timezone set not null,
  add constraint profiles_preferred_timezone_not_empty_check
    check (char_length(trim(preferred_timezone)) > 0);
