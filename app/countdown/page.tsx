"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CountdownData {
  targetAt: string;
  remainingSeconds: number;
  formattedHHMMSS: string;
  percentageRemaining: number;
  rpPerUnit: number;
  timeUnit: string;
}

function formatJakartaClient(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

export default function CountdownPage() {
  const [data, setData] = useState<CountdownData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCountdown = useCallback(async () => {
    try {
      const res = await fetch("/api/countdown", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = (await res.json()) as CountdownData;
      setData(json);
      setError(null);
    } catch {
      setError("Failed to connect to server");
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchCountdown();
    const interval = setInterval(fetchCountdown, 1000);
    return () => clearInterval(interval);
  }, [fetchCountdown]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Donation Countdown
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Every donation reduces the timer
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : !data ? (
            <p className="text-muted-foreground font-mono">Loading...</p>
          ) : (
            <>
              {/* Digital Timer */}
              <div className="flex items-center justify-center rounded-lg bg-secondary px-8 py-6">
                <span className="font-mono text-6xl font-bold tracking-widest text-foreground sm:text-7xl">
                  {data.formattedHHMMSS}
                </span>
              </div>

              {/* Target Date */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Target (Asia/Jakarta)
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {formatJakartaClient(data.targetAt)}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    Time Remaining
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {data.percentageRemaining}%
                  </span>
                </div>
                <Progress value={data.percentageRemaining} className="h-3" />
              </div>

              {/* Stats */}
              <div className="flex w-full gap-4">
                <div className="flex-1 rounded-md bg-secondary p-3 text-center">
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="text-sm font-semibold text-foreground">
                    Rp {data.rpPerUnit.toLocaleString()} / {data.timeUnit === "minutes" ? "min" : "sec"}
                  </p>
                </div>
                <div className="flex-1 rounded-md bg-secondary p-3 text-center">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-sm font-semibold text-foreground">
                    {data.remainingSeconds.toLocaleString()}s
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
