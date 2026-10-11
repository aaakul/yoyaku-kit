"use client";

import { ArrowRight, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RESERVATION_STATUS_CONFIG, type ReservationStatus } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  reservationId: string;
  reservationNumber?: string | null;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  operatorId: string | null;
  operatorRole: string;
  operatorName: string | null;
  operatorEmail: string | null;
  note: string | null;
  createdAt: Date;
  customerName: string | null;
  customerPhone: string | null;
  startAt: Date | null;
}

interface AuditLogsClientProps {
  initialLogs: AuditLogItem[];
}

const actionLabels: Record<string, string> = {
  created: "新規予約作成",
  status_changed: "ステータス更新",
  cancelled: "キャンセル",
  restored: "復元",
};

function getStatusDisplay(status: string | null) {
  if (!status) return null;
  const cfg = RESERVATION_STATUS_CONFIG[status as ReservationStatus];
  if (cfg) {
    return { label: cfg.label, className: cfg.badgeClassName };
  }
  return { label: status, className: "" };
}

export function AuditLogsClient({ initialLogs }: AuditLogsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        log.reservationId.toLowerCase().includes(query) ||
        (log.reservationNumber && log.reservationNumber.toLowerCase().includes(query)) ||
        (log.customerName && log.customerName.toLowerCase().includes(query)) ||
        (log.operatorName && log.operatorName.toLowerCase().includes(query)) ||
        (log.note && log.note.toLowerCase().includes(query));

      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesRole = roleFilter === "all" || log.operatorRole === roleFilter;

      return matchesSearch && matchesAction && matchesRole;
    });
  }, [initialLogs, searchQuery, actionFilter, roleFilter]);

  const formatJst = (date: Date) => {
    const d = new Date(date);
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
            操作ログ
          </h1>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-stone-200 dark:border-stone-800 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-500 dark:text-stone-400" />
              <Input
                placeholder="予約ID、顧客名、担当者、メモで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm border-stone-200 dark:border-stone-800"
                aria-label="ログを検索"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-stone-500 dark:text-stone-400" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 text-xs rounded-md border border-stone-200 dark:border-stone-800 bg-background px-2.5 py-1 text-stone-700 dark:text-stone-300"
                aria-label="操作種別で絞り込み"
              >
                <option value="all">すべての操作</option>
                <option value="created">新規予約作成</option>
                <option value="status_changed">ステータス更新</option>
                <option value="cancelled">キャンセル</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 text-xs rounded-md border border-stone-200 dark:border-stone-800 bg-background px-2.5 py-1 text-stone-700 dark:text-stone-300"
                aria-label="操作者区分で絞り込み"
              >
                <option value="all">すべての操作者</option>
                <option value="manager">管理者</option>
                <option value="staff">スタッフ</option>
                <option value="customer">お客様</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-medium">
              <tr>
                <th className="py-3 px-4">日時</th>
                <th className="py-3 px-4">操作種別</th>
                <th className="py-3 px-4">ステータス遷移</th>
                <th className="py-3 px-4">予約番号・顧客</th>
                <th className="py-3 px-4">操作者</th>
                <th className="py-3 px-4">備考</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-600 dark:text-stone-400">
                    該当する操作ログが見つかりませんでした。
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const prevStatusObj = getStatusDisplay(log.previousStatus);
                  const newStatusObj = getStatusDisplay(log.newStatus);

                  return (
                    <tr key={log.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40">
                      <td className="py-3 px-4 whitespace-nowrap text-stone-600 dark:text-stone-400 font-mono">
                        {formatJst(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-stone-800 dark:text-stone-200">
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {prevStatusObj ? (
                            <>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 border ${prevStatusObj.className}`}
                              >
                                {prevStatusObj.label}
                              </Badge>
                              <ArrowRight className="size-3 text-stone-400 dark:text-stone-500" />
                            </>
                          ) : (
                            <span className="text-stone-500 dark:text-stone-400 text-[10px] mr-1">
                              新規 →
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 border ${newStatusObj?.className || ""}`}
                          >
                            {newStatusObj?.label || log.newStatus}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-stone-800 dark:text-stone-200">
                          {log.reservationNumber || `${log.reservationId.slice(0, 8)}...`}
                        </div>
                        {log.customerName && (
                          <div className="text-stone-600 dark:text-stone-400 text-[11px] truncate max-w-[140px]">
                            {log.customerName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {log.operatorRole === "manager" && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] px-1 py-0"
                            >
                              管理者
                            </Badge>
                          )}
                          {log.operatorRole === "staff" && (
                            <Badge
                              variant="outline"
                              className="border-stone-300 bg-stone-50 text-stone-700 dark:bg-stone-800 dark:text-stone-300 text-[10px] px-1 py-0"
                            >
                              スタッフ
                            </Badge>
                          )}
                          {log.operatorRole === "customer" && (
                            <Badge
                              variant="outline"
                              className="border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 text-[10px] px-1 py-0"
                            >
                              顧客
                            </Badge>
                          )}
                          <span className="text-stone-600 dark:text-stone-300 text-xs">
                            {log.operatorName ||
                              (log.operatorRole === "customer" ? "WEB利用者" : "システム")}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-600 dark:text-stone-400 max-w-[240px] truncate">
                        {log.note || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
