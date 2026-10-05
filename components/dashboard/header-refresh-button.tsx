"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function HeaderRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-foreground"
      onClick={handleRefresh}
      disabled={isPending}
      aria-label="最新の状態に更新"
      title="最新の状態に更新"
    >
      <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
    </Button>
  );
}
