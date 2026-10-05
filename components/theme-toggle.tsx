"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

export type ThemeToggleProps = React.ComponentProps<typeof Button>;

export function ThemeToggle({
  className,
  variant = "ghost",
  size = "icon",
  onClick,
  ...props
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    const nextTheme = isDark ? "light" : "dark";
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };

    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(nextTheme);
      return;
    }

    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || left + width / 2;
    const y = e.clientY || top + height / 2;
    const maxRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    doc
      .startViewTransition(() => {
        flushSync(() => setTheme(nextTheme));
      })
      .ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 450,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {});
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleToggle}
      className={className}
      aria-label={mounted && isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      title={mounted && isDark ? "ライトモード" : "ダークモード"}
      disabled={!mounted}
      {...props}
    >
      {mounted && isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
