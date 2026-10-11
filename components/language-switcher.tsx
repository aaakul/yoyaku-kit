"use client";

import { Globe } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

const localeLabels: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

function LanguageSwitcherContent({ className }: { className?: string }) {
  const t = useTranslations("common");
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = (nextLocale: Locale) => {
    if (nextLocale === currentLocale) return;
    const search = searchParams?.toString() ?? "";
    const href = search ? `${pathname}?${search}` : pathname;
    router.replace(href, { locale: nextLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 px-2 gap-1.5 text-xs text-stone-700 hover:text-foreground dark:text-stone-300 ${className || ""}`}
          aria-label={t("language")}
        >
          <Globe className="size-4" />
          <span className="hidden sm:inline font-medium">
            {localeLabels[currentLocale] || currentLocale}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleSelect(loc)}
            className={`cursor-pointer text-xs ${
              loc === currentLocale ? "font-bold text-primary" : ""
            }`}
          >
            {localeLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  return (
    <Suspense
      fallback={
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 px-2 gap-1.5 text-xs text-stone-700 dark:text-stone-300 ${className || ""}`}
          disabled
        >
          <Globe className="size-4" />
        </Button>
      }
    >
      <LanguageSwitcherContent className={className} />
    </Suspense>
  );
}
