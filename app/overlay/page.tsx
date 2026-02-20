"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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

function formatReduction(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0) parts.push(`${seconds} sec`);
  return parts.join(" ") || "0 sec";
}

function OverlayContent() {
  const searchParams = useSearchParams();
  const minimal = searchParams.get("minimal") === "true";

  const [data, setData] = useState<CountdownData | null>(null);
  const [mounted, setMounted] = useState(false);
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
      audioRef.current.play().catch(() => { });
    }

    import("canvas-confetti").then((mod) => {
      const fire = mod.default;
      const duration = 5000;
      const end = Date.now() + duration;

      const frame = () => {
        fire({
          particleCount: 6,
          angle: 60,
          spread: 65,
          origin: { x: 0, y: 0.6 },
          colors: ["#ff0000", "#ff9900", "#ffff00", "#33cc33", "#0099ff", "#9933ff"],
        });
        fire({
          particleCount: 6,
          angle: 120,
          spread: 65,
          origin: { x: 1, y: 0.6 },
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
      if (donationTimerRef.current) {
        clearTimeout(donationTimerRef.current);
      }

      setDonationEffect({
        gifterName: donation.gifterName,
        amount: donation.amount,
        reductionText: formatReduction(donation.reductionSeconds),
      });

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
      if (!res.ok) return;
      const json = (await res.json()) as CountdownData;
      setData(json);

      // Detect new donation
      if (
        json.lastDonation &&
        json.lastDonation.id !== lastSeenDonationIdRef.current
      ) {
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
      // Silently fail for OBS overlay
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

  if (!mounted || !data) {
    return null;
  }

  const isFinished = data.remainingSeconds === 0;

  return (
    <div className="flex h-screen w-screen items-center justify-center relative">
      {/* Celebration sound */}
      <audio
        ref={audioRef}
        src="https://cdn.freesound.org/previews/270/270402_5123451-lq.mp3"
        preload="auto"
      />

      {/* Donation blink overlay */}
      {donationEffect && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center animate-donation-blink">
          <p
            className="font-mono text-xl tracking-wide"
            style={{ color: "#ef4444", textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}
          >
            {donationEffect.gifterName} - Rp {donationEffect.amount.toLocaleString("id-ID")}
          </p>
          <p
            className="font-mono text-6xl font-bold mt-2 sm:text-7xl lg:text-8xl"
            style={{ color: "#ef4444", textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}
          >
            {"-"}{donationEffect.reductionText}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <span
          className={`font-mono text-7xl font-bold tracking-widest sm:text-8xl lg:text-9xl ${isFinished ? "animate-pulse" : ""
            }`}
          style={{
            color: isFinished ? "#4ade80" : "#ffffff",
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          {data.formattedHHMMSS}
        </span>
        {!minimal && (
          <span
            className="font-mono text-lg tracking-wide"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {data.rateLabel}
          </span>
        )}
        {isFinished && (
          <span
            className="font-mono text-2xl font-bold tracking-wider animate-pulse"
            style={{ color: "#4ade80", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
          >
            COMPLETE!
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
