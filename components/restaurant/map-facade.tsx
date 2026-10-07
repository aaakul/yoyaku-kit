"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MapFacadeProps {
  embedUrl: string;
}

export function MapFacade({ embedUrl }: MapFacadeProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const triggerLoad = () => {
      setIsLoaded(true);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
        idleId = null;
      }
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    if ("IntersectionObserver" in window && containerRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            triggerLoad();
          }
        },
        { rootMargin: "250px 0px" },
      );
      observer.observe(containerRef.current);
    } else {
      triggerLoad();
      return;
    }

    // Idle fallback: automatically mount after main thread is idle (or max 4s timeout)
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => triggerLoad(), { timeout: 4000 });
    } else {
      timerId = setTimeout(triggerLoad, 4000);
    }

    return () => {
      if (observer) observer.disconnect();
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[240px] flex-1 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-900"
    >
      {isLoaded ? (
        <iframe
          title="周辺地図"
          src={embedUrl}
          width="100%"
          height="100%"
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 text-stone-400 dark:bg-stone-900 dark:text-stone-500 animate-pulse">
          <MapPin className="mb-2 h-6 w-6 text-stone-400 dark:text-stone-600" />
          <span className="font-serif text-xs">地図を読み込み中...</span>
        </div>
      )}
    </div>
  );
}
