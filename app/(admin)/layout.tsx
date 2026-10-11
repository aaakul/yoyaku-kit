import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { manrope } from "@/app/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { restaurantConfig } from "@/config/restaurant";

export const metadata: Metadata = {
  title: {
    default: `${restaurantConfig.name} | 管理画面`,
    template: `%s | ${restaurantConfig.name}`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Admin-facing routes (/dashboard, /sign-in) are Japanese-only; lang is fixed.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      lang="ja"
      className={`scroll-smooth ${manrope.variable} ${manrope.className}`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
