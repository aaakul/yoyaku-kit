"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

export interface SubpageHeaderProps {
  backHref?: string;
  backLabel?: string;
}

export function SubpageHeader({ backHref = "/", backLabel }: SubpageHeaderProps) {
  const tCommon = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
        >
          <ChevronLeft className="size-4" />
          {backLabel ?? tCommon("restaurant_name")}
        </Link>
        <span className="font-serif text-sm font-bold tracking-widest text-primary">
          {tCommon("restaurant_name")}
        </span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle
            lightLabel={tCommon("theme_light")}
            darkLabel={tCommon("theme_dark")}
            ariaLabel={tCommon("theme_toggle_aria")}
          />
        </div>
      </div>
    </header>
  );
}
