import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Page Title & Reservation Link (Static Shell) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            本日営業状況
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled
            className="h-8 gap-1.5 bg-primary/70 text-xs text-primary-foreground shadow-xs cursor-default"
          >
            <CalendarDays className="size-3.5" />
            予約管理を開く
          </Button>
        </div>
      </div>

      {/* KPI Strip Skeleton */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-stone-200/80 bg-white p-3.5 text-sm shadow-xs dark:border-stone-800 dark:bg-stone-900 animate-pulse">
        <div className="h-6 w-24 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-7 w-32 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-7 w-28 rounded bg-amber-100/60 dark:bg-amber-950/30" />
        <div className="h-7 w-24 rounded bg-blue-100/60 dark:bg-blue-950/30" />
        <div className="h-7 w-24 rounded bg-emerald-100/60 dark:bg-emerald-950/30" />
      </div>

      {/* Table Cards Grid Skeleton */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">座席ステータス一覧</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-lg border border-stone-200/90 bg-white p-3.5 text-xs shadow-2xs dark:border-stone-800 dark:bg-stone-900 animate-pulse min-h-[160px]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-16 rounded bg-stone-200 dark:bg-stone-800" />
                  <div className="h-4 w-12 rounded bg-stone-200 dark:bg-stone-800" />
                </div>
                <div className="mt-3 h-14 rounded bg-stone-100 dark:bg-stone-800/60" />
              </div>
              <div className="mt-3 border-t border-stone-100 pt-2.5 dark:border-stone-800">
                <div className="h-3 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline View Skeleton */}
      <div className="pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
            タイムラインビュー
          </h2>
        </div>
        <div className="h-48 rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900 animate-pulse" />
      </div>
    </div>
  );
}
