import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Serif_JP } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { restaurantConfig } from "@/config/restaurant";

export const metadata: Metadata = {
  title: {
    default: `${restaurantConfig.name} | ${restaurantConfig.tagline}`,
    template: `%s | ${restaurantConfig.name}`,
  },
  description: restaurantConfig.summary,
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
const notoSerif = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      lang="ja"
      className={`scroll-smooth ${manrope.variable} ${notoSerif.variable} ${manrope.className}`}
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
