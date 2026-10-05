"use client";

import { CalendarDays, CheckCircle2, Clock, Loader2, UserCheck, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TimelineView } from "@/components/dashboard/timeline-view";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchReservationsAction,
  fetchTablesAction,
  updateReservationStatusAction,
} from "@/lib/engine/reservation-actions";
import {
  addDays,
  formatDisplayTime,
  getTodayJst,
  mapDbReservation,
  type ReservationItem,
  type ReservationStatus,
} from "@/lib/utils";

export interface TableItem {
  id: string;
  name: string;
  type: string;
  capacity: number;
  active: boolean;
}

export type ComputedTableStatus = "vacant" | "waiting" | "in_use" | "inactive";

export interface TableOccupancy {
  table: TableItem;
  status: ComputedTableStatus;
  currentReservation?: ReservationItem;
  nextReservation?: ReservationItem;
}

const statusBadgeConfig: Record<ComputedTableStatus, { label: string; className: string }> = {
  vacant: {
    label: "空席",
    className:
      "bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
  },
  waiting: {
    label: "来店待ち",
    className:
      "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700",
  },
  in_use: {
    label: "利用中",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  inactive: {
    label: "休止中",
    className:
      "bg-stone-200/60 text-stone-400 border-stone-300 line-through dark:bg-stone-900 dark:text-stone-500 dark:border-stone-800",
  },
};

export default function OperationalDashboardPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [todayReservations, setTodayReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Timeline view state
  const [timelineDate, setTimelineDate] = useState(() => getTodayJst());
  const [timelineReservations, setTimelineReservations] = useState<ReservationItem[]>([]);
  const [selectedTimelineReservation, setSelectedTimelineReservation] =
    useState<ReservationItem | null>(null);

  const handleTimelineDateChange = (date: string) => {
    const todayStr = getTodayJst();
    const minDate = addDays(todayStr, -1);
    if (date >= minDate) {
      setTimelineDate(date);
    }
  };

  // Quick action confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    reservation: ReservationItem;
    targetStatus: ReservationStatus;
    actionLabel: string;
    description: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const todayStr = getTodayJst();

      const [dbTables, dbTodayReservations] = await Promise.all([
        fetchTablesAction(),
        fetchReservationsAction(todayStr),
      ]);

      setTables(
        dbTables.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type || "テーブル席",
          capacity: t.capacity,
          active: t.active,
        })),
      );

      const mappedToday = dbTodayReservations.map(mapDbReservation);
      setTodayReservations(mappedToday);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener("dashboard:refresh", handleRefresh);
    return () => window.removeEventListener("dashboard:refresh", handleRefresh);
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    const todayStr = getTodayJst();
    if (timelineDate === todayStr) {
      setTimelineReservations(todayReservations);
    } else {
      fetchReservationsAction(timelineDate).then((list) => {
        if (!cancelled) {
          setTimelineReservations(list.map(mapDbReservation));
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [timelineDate, todayReservations]);

  // Today Operational Core Metrics
  const coreStats = useMemo(() => {
    const totalToday = todayReservations.length;
    let waitingCount = 0;
    let inUseCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;

    const now = new Date();

    todayReservations.forEach((r) => {
      if (r.status === "cancelled") {
        cancelledCount++;
      } else if (r.status === "no_show") {
        noShowCount++;
      } else if (r.status === "completed") {
        const end = new Date(r.endAt);
        if (now <= end) {
          inUseCount++;
        } else {
          completedCount++;
        }
      } else if (r.status === "confirmed") {
        const end = new Date(r.endAt);
        if (now <= end) {
          waitingCount++;
        }
      }
    });

    return {
      totalToday,
      waitingCount,
      inUseCount,
      completedCount,
      cancelledCount,
      noShowCount,
    };
  }, [todayReservations]);

  // Table Occupancy Derivation (Zero fake status, strictly inferred from DB)
  const tableOccupancies = useMemo<TableOccupancy[]>(() => {
    const now = new Date();

    return tables.map((t) => {
      if (!t.active) {
        return {
          table: t,
          status: "inactive",
        };
      }

      // Filter reservations belonging to this table today and not cancelled or no_show
      const tableReservations = todayReservations
        .filter((r) => (r.tableId ? r.tableId === t.id : r.tableNumber.startsWith(t.name)))
        .filter((r) => r.status !== "cancelled" && r.status !== "no_show")
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      // 1. Current Reservation:
      // - First check if there is an in-progress completed reservation (startAt <= now <= endAt)
      const activeInUse = tableReservations.find((r) => {
        if (r.status !== "completed") return false;
        const end = new Date(r.endAt);
        return now <= end;
      });

      if (activeInUse) {
        // Next reservation is the earliest reservation whose startAt >= activeInUse.endAt
        const next = tableReservations.find(
          (r) => new Date(r.startAt) >= new Date(activeInUse.endAt) && r.id !== activeInUse.id,
        );
        return {
          table: t,
          status: "in_use",
          currentReservation: activeInUse,
          nextReservation: next,
        };
      }

      // - Next check if there is a waiting reservation (confirmed, endAt not yet passed)
      const activeWaiting = tableReservations.find((r) => {
        if (r.status !== "confirmed") return false;
        const end = new Date(r.endAt);
        return now <= end;
      });

      if (activeWaiting) {
        const next = tableReservations.find(
          (r) => new Date(r.startAt) >= new Date(activeWaiting.endAt) && r.id !== activeWaiting.id,
        );
        return {
          table: t,
          status: "waiting",
          currentReservation: activeWaiting,
          nextReservation: next,
        };
      }

      // 2. Otherwise vacant (table has no ongoing party)
      // Look for the next upcoming reservation today
      const upcoming = tableReservations.find((r) => new Date(r.startAt) > now);
      return {
        table: t,
        status: "vacant",
        nextReservation: upcoming,
      };
    });
  }, [tables, todayReservations]);

  // Execute Status Transition
  const handleExecuteStatusChange = async () => {
    if (!confirmDialog) return;
    const { reservation, targetStatus } = confirmDialog;
    const previousStatus = reservation.status;
    const reasonToSend =
      targetStatus === "cancelled" ? cancelReason.trim() || undefined : undefined;

    // Optimistic UI update
    setTodayReservations((prev) =>
      prev.map((r) => (r.id === reservation.id ? { ...r, status: targetStatus } : r)),
    );
    setConfirmDialog(null);
    setCancelReason("");

    const res = await updateReservationStatusAction(reservation.id, targetStatus, reasonToSend);
    if (!res.success) {
      setTodayReservations((prev) =>
        prev.map((r) => (r.id === reservation.id ? { ...r, status: previousStatus } : r)),
      );
      alert(res.message || "ステータス更新に失敗しました。");
    } else {
      // Reload fresh data from server
      await loadData();
    }
  };

  const openStatusAction = (
    reservation: ReservationItem,
    targetStatus: ReservationStatus,
    actionLabel: string,
    description: string,
  ) => {
    setCancelReason("");
    setConfirmDialog({
      reservation,
      targetStatus,
      actionLabel,
      description,
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Reservation Link */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            本日営業状況
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="h-8 gap-1.5 bg-primary text-xs text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <Link href="/dashboard/reservations">
              <CalendarDays className="size-3.5" />
              予約管理を開く
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Strip: Compact Minimalist Operational Metrics */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-stone-200/80 bg-white p-3.5 text-sm shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <span className="font-semibold text-stone-800 dark:text-stone-200 px-1.5 flex items-center gap-2">
          <CalendarDays className="size-4 text-stone-400" />
          本日概要：
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 bg-stone-100 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
          本日の予約：
          <strong className="font-mono text-base font-semibold text-stone-900 dark:text-stone-100">
            {coreStats.totalToday}
          </strong>{" "}
          件
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 bg-amber-50 font-medium text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          <Clock className="size-3.5" />
          来店待ち：
          <strong className="font-mono text-base font-semibold text-amber-900 dark:text-amber-200">
            {coreStats.waitingCount}
          </strong>
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 bg-blue-50 font-medium text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
          <UserCheck className="size-3.5" />
          利用中：
          <strong className="font-mono text-base font-semibold text-blue-900 dark:text-blue-200">
            {coreStats.inUseCount}
          </strong>
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 bg-emerald-50 font-medium text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="size-3.5" />
          完了：
          <strong className="font-mono text-base font-semibold text-emerald-900 dark:text-emerald-200">
            {coreStats.completedCount}
          </strong>
        </span>

        {coreStats.cancelledCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 bg-stone-100 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            <XCircle className="size-3.5" />
            キャンセル：
            <strong className="font-mono text-base font-semibold">
              {coreStats.cancelledCount}
            </strong>
          </span>
        )}
      </div>

      {/* Table-centric Cards Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">座席ステータス一覧</h2>
        </div>

        {loading ? (
          <div className="rounded-lg border border-stone-200/80 bg-white p-12 text-center text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
            <Loader2 className="mx-auto size-4 animate-spin mb-1.5" />
            データを読込中...
          </div>
        ) : tableOccupancies.length === 0 ? (
          <div className="rounded-lg border border-stone-200/80 bg-white p-8 text-center text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
            座席が登録されていません。座席管理から追加してください。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tableOccupancies.map(({ table, status, currentReservation, nextReservation }) => {
              const badgeCfg = statusBadgeConfig[status];

              return (
                <div
                  key={table.id}
                  className={`flex flex-col justify-between rounded-lg border p-3.5 text-xs transition-colors shadow-2xs ${
                    status === "in_use"
                      ? "border-blue-300 bg-blue-50/20 dark:border-blue-900/60 dark:bg-blue-950/10"
                      : status === "waiting"
                        ? "border-amber-300 bg-amber-50/20 dark:border-amber-900/60 dark:bg-amber-950/10"
                        : status === "inactive"
                          ? "border-stone-200 bg-stone-50/50 opacity-60 dark:border-stone-800 dark:bg-stone-900/40"
                          : "border-stone-200/90 bg-white dark:border-stone-800 dark:bg-stone-900"
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
                          {table.name}
                        </span>
                        <span className="text-[11px] text-stone-800 dark:text-stone-300">
                          {table.capacity}名席
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${badgeCfg.className}`}
                      >
                        {badgeCfg.label}
                      </span>
                    </div>

                    {/* Current Party Info */}
                    <div className="mt-2.5 min-h-[4.5rem]">
                      {currentReservation ? (
                        <div className="space-y-1 rounded bg-stone-50/80 p-2 dark:bg-stone-800/50">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                              {currentReservation.customerName} 様
                              {currentReservation.reservationNumber && (
                                <span className="font-mono text-[10px] font-semibold text-stone-600 dark:text-stone-300 bg-stone-200/70 dark:bg-stone-700/60 px-1 py-0.2 rounded">
                                  {currentReservation.reservationNumber}
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-[11px] font-medium text-stone-700 dark:text-stone-300">
                              {currentReservation.partySize}名
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-600 dark:text-stone-400 flex items-center justify-between font-mono">
                            <span>
                              {formatDisplayTime(currentReservation.time)} 〜{" "}
                              {formatDisplayTime(
                                new Date(
                                  new Date(currentReservation.endAt).getTime() + 9 * 3600 * 1000,
                                )
                                  .toISOString()
                                  .split("T")[1]
                                  .slice(0, 5),
                              )}
                            </span>
                          </div>

                          {currentReservation.note && (
                            <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                              注：{currentReservation.note}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded border border-dashed border-stone-200 p-2 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                          {status === "inactive" ? "休止中の座席" : "現在利用なし"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Next Party Footer */}
                  <div className="mt-3 space-y-2 border-t border-stone-100 pt-2.5 dark:border-stone-800">
                    {/* Action buttons if current reservation exists */}
                    {currentReservation && (
                      <div className="flex items-center gap-1.5">
                        {currentReservation.status !== "completed" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              openStatusAction(
                                currentReservation,
                                "completed",
                                "来店処理",
                                "「来店済み」に更新します。",
                              )
                            }
                            className="h-7 flex-1 bg-emerald-700 text-[11px] text-white hover:bg-emerald-800"
                          >
                            来店処理
                          </Button>
                        )}

                        {currentReservation.status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openStatusAction(
                                currentReservation,
                                "completed",
                                "完了（退席）処理",
                                "お席の利用完了（退席）を確認します。",
                              )
                            }
                            className="h-7 flex-1 text-[11px] text-stone-700 hover:bg-stone-100 dark:text-stone-300"
                          >
                            退席完了
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            openStatusAction(
                              currentReservation,
                              "cancelled",
                              "予約取消",
                              "この予約をキャンセルします。座席は即時解放されます。",
                            )
                          }
                          className="h-7 px-2 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                          title="予約をキャンセル"
                        >
                          キャンセル
                        </Button>
                      </div>
                    )}

                    {/* Next Reservation Info */}
                    <div className="text-[11px] text-stone-600 dark:text-stone-400">
                      {nextReservation ? (
                        <div className="flex items-center gap-1 truncate">
                          <span className="text-[10px] text-stone-500 dark:text-stone-400">
                            次回：
                          </span>
                          <strong className="font-mono text-stone-800 dark:text-stone-200">
                            {formatDisplayTime(nextReservation.time)}
                          </strong>
                          <span className="truncate">
                            {nextReservation.customerName}様 ({nextReservation.partySize}名)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-500 dark:text-stone-400">
                          今後の予約なし
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section Divider & Timeline View */}
      <div className="pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
            タイムラインビュー
          </h2>
        </div>

        <TimelineView
          reservations={timelineReservations}
          tables={tables.map((t) => ({
            id: t.id,
            name: t.name,
            capacity: t.capacity,
          }))}
          currentDate={timelineDate}
          onDateChange={handleTimelineDateChange}
          onSelectReservation={setSelectedTimelineReservation}
        />
      </div>

      {/* Quick Action Confirmation Dialog */}
      <AlertDialog
        open={!!confirmDialog}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        {confirmDialog && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold">
                {confirmDialog.actionLabel}の確認
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="rounded-lg border border-stone-200/80 bg-stone-50/80 p-3 text-xs dark:border-stone-800 dark:bg-stone-900/60 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">予約番号：</span>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                  {confirmDialog.reservation.reservationNumber || confirmDialog.reservation.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">お客様：</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {confirmDialog.reservation.customerName} 様
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">日時・座席：</span>
                <span>
                  {formatDisplayTime(confirmDialog.reservation.time)}（
                  {confirmDialog.reservation.partySize}名）/ {confirmDialog.reservation.tableNumber}
                </span>
              </div>
            </div>

            {confirmDialog.targetStatus === "cancelled" && (
              <div className="space-y-1">
                <label
                  htmlFor="quick-cancel-reason"
                  className="text-[11px] font-medium text-stone-600 dark:text-stone-400"
                >
                  キャンセル理由（任意）
                </label>
                <Input
                  id="quick-cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="例：お客様からの電話連絡、天候不良など"
                  className="h-8 text-xs"
                />
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel className="h-8 text-xs" onClick={() => setConfirmDialog(null)}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExecuteStatusChange}
                className={`h-8 text-xs text-white ${
                  confirmDialog.targetStatus === "cancelled"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                {confirmDialog.actionLabel}を実行
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* Timeline Selection Detail Modal */}
      {selectedTimelineReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-4 shadow-xl dark:border-stone-800 dark:bg-stone-900 text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2 dark:border-stone-800">
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                予約詳細（タイムライン）
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => setSelectedTimelineReservation(null)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
            <div className="mt-3 space-y-1.5 text-stone-600 dark:text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">予約番号：</span>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                  {selectedTimelineReservation.reservationNumber || selectedTimelineReservation.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">お客様：</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {selectedTimelineReservation.customerName} 様
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">日時：</span>
                <span>
                  {selectedTimelineReservation.date}{" "}
                  {formatDisplayTime(selectedTimelineReservation.time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">人数・座席：</span>
                <span>
                  {selectedTimelineReservation.partySize}名 /{" "}
                  {selectedTimelineReservation.tableNumber}
                </span>
              </div>
              {selectedTimelineReservation.note && (
                <div className="rounded bg-amber-50 p-1.5 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  備考：{selectedTimelineReservation.note}
                </div>
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedTimelineReservation(null)}
              >
                閉じる
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
