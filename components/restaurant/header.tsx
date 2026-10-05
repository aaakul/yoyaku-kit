"use client";

import { Menu as MenuIcon, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { restaurantConfig } from "@/config/restaurant";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center" onClick={closeMenu}>
          <span className="font-serif text-lg font-bold tracking-wider text-foreground transition-colors sm:text-xl">
            {restaurantConfig.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-stone-700 dark:text-stone-300 md:flex">
          <Link href="/#about" className="transition hover:text-primary">
            当店について
          </Link>
          <Link href="/#menu" className="transition hover:text-primary">
            お品書き
          </Link>
          <Link href="/#access" className="transition hover:text-primary">
            営業時間・アクセス
          </Link>
          <Link href="/#news" className="transition hover:text-primary">
            お知らせ
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <Link
            href="/#reservation"
            onClick={closeMenu}
            className="inline-flex items-center justify-center rounded bg-primary px-4 py-2 text-xs font-semibold tracking-wider text-primary-foreground shadow-xs transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          >
            ご予約
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-stone-700 transition hover:bg-accent dark:text-stone-300 md:hidden"
            aria-expanded={isOpen}
            aria-label="メニューを開く"
          >
            {isOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-b border-border bg-background px-4 py-5 shadow-lg md:hidden">
          <nav className="flex flex-col space-y-4 text-center font-serif text-base font-medium">
            <Link
              href="/#about"
              onClick={closeMenu}
              className="py-1 text-stone-700 transition hover:text-primary dark:text-stone-200"
            >
              当店について
            </Link>
            <Link
              href="/#menu"
              onClick={closeMenu}
              className="py-1 text-stone-700 transition hover:text-primary dark:text-stone-200"
            >
              お品書き
            </Link>
            <Link
              href="/#access"
              onClick={closeMenu}
              className="py-1 text-stone-700 transition hover:text-primary dark:text-stone-200"
            >
              営業時間・アクセス
            </Link>
            <Link
              href="/#news"
              onClick={closeMenu}
              className="py-1 text-stone-700 transition hover:text-primary dark:text-stone-200"
            >
              お知らせ
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
