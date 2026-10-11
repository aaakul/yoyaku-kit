"use client";

import { useLocale, useTranslations } from "next-intl";
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
import { restaurantConfig } from "@/config/restaurant";
import { useRouter } from "@/i18n/navigation";
import { cancelReservationAction } from "@/lib/engine/reservation-actions";

export interface CancelReservationDialogProps {
  token: string;
}

export function CancelReservationDialog({ token }: CancelReservationDialogProps) {
  const t = useTranslations("cancel_dialog");
  const tRes = useTranslations("reservations");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cancelReservationAction(token, locale);
      if (!res.success) {
        const msg =
          res.code === "RESERVATION_CUTOFF_EXCEEDED"
            ? tRes("past_cutoff_notice", {
                hours: restaurantConfig.booking.cancellationCutoffHours,
              })
            : t("error_failed");
        setError(msg);
        setLoading(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("error_failed"));
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
            {tRes("cancel_button")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialog_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t("back")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmCancel();
              }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? t("processing") : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
