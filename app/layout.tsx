import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { restaurantConfig } from "@/config/restaurant";

export const metadata: Metadata = {
  title: {
    default: `${restaurantConfig.name} | ${restaurantConfig.tagline}`,
    template: `%s | ${restaurantConfig.name}`,
  },
  description: `${restaurantConfig.summary} | yoyaku-kitは、小規模飲食店向けの予約・テーブル管理システムです。An open-source restaurant reservation and table management system built with Next.js 16 and PostgreSQL for small restaurants in Japan.`,
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
