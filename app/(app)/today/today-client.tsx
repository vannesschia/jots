"use client";

import Image from "next/image";
import Link from "next/link";
import { Popover } from "@base-ui/react";
import { Bell, CalendarFold, SquarePen, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

import { DateRail } from "@/components/entries/date-rail";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  getDateRange,
  getTodayLocalDate,
  isValidLocalDate,
  parseLocalDate,
  toLocalDateString,
  formatFullDate,
} from "@/lib/entries/dates";
import { getInitials } from "@/lib/onboarding/validation";
import { Profile } from "@/lib/profile/types";

const entries = [
  { local_date: "2026-06-09" },
  { local_date: "2026-06-10" },
  { local_date: "2026-06-12" },
];

const CALENDAR_DAYS_BEFORE = 14;
const CALENDAR_DAYS_AFTER = 7;

type TodayClientProps = {
  avatarUrl: string | null;
  displayName: string;
};

function getUrlDate(value: string | null, todayDate: string) {
  return value && isValidLocalDate(value) && value <= todayDate ? value : null;
}

function getVisibleDates(rangeAnchorDate: string | null, todayDate: string) {
  return getDateRange({
    centerDate: rangeAnchorDate ?? todayDate,
    daysBefore: CALENDAR_DAYS_BEFORE,
    daysAfter: CALENDAR_DAYS_AFTER,
    maxDate: todayDate,
  });
}

export default function TodayClient({ avatarUrl, displayName }: TodayClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [todayDate] = useState(getTodayLocalDate);
  const initialUrlDate = getUrlDate(searchParams.get("date"), todayDate);
  const selectedDate = initialUrlDate ?? todayDate;
  const [rangeState, setRangeState] = useState({
    calendarRangeAnchor: initialUrlDate,
    urlDate: initialUrlDate,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const entryDates = useMemo(() => {
    return new Set(entries.map((entry) => entry.local_date));
  }, []);

  if (rangeState.urlDate !== initialUrlDate) {
    const currentDates = getVisibleDates(
      rangeState.calendarRangeAnchor,
      todayDate,
    );
    const calendarRangeAnchor = initialUrlDate
      ? currentDates.includes(initialUrlDate)
        ? rangeState.calendarRangeAnchor
        : initialUrlDate
      : null;

    setRangeState({
      calendarRangeAnchor,
      urlDate: initialUrlDate,
    });
  }

  const calendarRangeAnchor = rangeState.calendarRangeAnchor;
  const rangeAnchorDate = calendarRangeAnchor ?? todayDate;
  const daysBefore = CALENDAR_DAYS_BEFORE;
  const daysAfter = CALENDAR_DAYS_AFTER;

  function selectDate(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", date);
    router.push(`/today?${params.toString()}`, { scroll: false });
  }

  function selectCalendarDate(date: Date) {
    const localDate = toLocalDateString(date);

    setRangeState((current) => ({
      ...current,
      calendarRangeAnchor: localDate,
    }));

    setCalendarOpen(false);
    selectDate(localDate);
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link className="font-serif text-xl font-bold text-brand" href="/today">
              <div
                aria-hidden="true"
                className="size-7 bg-foreground [mask:url('/pen-swirl.svg')_center/contain_no-repeat] [-webkit-mask:url('/pen-swirl.svg')_center/contain_no-repeat]"
              />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <nav aria-label="Primary" className="flex items-center gap-1">
              <Link
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                href="/"
              >
                <Bell className="size-6" />
              </Link>
              <Link
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                href="/journal"
              >
                <User className="size-6" />
              </Link>
              <Link
                aria-label="Open settings"
                className="flex size-8 mx-3 items-center justify-center overflow-hidden rounded-full text-sm font-medium hover:bg-muted"
                href="/settings"
              >
                {avatarUrl ? (
                  <Image
                    alt=""
                    className="size-full object-cover"
                    height={40}
                    src={avatarUrl}
                    unoptimized
                    width={40}
                  />
                ) : (
                  getInitials(displayName) // TODO: check that inital get displayed
                )}
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <section className="min-h-0 min-w-0 overflow-y-auto bg-surface p-4">
        <h1 className="mt-2 text-3xl font-medium italic font-serif tracking-tight">
          {formatFullDate(selectedDate)}
        </h1>
      </section>
      <section className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-2 sm:gap-4 bg-surface px-1 sm:px-4 py-4 shrink-0 border-t">
        <div className="flex shrink-0">
          <Popover.Root open={calendarOpen} onOpenChange={setCalendarOpen}>
            <Popover.Trigger
              aria-label="Choose date"
              render={
                <Button
                  className="h-full w-12"
                  size="icon-lg"
                  variant="ghost"
                />
              }
            >
              <CalendarFold className="size-6" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner
                align="start"
                className="z-50"
                sideOffset={8}
              >
                <Popover.Popup className="rounded-xl bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
                  <Calendar
                    disabled={{ after: parseLocalDate(todayDate) }}
                    endMonth={parseLocalDate(todayDate)}
                    mode="single"
                    onSelect={selectCalendarDate}
                    required
                    selected={parseLocalDate(selectedDate)}
                  />
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
        <div className="min-w-0">
          <DateRail
            className="w-full min-w-0"
            daysAfter={daysAfter}
            daysBefore={daysBefore}
            entryDates={entryDates}
            onSelectDate={selectDate}
            rangeAnchorDate={rangeAnchorDate}
            selectedDate={selectedDate}
            todayDate={todayDate}
          />
        </div>
        <div className="flex shrink-0">
          <Button
            aria-label="Create or edit journal entry"
            className="h-full w-12"
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <SquarePen className="size-6" />
          </Button>
        </div>
      </section>
    </div>
  );
}
