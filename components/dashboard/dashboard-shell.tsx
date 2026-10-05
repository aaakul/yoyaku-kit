"use client";

import {
  Armchair,
  CalendarDays,
  ExternalLink,
  History,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Store,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HeaderRefreshButton } from "@/components/dashboard/header-refresh-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { restaurantConfig } from "@/config/restaurant";
import { authClient } from "@/lib/auth/auth-client";

interface NavGroup {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    managerOnly?: boolean;
  }[];
}

const navGroups: NavGroup[] = [
  {
    title: "店舗運営",
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: LayoutGrid },
      {
        href: "/dashboard/reservations",
        label: "予約管理",
        icon: CalendarDays,
      },
      {
        href: "/dashboard/tables",
        label: "座席管理",
        icon: Armchair,
        managerOnly: true,
      },
      {
        href: "/dashboard/logs",
        label: "操作ログ",
        icon: History,
        managerOnly: true,
      },
    ],
  },
  {
    title: "コンテンツ管理",
    items: [
      {
        href: "/dashboard/news",
        label: "お知らせ管理",
        icon: Megaphone,
        managerOnly: true,
      },
    ],
  },
  {
    title: "システム設定",
    items: [
      {
        href: "/dashboard/settings/accounts",
        label: "アカウント管理",
        icon: Users,
        managerOnly: true,
      },
      {
        href: "/dashboard/settings/profile",
        label: "アカウント設定",
        icon: Settings,
      },
    ],
  },
];

interface DashboardShellProps {
  children: React.ReactNode;
  initialUser?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
}

export function DashboardShell({ children, initialUser }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: session } = authClient.useSession();

  const userRole =
    (session?.user as { role?: string } | undefined)?.role || initialUser?.role || "manager";
  const userName = session?.user?.name || initialUser?.name;
  const userEmail = session?.user?.email || initialUser?.email;

  useEffect(() => {
    const saved = localStorage.getItem("dashboard_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("dashboard_sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="サイドバーを閉じる"
          className="fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-xs lg:hidden cursor-default"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-border bg-card shadow-xs transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-16" : "lg:w-64"} w-64`}
      >
        <div
          className={`flex h-16 items-center border-b border-border px-3 ${
            isCollapsed ? "justify-center" : "justify-between px-4"
          }`}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-serif font-bold text-foreground overflow-hidden"
            onClick={() => setIsSidebarOpen(false)}
            title={restaurantConfig.name}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <UtensilsCrossed className="size-4" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-semibold tracking-wide leading-tight truncate">
                  {restaurantConfig.name}
                </span>
                <span className="text-[10px] font-sans font-normal text-muted-foreground">
                  店舗管理コンソール
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="サイドバーを閉じる"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3 text-sm">
          {navGroups.map((group) => {
            const canAccessManager = userRole === "manager" || userRole === "demo";
            const visibleItems = group.items.filter(
              (item) => !item.managerOnly || canAccessManager,
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {!isCollapsed ? (
                  <div className="px-3 text-[11px] font-medium tracking-wider text-muted-foreground">
                    {group.title}
                  </div>
                ) : (
                  <div className="my-1 border-t border-border" />
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        title={isCollapsed ? item.label : undefined}
                        className={`group flex items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                          isCollapsed ? "justify-center" : "justify-between"
                        } ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon
                            className={`size-5 shrink-0 transition-colors ${
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          />
                          {!isCollapsed && <span>{item.label}</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border p-2 space-y-2">
          {!isCollapsed ? (
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <Store className="size-3.5" />
                店舗サイトを確認
              </span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </Link>
          ) : (
            <Link
              href="/"
              target="_blank"
              title="店舗サイトを確認"
              className="flex items-center justify-center rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Store className="size-4 shrink-0" />
            </Link>
          )}

          {!isCollapsed ? (
            <div className="flex items-center justify-between rounded-lg p-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback
                    className={`text-xs font-medium ${
                      userRole === "manager"
                        ? "bg-primary/10 text-primary"
                        : userRole === "demo"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {userRole === "manager" ? "管理者" : userRole === "demo" ? "デモ" : "店員"}
                  </AvatarFallback>
                </Avatar>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium leading-none truncate">
                      {userName || (userRole === "demo" ? "デモアカウント" : "管理者")}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] h-3.5 px-1 py-0 font-normal ${
                        userRole === "manager"
                          ? "border-primary/30 text-primary bg-primary/10"
                          : userRole === "demo"
                            ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                            : "border-border text-muted-foreground bg-muted/50"
                      }`}
                    >
                      {userRole === "manager"
                        ? "管理者"
                        : userRole === "demo"
                          ? "デモ"
                          : "スタッフ"}
                    </Badge>
                  </div>
                  {userEmail && (
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono">
                      {userEmail}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                title="ログアウト"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 py-1">
              <Avatar
                className="size-8"
                title={userName || (userRole === "demo" ? "デモ" : "管理者")}
              >
                <AvatarFallback
                  className={`text-xs font-medium ${
                    userRole === "manager"
                      ? "bg-primary/10 text-primary"
                      : userRole === "demo"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {userRole === "manager" ? "管理者" : userRole === "demo" ? "デモ" : "店員"}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                title="ログアウト"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-xs sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="メニューを開く"
            >
              <Menu className="size-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden size-8 text-muted-foreground hover:text-foreground lg:flex"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
              title={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="size-5" />
              ) : (
                <PanelLeftClose className="size-5" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <HeaderRefreshButton />

            <ThemeToggle className="size-8 text-muted-foreground hover:text-foreground" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative size-8 rounded-full border border-border p-0"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {userRole === "manager" ? "店" : userRole === "demo" ? "デ" : "員"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium leading-none">
                        {userName ||
                          (userRole === "manager"
                            ? "管理者"
                            : userRole === "demo"
                              ? "デモ"
                              : "スタッフ")}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[9px] h-3.5 px-1 py-0 font-normal border-stone-300"
                      >
                        {userRole === "manager"
                          ? "管理者"
                          : userRole === "demo"
                            ? "デモ"
                            : "スタッフ"}
                      </Badge>
                    </div>
                    {userEmail && (
                      <p className="text-[11px] leading-none text-stone-500 font-mono">
                        {userEmail}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(userRole === "manager" || userRole === "demo") && (
                  <DropdownMenuItem asChild className="cursor-pointer text-xs">
                    <Link href="/dashboard/settings/accounts" className="flex items-center">
                      <Users className="mr-2 size-3.5" />
                      アカウント管理
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link href="/dashboard/settings/profile" className="flex items-center">
                    <Settings className="mr-2 size-3.5" />
                    アカウント設定
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link href="/" target="_blank" className="flex items-center">
                    <ExternalLink className="mr-2 size-3.5" />
                    店舗サイトを表示
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-xs text-red-600 focus:text-red-600 dark:text-red-400"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 size-3.5" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
