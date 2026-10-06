"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_RESTAURANT_SLUG, restaurantConfig } from "@/config/restaurant";
import {
  createReservationAction,
  fetchAvailableSlotsAction,
} from "@/lib/engine/reservation-actions";
import type { TimeSlot } from "@/lib/engine/slots";
import { getDayOfWeek, JAPANESE_WEEKDAYS } from "@/lib/utils";
import {
  getTokyoTodayStart,
  type ReservationFormValues,
  reservationSchema,
} from "@/lib/validations/reservation";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ReservationForm() {
  const router = useRouter();
  const pathname = usePathname();

  const { booking, businessHours } = restaurantConfig;
  const maxAdvanceDays = booking.maxAdvanceDays;
  const diningDurationMinutes = booking.defaultDurationMinutes;
  const cancellationCutoffHours = booking.cancellationCutoffHours;
  const partySizes = booking.partySizes;
  const periods = businessHours.periods;
  const defaultInitialTime = booking.dinnerSlots[1] || "18:00";

  const todayStart = getTokyoTodayStart();
  const minDateStr = todayStart.toISOString().split("T")[0];
  const tomorrow = new Date(todayStart);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split("T")[0];

  const maxBookingDate = new Date(todayStart);
  maxBookingDate.setUTCDate(maxBookingDate.getUTCDate() + maxAdvanceDays);
  const maxDateStr = maxBookingDate.toISOString().split("T")[0];

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorMessageRef = useRef(errorMessage);
  useEffect(() => {
    errorMessageRef.current = errorMessage;
  }, [errorMessage]);
  const [slotAvailability, setSlotAvailability] = useState<Record<string, TimeSlot> | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    mode: "onTouched",
    defaultValues: {
      restaurantSlug: DEFAULT_RESTAURANT_SLUG,
      source: "web",
      date: defaultDateStr,
      time: defaultInitialTime,
      partySize: 2,
      customerName: "",
      customerNameKana: "",
      customerPhone: "",
      customerEmail: "",
      note: "",
    },
  });

  const currentDate = watch("date");
  const partySize = watch("partySize");
  const time = watch("time");

  const closedDaysOfWeek = restaurantConfig.businessHours.closedDaysOfWeek ?? [1];
  const isClosedDay = !currentDate ? false : closedDaysOfWeek.includes(getDayOfWeek(currentDate));

  const overnightNotice = (() => {
    if (!currentDate || !time || !time.startsWith("00:")) return null;
    const [y, m, d] = currentDate.split("-").map(Number);
    if (!y || !m || !d) return null;

    const currentObj = new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
    const nextObj = new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0));

    const curLabel = `${currentObj.getUTCMonth() + 1}月${currentObj.getUTCDate()}日（${JAPANESE_WEEKDAYS[currentObj.getUTCDay()]}）`;
    const nextLabel = `${nextObj.getUTCMonth() + 1}月${nextObj.getUTCDate()}日（${JAPANESE_WEEKDAYS[nextObj.getUTCDay()]}）`;
    const displayTime = time.replace(/^00:/, "0:");

    return `※ 翌日 ${nextLabel} ${displayTime} のご来店となります（${curLabel}深夜）`;
  })();

  useEffect(() => {
    let active = true;
    if (!currentDate || !partySize || isClosedDay) {
      setSlotAvailability(null);
      return;
    }

    fetchAvailableSlotsAction(currentDate, partySize as number)
      .then((slots) => {
        if (!active) return;
        const map: Record<string, TimeSlot> = {};
        for (const s of slots) {
          map[s.time] = s;
        }
        setSlotAvailability(map);
      })
      .catch(() => {
        if (active) setSlotAvailability(null);
      });

    return () => {
      active = false;
    };
  }, [currentDate, partySize, isClosedDay]);

  const getSlotStatus = (slotTime: string): "○" | "△" | "×" => {
    if (isClosedDay) return "×";
    if (!slotAvailability) return "○";
    const slot = slotAvailability[slotTime];
    if (!slot) return "×";
    if (!slot.available || slot.remainingTables <= 0) return "×";
    if (slot.remainingTables <= 1) return "△";
    return "○";
  };

  // Reset stale errors when Activity hides this component during navigation
  useIsomorphicLayoutEffect(() => {
    return () => {
      setErrorMessage(null);
      clearErrors();
    };
  }, [clearErrors]);

  // Reset errors when route pathname changes
  useEffect(() => {
    if (pathname) {
      setErrorMessage(null);
      clearErrors();
    }
  }, [pathname, clearErrors]);

  // Clear submission error message when user modifies any form input.
  // Uses a ref so the subscription is not re-created whenever errorMessage changes.
  useEffect(() => {
    const subscription = watch(() => {
      if (errorMessageRef.current) {
        setErrorMessage(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const fillDemoData = () => {
    reset({
      restaurantSlug: DEFAULT_RESTAURANT_SLUG,
      source: "web",
      date: defaultDateStr,
      time: defaultInitialTime,
      partySize: 2,
      customerName: "佐藤 健一",
      customerNameKana: "サトウ ケンイチ",
      customerPhone: "090-1234-5678",
      customerEmail: "sato.k@example.com",
    });
    setErrorMessage(null);
    clearErrors();
  };

  const onSubmit = async (values: ReservationFormValues) => {
    setErrorMessage(null);

    try {
      const res = await createReservationAction({
        ...values,
        idempotencyKey,
      });

      if (!res.success) {
        setErrorMessage(res.message);
        if (res.fieldErrors) {
          for (const [key, msg] of Object.entries(res.fieldErrors)) {
            if (msg) {
              setError(key as keyof ReservationFormValues, {
                type: "server",
                message: msg,
              });
            }
          }
        }
        return;
      }

      router.push(`/reservations/${res.reservationId}?token=${res.cancellationToken}`);
    } catch (err: unknown) {
      const error = err as { message?: string } | undefined;
      setErrorMessage(error?.message || "予期しないエラーが発生しました。");
    }
  };

  return (
    <>
      <div className="mt-3 flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fillDemoData}
          className="border-stone-300 text-[11px] text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          テスト用情報を入力
        </Button>
      </div>

      {errorMessage && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">ご予約を受け付けられませんでした</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-8 rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8 space-y-8"
      >
        {/* Step 1: Date, time, and party size */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">1. ご来店日時と人数</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ご来店日・時間を選択してください（お席のご利用時間は
              {diningDurationMinutes}分制です）
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">ご利用人数</Label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {partySizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setValue("partySize", size, { shouldValidate: true })}
                  className={`flex h-10 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                    partySize === size
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  {size}名
                </button>
              ))}
            </div>
            <FieldError error={errors.partySize?.message} showIcon />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="date" className="text-xs font-semibold text-foreground">
                ご来店日
              </Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setValue("date", minDateStr, { shouldValidate: true })}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium border transition ${
                    currentDate === minDateStr
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  今日
                </button>
                <button
                  type="button"
                  onClick={() => setValue("date", defaultDateStr, { shouldValidate: true })}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium border transition ${
                    currentDate === defaultDateStr
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  明日
                </button>
              </div>
            </div>
            <Input
              id="date"
              type="date"
              {...register("date")}
              min={minDateStr}
              max={maxDateStr}
              required
              className={`h-10 text-xs ${errors.date ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            <FieldError error={errors.date?.message} showIcon />
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">ご予約時間</Label>
              <span className="text-[10px] text-muted-foreground">
                ○ 空席あり / △ 残りわずか / × 満席
              </span>
            </div>

            {isClosedDay ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                ご選択いただいた日程は定休日です。別の日程をお選びください。
              </div>
            ) : (
              periods.map((period, idx) => {
                const slots =
                  period.name === "lunch"
                    ? (booking?.lunchSlots ?? [])
                    : (booking?.dinnerSlots ?? []);

                return (
                  <div key={period.name} className={idx > 0 ? "pt-2" : ""}>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {period.label}
                    </span>
                    <div className="mt-1.5 grid grid-cols-4 gap-2">
                      {slots.map((slot) => {
                        const status = getSlotStatus(slot);
                        const isFull = status === "×";
                        const isOvernightSlot = period.name === "dinner" && slot.startsWith("00:");
                        const displaySlot = isOvernightSlot ? slot.replace(/^00:/, "0:") : slot;
                        const slotLabel = isOvernightSlot ? `翌${displaySlot}` : slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isFull}
                            onClick={() => setValue("time", slot, { shouldValidate: true })}
                            className={`flex h-9 items-center justify-center gap-1 rounded-md border text-xs font-medium transition ${
                              time === slot
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : isFull
                                  ? "border-border/60 bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                                  : "border-border bg-card text-foreground hover:border-primary/50"
                            }`}
                          >
                            <span>{slotLabel}</span>
                            <span
                              className={`text-[10px] ${
                                time === slot
                                  ? "text-primary-foreground/80"
                                  : status === "○"
                                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                    : status === "△"
                                      ? "text-amber-600 dark:text-amber-400 font-semibold"
                                      : "text-muted-foreground/60"
                              }`}
                            >
                              {status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
            {overnightNotice && (
              <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-300">
                {overnightNotice}
              </p>
            )}
            <FieldError error={errors.time?.message} showIcon />
          </div>
        </section>

        {/* Step 2: Customer contact details */}
        <section className="space-y-2 pt-6 border-t border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">2. 代表者情報</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              予約確認・キャンセル用のURLをメールでお送りします
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="customerName" className="text-xs font-semibold">
                お名前 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                placeholder="例：佐藤 健一"
                {...register("customerName")}
                required
                className={`h-9 text-xs ${errors.customerName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <FieldError error={errors.customerName?.message} showIcon />
            </div>

            <div className="space-y-1">
              <Label htmlFor="customerNameKana" className="text-xs font-semibold">
                フリガナ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerNameKana"
                placeholder="例：サトウ ケンイチ"
                {...register("customerNameKana")}
                required
                className={`h-9 text-xs ${errors.customerNameKana ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <FieldError error={errors.customerNameKana?.message} showIcon />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="customerPhone" className="text-xs font-semibold">
                電話番号 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="例：090-1234-5678"
                {...register("customerPhone")}
                required
                className={`h-9 text-xs ${errors.customerPhone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <FieldError error={errors.customerPhone?.message} showIcon />
            </div>

            <div className="space-y-1">
              <Label htmlFor="customerEmail" className="text-xs font-semibold">
                メールアドレス <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="例：sato@example.com"
                {...register("customerEmail")}
                required
                className={`h-9 text-xs ${errors.customerEmail ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <FieldError error={errors.customerEmail?.message} showIcon />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="note" className="text-xs font-semibold">
              ご要望・備考（任意）
            </Label>
            <textarea
              id="note"
              rows={2}
              maxLength={100}
              placeholder="100文字以内。"
              {...register("note")}
              className="w-full rounded-md border border-input bg-transparent p-2.5 text-xs text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <FieldError error={errors.note?.message} showIcon />
          </div>
        </section>

        <div className="space-y-3 pt-2">
          <p className="text-center text-[11px] text-muted-foreground">
            ※ ご予約確定後、お送りするURLから確認・キャンセルができます（
            {cancellationCutoffHours}時間前まで）。
          </p>
          <Button
            type="submit"
            disabled={isSubmitting || isClosedDay || !time || getSlotStatus(time) === "×"}
            className="h-12 w-full bg-primary font-serif text-sm font-semibold tracking-widest text-primary-foreground shadow-xs transition hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                予約を送信しています...
              </>
            ) : (
              "この内容で予約を確定する"
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

const SKELETON_PARTY_KEYS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"] as const;
const SKELETON_SLOT_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;

export function ReservationFormSkeleton() {
  return (
    <div className="mt-8 space-y-8 animate-pulse">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {SKELETON_PARTY_KEYS.map((k) => (
            <div key={k} className="h-10 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-10 w-full rounded-md bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {SKELETON_SLOT_KEYS.map((k) => (
              <div key={k} className="h-10 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
