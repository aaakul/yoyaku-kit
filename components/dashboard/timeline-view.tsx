"use client";

import { Calendar, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  addDays,
  formatDisplayTime,
  getTodayJst,
  RESERVATION_STATUS_CONFIG,
  type ReservationItem,
  type ReservationStatus,
} from "@/lib/utils";

export type { ReservationItem, ReservationStatus };

export interface TableInfo {
  id: string;
  name: string;
  capacity: number;
}

export interface TimelineViewProps {
  reservations: ReservationItem[];
  tables?: TableInfo[];
  currentDate: string;
  onDateChange: (date: string) => void;
  onSelectReservation: (reservation: ReservationItem) => void;
}

const DEFAULT_TABLES: TableInfo[] = [
  { id: "T-01", name: "T-01", capacity: 2 },
  { id: "T-02", name: "T-02", capacity: 2 },
  { id: "T-03", name: "T-03", capacity: 4 },
  { id: "T-04", name: "T-04", capacity: 4 },
  { id: "T-05", name: "T-05", capacity: 4 },
  { id: "T-06", name: "T-06", capacity: 6 },
  { id: "T-07", name: "T-07", capacity: 8 },
];

const START_HOUR = 11;
const END_HOUR = 26;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

export function formatTimelineHour(h: number): string {
  if (h < 24) {
    return `${h.toString().padStart(2, "0")}:00`;
  }
  if (h === 24) {
    return "24:00";
  }
  const nextHour = h - 24;
  return `翌${nextHour.toString().padStart(2, "0")}:00`;
}

export function computeTimelineSlotPosition(
  timeStr: string,
  startAt?: string,
  endAt?: string,
  startHour = START_HOUR,
  totalMinutes = TOTAL_MINUTES,
): { leftPercent: number; widthPercent: number } {
  const cleanTime = timeStr.replace(/^[^\d]*/, "");
  const [hStr, mStr] = cleanTime.split(":");
  const rawH = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  const h = rawH < 6 ? rawH + 24 : rawH;
  const startMinutes = (h - startHour) * 60 + m;

  const durationMinutes =
    startAt && endAt
      ? Math.max(
          15,
          Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / (60 * 1000)),
        )
      : 90;

  const leftPercent = Math.max(0, Math.min(100, (startMinutes / totalMinutes) * 100));
  const widthPercent = Math.max(
    1,
    Math.min(100 - leftPercent, (durationMinutes / totalMinutes) * 100),
  );

  return { leftPercent, widthPercent };
}

export function TimelineView({
  reservations,
  tables: initialTablesProp,
  currentDate,
  onDateChange,
  onSelectReservation,
}: TimelineViewProps) {
  const hours = useMemo(() => {
    const list: string[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      list.push(formatTimelineHour(h));
    }
    return list;
  }, []);

  const dayReservations = useMemo(() => {
    return reservations.filter((r) => r.date === currentDate);
  }, [reservations, currentDate]);

  const tables = useMemo(() => {
    const tableMap = new Map<string, TableInfo>();

    if (initialTablesProp && initialTablesProp.length > 0) {
      initialTablesProp.forEach((t) => {
        tableMap.set(t.name, t);
      });
    } else {
      DEFAULT_TABLES.forEach((t) => {
        tableMap.set(t.name, t);
      });
    }

    dayReservations.forEach((r) => {
      const match = r.tableNumber.match(/^([A-Za-z0-9-]+)(?:\s*\(([0-9]+)名席\))?/);
      if (match) {
        const name = match[1];
        const capacity = match[2] ? parseInt(match[2], 10) : 2;
        if (!tableMap.has(name)) {
          tableMap.set(name, { id: name, name, capacity });
        }
      }
    });

    return Array.from(tableMap.values()).sort((a, b) => {
      if (a.capacity !== b.capacity) return a.capacity - b.capacity;
      return a.name.localeCompare(b.name);
    });
  }, [dayReservations, initialTablesProp]);

  const todayStr = useMemo(() => getTodayJst(), []);
  const minDate = useMemo(() => addDays(todayStr, -1), [todayStr]);
  const isPrevDisabled = currentDate <= minDate;

  const handlePrevDay = () => {
    const prevDate = addDays(currentDate, -1);
    if (prevDate >= minDate) {
      onDateChange(prevDate);
    }
  };

  const handleNextDay = () => {
    onDateChange(addDays(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(todayStr);
  };

  return (
    <div className="space-y-4">
      <Card className="border-stone-200/80 shadow-xs dark:border-stone-800">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handlePrevDay}
                disabled={isPrevDisabled}
                title="前日"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs font-medium"
                onClick={handleToday}
              >
                今日
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleNextDay}
                title="翌日"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-sm text-stone-900 dark:text-stone-100">
              <Calendar className="size-4 text-stone-400" />
              <span>{currentDate}</span>
              <span className="text-xs text-stone-400">
                (
                {
                  dayReservations.filter((r) => r.status !== "cancelled" && r.status !== "no_show")
                    .length
                }
                件予約)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-600" />
              <span>確定済み</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-sky-600" />
              <span>来店済み</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" />
              <span>保留中</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-stone-200/80 shadow-xs dark:border-stone-800 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px] pr-4">
            <div className="grid grid-cols-[140px_1fr] border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 text-xs">
              <div className="py-2.5 px-3 font-semibold text-stone-500 dark:text-stone-400 border-r border-stone-200 dark:border-stone-800 flex items-center gap-1.5">
                <Users className="size-3.5 text-stone-400" />
                <span>座席番号</span>
              </div>
              <div className="relative h-9 flex items-center">
                {hours.map((hour, idx) => {
                  const leftPercent = (idx / (hours.length - 1)) * 100;
                  return (
                    <div
                      key={hour}
                      className="absolute text-[11px] font-mono text-stone-600 dark:text-stone-300 transform -translate-x-1/2"
                      style={{ left: `${leftPercent}%` }}
                    >
                      {hour}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {tables.map((table) => {
                const tableRes = dayReservations.filter((r) => {
                  return (
                    r.tableNumber.startsWith(table.name) &&
                    r.status !== "cancelled" &&
                    r.status !== "no_show"
                  );
                });

                return (
                  <div
                    key={table.name}
                    className="grid grid-cols-[140px_1fr] h-14 hover:bg-stone-50/40 dark:hover:bg-stone-900/30 transition-colors"
                  >
                    <div className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 flex flex-col justify-center">
                      <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                        {table.name}
                      </div>
                      <div className="text-[10px] text-stone-600 dark:text-stone-400">
                        {table.capacity}名席
                      </div>
                    </div>

                    <div className="relative h-full">
                      {hours.map((hour, idx) => {
                        const leftPercent = (idx / (hours.length - 1)) * 100;
                        return (
                          <div
                            key={hour}
                            className="absolute top-0 bottom-0 border-l border-stone-100 dark:border-stone-800/80 pointer-events-none"
                            style={{ left: `${leftPercent}%` }}
                          />
                        );
                      })}

                      {tableRes.map((rsv) => {
                        const { leftPercent, widthPercent } = computeTimelineSlotPosition(
                          rsv.time,
                          rsv.startAt,
                          rsv.endAt,
                        );

                        const colorCfg = (
                          RESERVATION_STATUS_CONFIG[rsv.status] ||
                          RESERVATION_STATUS_CONFIG.confirmed
                        ).timeline;

                        const displayTime = formatDisplayTime(rsv.time);

                        return (
                          <button
                            key={rsv.id}
                            type="button"
                            onClick={() => onSelectReservation(rsv)}
                            className={`absolute top-1.5 bottom-1.5 rounded-md px-2 py-1 text-left shadow-xs transition-all z-10 overflow-hidden cursor-pointer ${colorCfg.bg} ${colorCfg.border} ${colorCfg.text}`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                            title={`${displayTime} ${rsv.customerName} (${rsv.partySize}名) - クリックで詳細表示`}
                          >
                            <div className="text-[11px] font-bold truncate leading-tight">
                              {displayTime} {rsv.customerName}
                            </div>
                            <div className="text-[9px] opacity-90 truncate">
                              {rsv.partySize}名様
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
