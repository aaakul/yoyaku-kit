"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cancelReservationAction } from "@/lib/engine/reservation-actions";

export function CancelReservationDialog({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cancelReservationAction(token);
      if (!res.success) {
        setError(res.message || "予約のキャンセルに失敗しました。");
        setLoading(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const error = err as { message?: string } | undefined;
      setError(error?.message || "エラーが発生しました。");
      setLoading(false);
    }
  };

  return (
    <div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/30 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            この予約をキャンセルする
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ご予約のキャンセル確認</AlertDialogTitle>
            <AlertDialogDescription>
              本当にこのご予約をキャンセルしますか？キャンセル後の取り消しはできません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>戻る</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmCancel();
              }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "キャンセル中..." : "キャンセルを確定する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
