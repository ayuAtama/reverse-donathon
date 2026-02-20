"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface CountdownData {
  targetAt: string;
  remainingSeconds: number;
  formattedHHMMSS: string;
  percentageRemaining: number;
  rpPerUnit: number;
  timeUnit: string;
}

function OverlayContent() {
  const searchParams = useSearchParams();
  const minimal = searchParams.get("minimal") === "true";

  const [data, setData] = useState<CountdownData | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchCountdown = useCallback(async () => {
    try {
      const res = await fetch("/api/countdown", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as CountdownData;
      setData(json);
    } catch {
      // Silently fail for OBS overlay
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchCountdown();
    const interval = setInterval(fetchCountdown, 1000);
    return () => clearInterval(interval);
  }, [fetchCountdown]);

  if (!mounted || !data) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <span
          className="font-mono text-7xl font-bold tracking-widest sm:text-8xl lg:text-9xl"
          style={{ color: "#ffffff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
        >
          {data.formattedHHMMSS}
        </span>
        {!minimal && (
          <span
            className="font-mono text-lg tracking-wide"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Rp {data.rpPerUnit.toLocaleString()} / {data.timeUnit === "minutes" ? "min" : "sec"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function OverlayPage() {
  return (
    <>
      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: transparent !important;
          width: 100vw;
          height: 100vh;
        }
      `}</style>
      <Suspense fallback={null}>
        <OverlayContent />
      </Suspense>
    </>
  );
}
