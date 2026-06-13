"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  formatDay,
  formatFullDate,
  formatWeekday,
  getDateRange,
} from "@/lib/entries/dates";

type LocalDate = string;

type DateRailProps = {
  selectedDate: LocalDate;
  rangeAnchorDate: LocalDate;
  todayDate: LocalDate;
  entryDates?: Set<LocalDate>;
  onSelectDate: (date: LocalDate) => void;

  daysBefore?: number;
  daysAfter?: number;

  minDate?: LocalDate;
  maxDate?: LocalDate;

  allowFutureDates?: boolean;
  className?: string;
};

export function DateRail({
  selectedDate,
  rangeAnchorDate,
  todayDate,
  entryDates = new Set(),
  onSelectDate,
  daysBefore = 13,
  daysAfter = 7,
  minDate,
  maxDate,
  allowFutureDates = false,
  className = "",
}: DateRailProps) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  const effectiveMaxDate = maxDate ?? (allowFutureDates ? undefined : todayDate);

  const dates = useMemo(
    () =>
      getDateRange({
        centerDate: rangeAnchorDate,
        daysBefore,
        daysAfter,
        minDate,
        maxDate: effectiveMaxDate,
      }),
    [
      daysAfter,
      daysBefore,
      effectiveMaxDate,
      minDate,
      rangeAnchorDate,
    ],
  );

  // console.log(dates)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedDate]);

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-6 bg-linear-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-6 bg-linear-to-l from-surface to-transparent" />

      <div className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-proximity px-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {dates.map((date) => {
          const isSelected = date === selectedDate;
          const isToday = date === todayDate;
          const hasEntry = entryDates.has(date);

          return (
            <button
              key={date}
              ref={isSelected ? selectedRef : null}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={formatFullDate(date)}
              className={[
                "relative flex min-w-14 shrink-0 snap-center flex-col items-center rounded-xl px-3 py-2 text-sm transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
                isToday && !isSelected ? "ring-2 ring-inset ring-border" : "",
              ].join(" ")}
            >
              <span className="text-xs">{formatWeekday(date)}</span>
              <span className="text-base font-medium">{formatDay(date)}</span>

              {hasEntry ? (
                <span className="mt-1 size-1 rounded-full bg-current opacity-70" />
              ) : <span className="mt-1 size-1 rounded-full bg-current opacity-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
