"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit2,
  Megaphone,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createNewsAction,
  deleteNewsAction,
  reorderNewsAction,
  toggleNewsPublishedAction,
  updateNewsAction,
} from "@/lib/cms/actions";
import type { NewsItem } from "@/lib/db/schema";

interface NewsClientProps {
  restaurantId: string;
  initialNews: NewsItem[];
}

const PRESET_CATEGORIES = ["お知らせ", "季節限定", "営業案内", "イベント"];

export function NewsClient({ restaurantId, initialNews }: NewsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [newsList, setNewsList] = useState<NewsItem[]>(initialNews);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [contentTab, setContentTab] = useState<"edit" | "preview">("edit");
  const [editingItem, setEditingItem] = useState<{
    id?: string;
    category: string;
    title: string;
    content: string;
    publishedAt: string;
    isPublished: boolean;
  } | null>(null);

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const todayFormatted = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  const handleOpenAddDialog = () => {
    setContentTab("edit");
    setEditingItem({
      category: "お知らせ",
      title: "",
      content: "",
      publishedAt: todayFormatted(),
      isPublished: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (item: NewsItem) => {
    setContentTab("edit");
    setEditingItem({
      id: item.id,
      category: item.category,
      title: item.title,
      content: item.content ?? "",
      publishedAt: item.publishedAt,
      isPublished: item.isPublished,
    });
    setIsDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title.trim() || !editingItem.content.trim()) return;

    startTransition(async () => {
      if (editingItem.id) {
        const res = await updateNewsAction({
          id: editingItem.id,
          category: editingItem.category,
          title: editingItem.title,
          content: editingItem.content,
          publishedAt: editingItem.publishedAt,
          isPublished: editingItem.isPublished,
        });

        if (res.success && res.item) {
          setNewsList((prev) => prev.map((n) => (n.id === editingItem.id ? res.item : n)));
          showNotification("success", "お知らせを更新しました。");
          setIsDialogOpen(false);
        } else {
          showNotification("error", res.message || "更新に失敗しました。");
        }
      } else {
        const res = await createNewsAction({
          restaurantId,
          category: editingItem.category,
          title: editingItem.title,
          content: editingItem.content,
          publishedAt: editingItem.publishedAt,
          isPublished: editingItem.isPublished,
          sortOrder: newsList.length,
        });

        if (res.success && res.item) {
          setNewsList((prev) => [res.item, ...prev]);
          showNotification("success", "新しいお知らせを投稿しました。");
          setIsDialogOpen(false);
        } else {
          showNotification("error", res.message || "投稿に失敗しました。");
        }
      }
    });
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirmState({ id, title });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmState) return;
    const { id } = deleteConfirmState;

    startTransition(async () => {
      const res = await deleteNewsAction(id);
      if (res.success) {
        setNewsList((prev) => prev.filter((n) => n.id !== id));
        showNotification("success", "お知らせを削除しました。");
      } else {
        showNotification("error", res.message || "削除に失敗しました。");
      }
    });
    setDeleteConfirmState(null);
  };

  const handleTogglePublished = (id: string, current: boolean) => {
    const nextStatus = !current;
    setNewsList((prev) => prev.map((n) => (n.id === id ? { ...n, isPublished: nextStatus } : n)));

    startTransition(async () => {
      await toggleNewsPublishedAction(id, nextStatus);
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newsList.length) return;

    const newList = [...newsList];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;
    setNewsList(newList);

    startTransition(async () => {
      await reorderNewsAction(newList.map((n) => n.id));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
            お知らせ管理
          </h1>
        </div>
        <Button
          onClick={handleOpenAddDialog}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs"
        >
          <Plus className="size-3.5 mr-1" />
          お知らせを追加
        </Button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-xs ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border bg-card/50 py-3.5 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-primary" />
              <CardTitle className="text-sm font-bold">登録済みお知らせ一覧</CardTitle>
            </div>
            <span className="text-[11px] text-stone-400">全 {newsList.length} 件</span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {newsList.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              まだお知らせが登録されていません。「お知らせを追加」ボタンから投稿してください。
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {newsList.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 transition-colors ${
                    !item.isPublished ? "opacity-50 bg-stone-50/50 dark:bg-stone-950/20" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <time className="font-mono text-xs text-stone-400 dark:text-stone-500 w-24 shrink-0">
                        {item.publishedAt}
                      </time>
                      <Badge
                        variant="secondary"
                        className="bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 text-[10px] px-2 py-0 shrink-0"
                      >
                        {item.category}
                      </Badge>
                    </div>

                    <div className="font-serif text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100">
                      {item.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePublished(item.id, item.isPublished)}
                      className={`h-7 text-[11px] px-2.5 ${
                        item.isPublished
                          ? "text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400"
                          : "text-stone-500 border-stone-300 hover:bg-stone-100"
                      }`}
                    >
                      {item.isPublished ? "公開中" : "下書き"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={idx === 0 || isPending}
                      onClick={() => handleMove(idx, "up")}
                      title="上へ"
                    >
                      <ArrowUp className="size-3 text-stone-500" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={idx === newsList.length - 1 || isPending}
                      onClick={() => handleMove(idx, "down")}
                      title="下へ"
                    >
                      <ArrowDown className="size-3 text-stone-500" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-stone-600 hover:text-stone-900"
                      onClick={() => handleOpenEditDialog(item)}
                      title="編集"
                    >
                      <Edit2 className="size-3" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(item.id, item.title)}
                      title="削除"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Create or edit news */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">
                {editingItem?.id ? "お知らせを編集" : "新規お知らせを投稿"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-stone-700 dark:text-stone-300">
                  公開日 (YYYY.MM.DD) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editingItem?.publishedAt || ""}
                  onChange={(e) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, publishedAt: e.target.value } : null,
                    )
                  }
                  required
                  placeholder="2026.09.30"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="news-category"
                  className="font-semibold text-stone-700 dark:text-stone-300"
                >
                  カテゴリータグ <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setEditingItem((prev) => (prev ? { ...prev, category: cat } : null))
                      }
                      className={`px-2 py-1 rounded text-[11px] border transition ${
                        editingItem?.category === cat
                          ? "bg-primary text-primary-foreground border-primary font-semibold"
                          : "bg-card text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <Input
                  id="news-category"
                  value={editingItem?.category || ""}
                  onChange={(e) =>
                    setEditingItem((prev) => (prev ? { ...prev, category: e.target.value } : null))
                  }
                  required
                  placeholder="または直接カテゴリー名を入力"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="news-title" className="font-semibold text-foreground">
                  タイトル <span className="text-destructive">*</span>
                </label>
                <Input
                  id="news-title"
                  value={editingItem?.title || ""}
                  onChange={(e) =>
                    setEditingItem((prev) => (prev ? { ...prev, title: e.target.value } : null))
                  }
                  required
                  placeholder="例：季節の野菜しゃぶしゃぶのご案内"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="news-content" className="font-semibold text-foreground">
                    本文（Markdown対応） <span className="text-destructive">*</span>
                  </label>
                  <div className="inline-flex rounded-md border border-border p-0.5">
                    <button
                      type="button"
                      onClick={() => setContentTab("edit")}
                      className={`px-2 py-0.5 text-[11px] rounded transition ${
                        contentTab === "edit"
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentTab("preview")}
                      className={`px-2 py-0.5 text-[11px] rounded transition ${
                        contentTab === "preview"
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      プレビュー
                    </button>
                  </div>
                </div>

                {contentTab === "edit" ? (
                  <>
                    <textarea
                      id="news-content"
                      value={editingItem?.content || ""}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, content: e.target.value } : null,
                        )
                      }
                      required
                      maxLength={1000}
                      rows={6}
                      placeholder="お知らせの本文を入力してください（Markdown記法に対応しています）"
                      className="w-full rounded-md border border-stone-200 bg-transparent px-3 py-2 text-xs font-mono shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-950 dark:border-stone-800 resize-y"
                    />
                    <div className="flex justify-end text-[11px] text-stone-400">
                      {editingItem?.content?.length || 0} / 1000文字
                    </div>
                  </>
                ) : (
                  <div className="min-h-[130px] max-h-60 overflow-y-auto rounded-md border border-stone-200 bg-stone-50/50 p-3 text-xs leading-relaxed dark:border-stone-800 dark:bg-stone-900/50">
                    {editingItem?.content?.trim() ? (
                      <div className="prose prose-stone dark:prose-invert max-w-none text-xs">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="leading-relaxed whitespace-pre-wrap my-1">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-4 space-y-0.5 my-1">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-4 space-y-0.5 my-1">{children}</ol>
                            ),
                          }}
                        >
                          {editingItem.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="text-stone-400 italic">本文が未入力です</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={editingItem?.isPublished ?? true}
                  onChange={(e) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, isPublished: e.target.checked } : null,
                    )
                  }
                  className="rounded border-input text-primary focus:ring-ring"
                />
                <label
                  htmlFor="isPublished"
                  className="text-xs font-medium text-foreground cursor-pointer"
                >
                  公開する（チェックを外すと下書き保存）
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              >
                {isPending ? "保存中..." : "保存する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirmState}
        onOpenChange={(open) => !open && setDeleteConfirmState(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>お知らせを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteConfirmState?.title}
              」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
