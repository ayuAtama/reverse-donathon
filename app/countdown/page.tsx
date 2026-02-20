"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LastDonation {
  id: string;
  gifterName: string;
  amount: number;
  reductionSeconds: number;
  timestamp: string;
}

interface CountdownData {
  targetAt: string;
  remainingSeconds: number;
  formattedHHMMSS: string;
  percentageRemaining: number;
  rpPerUnit: number;
  secondsPerUnit: number;
  rateLabel: string;
  lastDonation: LastDonation | null;
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

function formatReduction(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0) parts.push(`${seconds} sec`);
  return parts.join(" ") || "0 sec";
}

export default function CountdownPage() {
  const [data, setData] = useState<CountdownData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrated, setCelebrated] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevRemainingRef = useRef<number | null>(null);

  // Donation effect state
  const [donationEffect, setDonationEffect] = useState<{
    gifterName: string;
    amount: number;
    reductionText: string;
  } | null>(null);
  const lastSeenDonationIdRef = useRef<string | null>(null);
  const donationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireCelebration = useCallback(() => {
    if (celebrated) return;
    setCelebrated(true);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    import("canvas-confetti").then((mod) => {
      const fire = mod.default;
      const duration = 5000;
      const end = Date.now() + duration;

      const frame = () => {
        fire({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#ff0000", "#ff9900", "#ffff00", "#33cc33", "#0099ff", "#9933ff"],
        });
        fire({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#ff0000", "#ff9900", "#ffff00", "#33cc33", "#0099ff", "#9933ff"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    });
  }, [celebrated]);

  const showDonationEffect = useCallback(
    (donation: LastDonation) => {
      // Clear any existing timer
      if (donationTimerRef.current) {
        clearTimeout(donationTimerRef.current);
      }

      setDonationEffect({
        gifterName: donation.gifterName,
        amount: donation.amount,
        reductionText: formatReduction(donation.reductionSeconds),
      });

      // Clear after 10 seconds
      donationTimerRef.current = setTimeout(() => {
        setDonationEffect(null);
        donationTimerRef.current = null;
      }, 10000);
    },
    []
  );

  const fetchCountdown = useCallback(async () => {
    try {
      const res = await fetch("/api/countdown", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = (await res.json()) as CountdownData;
      setData(json);
      setError(null);

      // Detect new donation
      if (
        json.lastDonation &&
        json.lastDonation.id !== lastSeenDonationIdRef.current
      ) {
        // Only show effect if we've already loaded once (skip initial)
        if (lastSeenDonationIdRef.current !== null) {
          showDonationEffect(json.lastDonation);
        }
        lastSeenDonationIdRef.current = json.lastDonation.id;
      }

      // Detect transition to zero
      if (
        prevRemainingRef.current !== null &&
        prevRemainingRef.current > 0 &&
        json.remainingSeconds === 0
      ) {
        fireCelebration();
      }
      prevRemainingRef.current = json.remainingSeconds;
    } catch {
      setError("Failed to connect to server");
    }
  }, [fireCelebration, showDonationEffect]);

  useEffect(() => {
    setMounted(true);
    fetchCountdown();
    const interval = setInterval(fetchCountdown, 1000);
    return () => {
      clearInterval(interval);
      if (donationTimerRef.current) clearTimeout(donationTimerRef.current);
    };
  }, [fetchCountdown]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground font-mono">Loading...</div>
      </div>
    );
  }

  const isFinished = data && data.remainingSeconds === 0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <audio
        ref={audioRef}
        src="https://cdn.freesound.org/previews/270/270402_5123451-lq.mp3"
        preload="auto"
      />
      <Card className="w-full max-w-lg relative overflow-hidden">
        {/* Donation blink effect */}
        {donationEffect && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/90 animate-donation-blink">
            <p className="text-sm font-medium text-muted-foreground">
              {donationEffect.gifterName} donated Rp {donationEffect.amount.toLocaleString("id-ID")}
            </p>
            <p className="font-mono text-5xl font-bold text-red-500 mt-2 sm:text-6xl">
              {"-"}{donationEffect.reductionText}
            </p>
          </div>
        )}

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
              <div
                className={`flex items-center justify-center rounded-lg px-8 py-6 transition-colors ${
                  isFinished ? "bg-green-500/15" : "bg-secondary"
                }`}
              >
                <span
                  className={`font-mono text-6xl font-bold tracking-widest sm:text-7xl ${
                    isFinished
                      ? "text-green-500 animate-pulse"
                      : "text-foreground"
                  }`}
                >
                  {data.formattedHHMMSS}
                </span>
              </div>

              {isFinished && (
                <div className="rounded-md bg-green-500/15 px-4 py-2 text-center">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Countdown Complete!
                  </p>
                </div>
              )}

              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Target (Asia/Jakarta)
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {formatJakartaClient(data.targetAt)}
                </p>
              </div>

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

              <div className="flex w-full gap-4">
                <div className="flex-1 rounded-md bg-secondary p-3 text-center">
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="text-sm font-semibold text-foreground">
                    {data.rateLabel}
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
