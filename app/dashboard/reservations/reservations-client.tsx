"use client";

import {
  AlertCircle,
  Calendar,
  Filter,
  Loader2,
  MoreVertical,
  PlusCircle,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DEFAULT_RESTAURANT_SLUG } from "@/config/restaurant";
import {
  createReservationAction,
  fetchReservationsAction,
  updateReservationStatusAction,
} from "@/lib/engine/reservation-actions";
import {
  formatDisplayTime,
  getTodayJst,
  mapDbReservation,
  RESERVATION_STATUS_CONFIG,
  type ReservationItem,
  type ReservationStatus,
} from "@/lib/utils";

export function ReservationsClient() {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedReservation, setSelectedReservation] = useState<ReservationItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadReservations = useCallback(async (dateParam?: string) => {
    try {
      setLoading(true);
      const dbList = await fetchReservationsAction(dateParam || undefined);
      if (dbList) {
        setReservations(dbList.map(mapDbReservation));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations(selectedDate);
    const handleRefresh = () => {
      loadReservations(selectedDate);
    };
    window.addEventListener("dashboard:refresh", handleRefresh);
    return () => window.removeEventListener("dashboard:refresh", handleRefresh);
  }, [selectedDate, loadReservations]);

  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerKana, setNewCustomerKana] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPartySize, setNewPartySize] = useState("2");
  const [newDate, setNewDate] = useState(() => getTodayJst());
  const [newTime, setNewTime] = useState("18:30");
  const [newNote, setNewNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [statusReason, setStatusReason] = useState("");
  const [statusConfirmState, setStatusConfirmState] = useState<{
    reservation: ReservationItem;
    targetStatus: ReservationStatus;
  } | null>(null);

  const requestStatusChange = (reservation: ReservationItem, targetStatus: ReservationStatus) => {
    setStatusReason("");
    setStatusConfirmState({ reservation, targetStatus });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmState) return;
    const { reservation, targetStatus } = statusConfirmState;
    const previousStatus = reservation.status;
    const reasonToSend = statusReason.trim() || undefined;

    setReservations((prev) =>
      prev.map((item) => (item.id === reservation.id ? { ...item, status: targetStatus } : item)),
    );
    if (selectedReservation?.id === reservation.id) {
      setSelectedReservation((prev) => (prev ? { ...prev, status: targetStatus } : null));
    }
    setStatusConfirmState(null);
    setStatusReason("");

    const res = await updateReservationStatusAction(reservation.id, targetStatus, reasonToSend);
    if (!res.success) {
      setReservations((prev) =>
        prev.map((item) =>
          item.id === reservation.id ? { ...item, status: previousStatus } : item,
        ),
      );
      if (selectedReservation?.id === reservation.id) {
        setSelectedReservation((prev) => (prev ? { ...prev, status: previousStatus } : null));
      }
      alert(res.message || "ステータスの更新に失敗しました。");
    }
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter((item) => {
      const matchSearch =
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customerNameKana.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery) ||
        (item.reservationNumber &&
          item.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      const matchSession = sessionFilter === "all" || item.session === sessionFilter;

      return matchSearch && matchStatus && matchSession;
    });
  }, [reservations, searchQuery, statusFilter, sessionFilter]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = newCustomerName.trim();
    if (!trimmedName) {
      setFormError("お名前を入力してください");
      return;
    }
    if (trimmedName.length > 50) {
      setFormError("お名前は50文字以内で入力してください");
      return;
    }

    const trimmedKana = newCustomerKana.trim();
    if (trimmedKana && !/^[ァ-ヶー\s　]+$/.test(trimmedKana)) {
      setFormError("フリガナは全角カタカナで入力してください");
      return;
    }

    const trimmedPhone = newPhone.trim();
    if (!/^0\d{1,4}-?\d{1,4}-?\d{4}$/.test(trimmedPhone)) {
      setFormError("有効な電話番号を入力してください（例：090-1234-5678）");
      return;
    }

    const trimmedEmail = newEmail.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError("有効なメールアドレスを入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createReservationAction({
        restaurantSlug: DEFAULT_RESTAURANT_SLUG,
        date: newDate,
        time: newTime,
        partySize: parseInt(newPartySize, 10) || 2,
        customerName: trimmedName,
        customerNameKana: trimmedKana || "トクメイ",
        customerPhone: trimmedPhone,
        customerEmail: trimmedEmail || `phone-booking@${DEFAULT_RESTAURANT_SLUG}.jp`,
        note: newNote.trim() ? `[電話・直接受付] ${newNote.trim()}` : "[電話・直接受付]",
      });

      if (!res.success) {
        setFormError(res.message);
        setIsSubmitting(false);
        return;
      }

      await loadReservations(selectedDate);
      setIsAddModalOpen(false);
      setNewCustomerName("");
      setNewCustomerKana("");
      setNewPhone("");
      setNewEmail("");
      setNewNote("");
    } catch (err: unknown) {
      const error = err as { message?: string } | undefined;
      setFormError(error?.message || "予約の登録中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            予約管理
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            size="sm"
            className="h-8 gap-1.5 bg-primary text-xs text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <PlusCircle className="size-3.5" />
            新規予約
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <Card className="border-stone-200/80 shadow-xs dark:border-stone-800">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-stone-500 dark:text-stone-400" />
              <Input
                placeholder="お客様氏名、フリガナ、電話番号、予約番号で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
                aria-label="予約を検索"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                <Calendar className="size-3.5 text-stone-500 dark:text-stone-400" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 text-xs w-36"
                  aria-label="来店日で絞り込み"
                />
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                    onClick={() => setSelectedDate("")}
                  >
                    全日程
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1 border border-stone-200/80 rounded-lg p-0.5 bg-stone-50 dark:border-stone-800 dark:bg-stone-900 text-xs">
                <button
                  type="button"
                  onClick={() => setSessionFilter("all")}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    sessionFilter === "all"
                      ? "bg-white font-semibold text-stone-900 shadow-2xs dark:bg-stone-800 dark:text-stone-100"
                      : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                  }`}
                >
                  すべての時間帯
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter("lunch")}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    sessionFilter === "lunch"
                      ? "bg-white font-semibold text-stone-900 shadow-2xs dark:bg-stone-800 dark:text-stone-100"
                      : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                  }`}
                >
                  昼
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter("dinner")}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    sessionFilter === "dinner"
                      ? "bg-white font-semibold text-stone-900 shadow-2xs dark:bg-stone-800 dark:text-stone-100"
                      : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                  }`}
                >
                  夜
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800/80 text-xs">
            <span className="text-stone-600 dark:text-stone-400 text-[11px] font-medium mr-1 flex items-center gap-1">
              <Filter className="size-3" />
              ステータス：
            </span>
            {[
              { id: "all", label: "すべて" },
              { id: "confirmed", label: "確定" },
              { id: "completed", label: "来店済み" },
              { id: "pending", label: "保留中" },
              { id: "cancelled", label: "キャンセル" },
              { id: "no_show", label: "無断キャンセル" },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {tab.label}
                  {tab.id !== "all" && (
                    <span className="ml-1 opacity-70">
                      ({reservations.filter((r) => r.status === tab.id).length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <div className="rounded-lg border border-stone-200/80 bg-white shadow-xs overflow-hidden dark:border-stone-800 dark:bg-stone-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] font-semibold text-stone-500 uppercase tracking-wider dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              <tr>
                <th className="py-2.5 pl-4 pr-3 min-w-[140px] whitespace-nowrap">予約日時・番号</th>
                <th className="px-3 py-2.5 min-w-[170px] whitespace-nowrap">顧客氏名</th>
                <th className="px-3 py-2.5 min-w-[120px] whitespace-nowrap">人数・座席</th>
                <th className="px-3 py-2.5 min-w-[130px] whitespace-nowrap">連絡先</th>
                <th className="px-3 py-2.5 min-w-[100px] whitespace-nowrap">ステータス</th>
                <th className="py-2.5 pl-3 pr-4 text-right min-w-[120px] whitespace-nowrap">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500 dark:text-stone-400">
                    <Loader2 className="mx-auto size-4 animate-spin mb-1" />
                    読み込み中...
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500 dark:text-stone-400">
                    該当する予約は見つかりませんでした
                  </td>
                </tr>
              ) : (
                filteredReservations.map((item) => {
                  const cfg = RESERVATION_STATUS_CONFIG[item.status];
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-stone-50/80 transition-colors dark:hover:bg-stone-800/40"
                    >
                      <td className="py-2.5 pl-4 pr-3 min-w-[140px] whitespace-nowrap">
                        <div className="font-mono font-medium text-stone-900 dark:text-stone-100">
                          {item.date} {formatDisplayTime(item.time)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-semibold tracking-wider text-stone-700 dark:text-stone-300 font-mono">
                            {item.reservationNumber || item.id}
                          </span>
                          <span className="rounded px-1 text-[9px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            {item.session === "lunch" ? "昼" : "夜"}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 min-w-[170px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {item.customerName}
                          </span>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400">
                            ({item.customerNameKana})
                          </span>
                        </div>
                        {item.note && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate max-w-[160px] mt-0.5">
                            注：{item.note}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 min-w-[120px] whitespace-nowrap">
                        <div className="font-medium text-stone-900 dark:text-stone-100">
                          {item.partySize}名様
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                          {item.tableNumber}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 min-w-[130px] font-mono text-[11px] text-stone-600 dark:text-stone-400">
                        <div>{item.phone}</div>
                      </td>

                      <td className="px-3 py-2.5 min-w-[100px] whitespace-nowrap">
                        <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
                      </td>

                      <td className="py-2.5 pl-3 pr-4 text-right min-w-[120px] whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setSelectedReservation(item)}
                          >
                            詳細
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                aria-label="操作メニューを開く"
                              >
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              {item.status === "confirmed" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => requestStatusChange(item, "completed")}
                                    className="text-emerald-700 font-medium"
                                  >
                                    来店済みにする
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => requestStatusChange(item, "cancelled")}
                                    className="text-red-600 font-medium"
                                  >
                                    キャンセルする
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => requestStatusChange(item, "no_show")}
                                    className="text-rose-600 font-medium"
                                  >
                                    無断キャンセルにする
                                  </DropdownMenuItem>
                                </>
                              )}
                              {item.status === "no_show" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => requestStatusChange(item, "confirmed")}
                                  >
                                    確定済みに戻す
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => requestStatusChange(item, "completed")}
                                    className="text-emerald-700 font-medium"
                                  >
                                    来店済みにする
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(item.status === "completed" || item.status === "cancelled") && (
                                <DropdownMenuItem disabled>操作不可</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200/80 bg-stone-50/50 px-4 py-2 text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          <div>
            表示中：{filteredReservations.length} 件 / 全 {reservations.length} 件
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <div>
                <span className="font-mono text-xs font-semibold tracking-wider text-stone-700 dark:text-stone-300">
                  予約番号: {selectedReservation.reservationNumber || selectedReservation.id}
                </span>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  予約詳細情報
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setSelectedReservation(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-stone-50 p-2.5 dark:bg-stone-800/60">
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">予約日時</div>
                  <div className="mt-0.5 font-semibold">
                    {selectedReservation.date} {formatDisplayTime(selectedReservation.time)}
                  </div>
                </div>

                <div className="rounded-lg bg-stone-50 p-2.5 dark:bg-stone-800/60">
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">ステータス</div>
                  <div className="mt-0.5">
                    <Badge
                      variant={RESERVATION_STATUS_CONFIG[selectedReservation.status].badgeVariant}
                    >
                      {RESERVATION_STATUS_CONFIG[selectedReservation.status].label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-stone-100 pt-2.5 dark:border-stone-800">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">お名前：</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {selectedReservation.customerName} ({selectedReservation.customerNameKana})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">人数 / 座席：</span>
                  <span className="font-medium">
                    {selectedReservation.partySize}名様 / {selectedReservation.tableNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">電話番号：</span>
                  <span className="font-mono">{selectedReservation.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">メールアドレス：</span>
                  <span className="font-mono">{selectedReservation.email}</span>
                </div>
                {selectedReservation.note && (
                  <div className="rounded-md bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                    <span className="font-semibold">ご要望・備考：</span> {selectedReservation.note}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                {selectedReservation.status === "confirmed" && (
                  <>
                    <Button
                      className="flex-1 h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                      onClick={() => requestStatusChange(selectedReservation, "completed")}
                    >
                      来店完了にする
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => requestStatusChange(selectedReservation, "cancelled")}
                    >
                      キャンセル
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30"
                      onClick={() => requestStatusChange(selectedReservation, "no_show")}
                    >
                      無断キャンセル
                    </Button>
                  </>
                )}
                {selectedReservation.status === "no_show" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => requestStatusChange(selectedReservation, "confirmed")}
                    >
                      確定済みに戻す
                    </Button>
                    <Button
                      className="flex-1 h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                      onClick={() => requestStatusChange(selectedReservation, "completed")}
                    >
                      来店完了にする
                    </Button>
                  </>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSelectedReservation(null)}
                >
                  閉じる
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 dark:border-stone-800">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">予約登録</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {formError && (
              <div className="mt-2.5 flex items-center gap-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateReservation} className="mt-3 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label
                    htmlFor="new-customer-name"
                    className="font-medium text-stone-700 dark:text-stone-300"
                  >
                    お名前 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="new-customer-name"
                    required
                    placeholder="山田 太郎"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="new-customer-kana"
                    className="font-medium text-stone-700 dark:text-stone-300"
                  >
                    フリガナ
                  </label>
                  <Input
                    id="new-customer-kana"
                    placeholder="ヤマダ タロウ"
                    value={newCustomerKana}
                    onChange={(e) => setNewCustomerKana(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label
                    htmlFor="new-customer-phone"
                    className="font-medium text-stone-700 dark:text-stone-300"
                  >
                    お電話番号 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="new-customer-phone"
                    required
                    placeholder="090-0000-0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="new-customer-email"
                    className="font-medium text-stone-700 dark:text-stone-300"
                  >
                    連絡先メール（任意）
                  </label>
                  <Input
                    id="new-customer-email"
                    placeholder="customer@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label
                    htmlFor="new-reservation-date"
                    className="font-medium text-stone-700 dark:text-stone-300"
                  >
                    予約日 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="new-reservation-date"
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="new-reservation-time"
                    className="font-medium text-stone-700 dark:text-stone-300"
                  >
                    時間 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="new-reservation-time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full h-8 rounded-md border border-stone-200 bg-white px-2 text-xs dark:border-stone-800 dark:bg-stone-900"
                  >
                    <option value="11:30">11:30（昼）</option>
                    <option value="12:00">12:00（昼）</option>
                    <option value="12:30">12:30（昼）</option>
                    <option value="13:00">13:00（昼）</option>
                    <option value="17:30">17:30（夜）</option>
                    <option value="18:00">18:00（夜）</option>
                    <option value="18:30">18:30（夜）</option>
                    <option value="19:00">19:00（夜）</option>
                    <option value="19:30">19:30（夜）</option>
                    <option value="20:00">20:00（夜）</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="new-reservation-partysize"
                    className="font-medium text-stone-700 dark:text-stone-300"
                  >
                    人数
                  </label>
                  <select
                    id="new-reservation-partysize"
                    value={newPartySize}
                    onChange={(e) => setNewPartySize(e.target.value)}
                    className="w-full h-8 rounded-md border border-stone-200 bg-white px-2 text-xs dark:border-stone-800 dark:bg-stone-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} 名
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="new-reservation-note"
                  className="font-medium text-stone-700 dark:text-stone-300"
                >
                  備考
                </label>
                <Input
                  id="new-reservation-note"
                  placeholder="アレルギー、記念日など"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isSubmitting ? "登録中..." : "予約を登録する"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Status Dialog */}
      <AlertDialog
        open={!!statusConfirmState}
        onOpenChange={(open) => {
          if (!open) {
            setStatusConfirmState(null);
            setStatusReason("");
          }
        }}
      >
        {statusConfirmState && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">
                {statusConfirmState.targetStatus === "no_show"
                  ? "無断キャンセルの確認"
                  : statusConfirmState.targetStatus === "cancelled"
                    ? "予約キャンセルの確認"
                    : statusConfirmState.targetStatus === "completed"
                      ? "来店完了の確認"
                      : "確定済みに更新"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                {statusConfirmState.targetStatus === "no_show"
                  ? "この予約を「無断キャンセル」として処理します。座席は解放されます。"
                  : statusConfirmState.targetStatus === "cancelled"
                    ? "この予約をキャンセルします。座席は解放されます。"
                    : statusConfirmState.targetStatus === "completed"
                      ? "お客様のご来店を確認し、「来店済み」に更新します。"
                      : "ステータスを「確定済み」に更新します。"}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="rounded-lg border border-stone-200/80 bg-stone-50/80 p-3 text-xs dark:border-stone-800 dark:bg-stone-900/60 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">顧客名</span>
                <span className="font-semibold">
                  {statusConfirmState.reservation.customerName} 様
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">日時・人数</span>
                <span>
                  {statusConfirmState.reservation.date} {statusConfirmState.reservation.time}（
                  {statusConfirmState.reservation.partySize}名）
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">座席</span>
                <span>{statusConfirmState.reservation.tableNumber}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                理由・メモ（任意）
              </label>
              <Input
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={
                  statusConfirmState.targetStatus === "no_show"
                    ? "例：30分経過しても来店なし、電話不通 など"
                    : "備考・メモがあれば入力"
                }
                className="h-8 text-xs"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                className="h-8 text-xs"
                onClick={() => {
                  setStatusConfirmState(null);
                  setStatusReason("");
                }}
              >
                戻る
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmStatusChange}
                className={`h-8 text-xs text-white ${
                  statusConfirmState.targetStatus === "no_show"
                    ? "bg-rose-700 hover:bg-rose-800"
                    : statusConfirmState.targetStatus === "cancelled"
                      ? "bg-red-600 hover:bg-red-700"
                      : statusConfirmState.targetStatus === "completed"
                        ? "bg-emerald-700 hover:bg-emerald-800"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                }`}
              >
                確定する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
