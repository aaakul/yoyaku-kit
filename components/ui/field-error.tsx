import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: string | null;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function FieldError({
  error,
  showIcon = false,
  children,
  className,
  ...props
}: FieldErrorProps) {
  const hasError = Boolean(error || children);
  const content = error ?? children;

  return (
    <p
      role="alert"
      aria-live="polite"
      aria-hidden={!hasError}
      className={cn(
        "min-h-4 text-[11px] font-medium leading-tight transition-opacity duration-150",
        showIcon && "flex items-center gap-1",
        hasError ? "text-destructive opacity-100" : "invisible opacity-0 select-none",
        className,
      )}
      {...props}
    >
      {hasError ? (
        <>
          {showIcon && <AlertCircle className="size-3 shrink-0" />}
          <span>{content}</span>
        </>
      ) : (
        "\u00A0"
      )}
    </p>
  );
}
