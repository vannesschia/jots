"use client";

import { Popover } from "@base-ui/react";
import { CalendarFold, SquarePen } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DateRail } from "@/components/entries/date-rail";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  getDateRange,
  getTodayLocalDate,
  isValidLocalDate,
  parseLocalDate,
  toLocalDateString,
} from "@/lib/entries/dates";

const entries = [
  { local_date: "2026-06-09" },
  { local_date: "2026-06-10" },
  { local_date: "2026-06-12" },
];

const CALENDAR_DAYS_BEFORE = 14;
const CALENDAR_DAYS_AFTER = 7;

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

export default function TodayPage() {
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
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
      <section className="min-h-0 min-w-0 overflow-y-auto bg-surface p-6">
        <p className="text-sm font-medium text-brand">Today</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          What do you want to remember?
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Your authenticated Jots workspace is ready.
        </p>
      </section>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-2 sm:gap-4 bg-surface px-1 sm:px-4 py-4 shrink-0 border-t">
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
      </div>
    </div>
  );
}
