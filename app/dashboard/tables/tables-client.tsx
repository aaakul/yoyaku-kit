"use client";

import { Armchair, Loader2, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createTableAction,
  fetchTablesAction,
  updateTableDetailsAction,
  updateTableStatusAction,
} from "@/lib/engine/reservation-actions";

interface TableRecord {
  id: string;
  name: string;
  type: string;
  capacity: number;
  active: boolean;
}

export interface TablesClientProps {
  initialTables?: TableRecord[];
}

export function TablesClient({ initialTables }: TablesClientProps = {}) {
  const [tables, setTables] = useState<TableRecord[]>(initialTables ?? []);
  const [loading, setLoading] = useState(initialTables === undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableRecord | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "テーブル席",
    capacity: "4",
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deactivatingTable, setDeactivatingTable] = useState<TableRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    try {
      const data = await fetchTablesAction();
      setTables(
        data.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type || "テーブル席",
          capacity: t.capacity,
          active: t.active,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTables === undefined) {
      loadTables();
    }
    const handleRefresh = () => {
      loadTables();
    };
    window.addEventListener("dashboard:refresh", handleRefresh);
    return () => window.removeEventListener("dashboard:refresh", handleRefresh);
  }, [loadTables, initialTables]);

  const openAddModal = () => {
    setEditingTable(null);
    setFormData({
      name: "",
      type: "テーブル席",
      capacity: "4",
      active: true,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (table: TableRecord) => {
    setEditingTable(table);
    setFormData({
      name: table.name,
      type: table.type,
      capacity: String(table.capacity),
      active: table.active,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = (table: TableRecord) => {
    if (table.active) {
      setDeactivatingTable(table);
      return;
    }
    void executeToggleActive(table, true);
  };

  const executeToggleActive = async (table: TableRecord, nextActive: boolean) => {
    setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, active: nextActive } : t)));
    const res = await updateTableStatusAction(table.id, nextActive);
    if (!res.success) {
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, active: table.active } : t)),
      );
      setActionError(res.message || "座席状態の更新に失敗しました。");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const name = formData.name.trim();
    if (!name) {
      setErrorMsg("座席番号・名称を入力してください。");
      return;
    }
    const cap = parseInt(formData.capacity, 10);
    if (!cap || cap <= 0) {
      setErrorMsg("収容人数を1名以上で入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      if (editingTable) {
        const res = await updateTableDetailsAction(editingTable.id, {
          name,
          type: formData.type.trim() || "テーブル席",
          capacity: cap,
          active: formData.active,
        });
        if (!res.success) {
          setErrorMsg(res.message || "更新に失敗しました。");
          return;
        }
      } else {
        const res = await createTableAction({
          name,
          type: formData.type.trim() || "テーブル席",
          capacity: cap,
        });
        if (!res.success) {
          setErrorMsg(res.message || "追加に失敗しました。");
          return;
        }
      }

      await loadTables();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const error = err as { message?: string } | undefined;
      setErrorMsg(error?.message || "エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const totalSeats = tables.filter((t) => t.active).reduce((sum, t) => sum + t.capacity, 0);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            座席管理
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={openAddModal}
            className="h-8 gap-1.5 bg-primary text-xs text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <Plus className="size-3.5" />
            座席を追加
          </Button>
        </div>
      </div>

      {/* Summary note */}
      <div className="flex items-center justify-between rounded-lg border border-stone-200/80 bg-stone-50/60 px-3 py-2 text-xs text-stone-700 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300">
        <span className="flex items-center gap-1.5">
          <Armchair className="size-3.5 text-stone-500 dark:text-stone-400" />
          稼働中：<strong>{tables.filter((t) => t.active).length}卓</strong>
          （総定員：<strong>{totalSeats}名</strong>） / 全{tables.length}卓
        </span>
      </div>

      {/* Tables List */}
      <div className="overflow-hidden rounded-lg border border-stone-200/80 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-100 bg-stone-50 text-[11px] font-semibold text-stone-600 uppercase dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            <tr>
              <th className="py-2.5 pl-4 pr-3">番号</th>
              <th className="px-3 py-2.5">タイプ</th>
              <th className="px-3 py-2.5">収容定員</th>
              <th className="px-3 py-2.5">稼働状態</th>
              <th className="py-2.5 pl-3 pr-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-500 dark:text-stone-400">
                  <Loader2 className="mx-auto size-4 animate-spin mb-1" />
                  座席データを読み込み中...
                </td>
              </tr>
            ) : tables.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-500 dark:text-stone-400">
                  座席が登録されていません。「座席を追加」から登録してください。
                </td>
              </tr>
            ) : (
              tables.map((table) => (
                <tr key={table.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                  <td className="py-2.5 pl-4 pr-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                    {table.name}
                  </td>
                  <td className="px-3 py-2.5 text-stone-600 dark:text-stone-300">{table.type}</td>
                  <td className="px-3 py-2.5 font-medium">{table.capacity} 名</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(table)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        table.active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                          : "bg-stone-100 text-stone-600 border border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700"
                      }`}
                      title="クリックして稼働・休止を切り替え"
                    >
                      <span
                        className={`size-1.5 rounded-full ${table.active ? "bg-emerald-500" : "bg-stone-400"}`}
                      />
                      {table.active ? "稼働中" : "休止中"}
                    </button>
                  </td>
                  <td className="py-2.5 pl-3 pr-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                      onClick={() => openEditModal(table)}
                    >
                      <Pencil className="size-3 mr-1" />
                      編集
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingTable ? "座席情報の編集" : "新しい座席を追加"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 pt-2 text-xs">
            {errorMsg && (
              <div className="rounded border border-red-200 bg-red-50 p-2 text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="table-name"
                className="font-medium text-stone-700 dark:text-stone-300"
              >
                座席番号・名称 <span className="text-red-500">*</span>
              </label>
              <Input
                id="table-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例：T-01, カウンター1"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="table-type"
                className="font-medium text-stone-700 dark:text-stone-300"
              >
                席種別
              </label>
              <Input
                id="table-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="例：テーブル席, 窓際テーブル席, 半個室"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="table-capacity"
                className="font-medium text-stone-700 dark:text-stone-300"
              >
                収容定員（名） <span className="text-red-500">*</span>
              </label>
              <Input
                id="table-capacity"
                type="number"
                min="1"
                max="50"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            {editingTable && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tableActive"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="size-4 rounded border-input accent-primary"
                />
                <label htmlFor="tableActive" className="text-xs text-foreground cursor-pointer">
                  この座席を稼働（予約受付可能）にする
                </label>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3 animate-spin mr-1.5" />
                    保存中...
                  </>
                ) : (
                  "保存する"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deactivatingTable}
        onOpenChange={(open) => !open && setDeactivatingTable(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>座席を休止しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              座席「{deactivatingTable?.name}」を休止します。
              <br />※ 今後の有効な予約が存在する場合は休止できません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivatingTable) {
                  const target = deactivatingTable;
                  setDeactivatingTable(null);
                  void executeToggleActive(target, false);
                }
              }}
            >
              休止する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!actionError} onOpenChange={(open) => !open && setActionError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>エラー</AlertDialogTitle>
            <AlertDialogDescription>{actionError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setActionError(null)}>閉じる</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
