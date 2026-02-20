"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminState {
  targetAt: string;
  rpPerUnit: number;
  secondsPerUnit: number;
  rateLabel: string;
}

function toDatetimeLocalJakarta(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value || "";

    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
  } catch {
    return "";
  }
}

function fromDatetimeLocalJakarta(dtLocal: string): string {
  return new Date(dtLocal + "+07:00").toISOString();
}

function secondsToMinutesAndSeconds(totalSeconds: number): {
  minutes: number;
  seconds: number;
} {
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

// --- Login Gate ---
function LoginForm({
  onLogin,
}: {
  onLogin: (token: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = (await res.json()) as { token: string };
        onLogin(data.token);
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-foreground">
            Admin Login
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the admin password to continue
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logging in..." : "Login"}
            </Button>
            {error && (
              <p className="text-sm text-center text-destructive">{error}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

// --- Admin Panel ---
function AdminPanel({ token }: { token: string }) {
  const [state, setState] = useState<AdminState | null>(null);
  const [targetAtInput, setTargetAtInput] = useState("");
  const [rpPerUnitInput, setRpPerUnitInput] = useState("");
  const [unitMinutes, setUnitMinutes] = useState("0");
  const [unitSeconds, setUnitSeconds] = useState("0");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return;
      if (!res.ok) return;
      const json = (await res.json()) as AdminState;
      setState(json);
      setTargetAtInput(toDatetimeLocalJakarta(json.targetAt));
      setRpPerUnitInput(json.rpPerUnit.toString());
      const { minutes, seconds } = secondsToMinutesAndSeconds(
        json.secondsPerUnit
      );
      setUnitMinutes(minutes.toString());
      setUnitSeconds(seconds.toString());
    } catch {
      setStatus("Failed to load state");
    }
  }, [token]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const body: Record<string, unknown> = {};

      if (targetAtInput) {
        body.targetAt = fromDatetimeLocalJakarta(targetAtInput);
      }

      const rpVal = parseInt(rpPerUnitInput, 10);
      if (!isNaN(rpVal) && rpVal > 0) {
        body.rpPerUnit = rpVal;
      }

      const mins = parseInt(unitMinutes, 10) || 0;
      const secs = parseInt(unitSeconds, 10) || 0;
      const totalSeconds = mins * 60 + secs;
      if (totalSeconds > 0) {
        body.secondsPerUnit = totalSeconds;
      }

      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStatus("Updated successfully");
        await fetchState();
      } else {
        const err = (await res.json()) as { error: string };
        setStatus(`Error: ${err.error}`);
      }
    } catch {
      setStatus("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            Admin Panel
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage countdown settings
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Target DateTime */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="targetAt" className="text-foreground">
                Target Date/Time (Asia/Jakarta)
              </Label>
              <Input
                id="targetAt"
                type="datetime-local"
                step="1"
                value={targetAtInput}
                onChange={(e) => setTargetAtInput(e.target.value)}
              />
            </div>

            {/* RP Per Unit */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="rpPerUnit" className="text-foreground">
                Rupiah per Unit
              </Label>
              <Input
                id="rpPerUnit"
                type="number"
                min="1"
                value={rpPerUnitInput}
                onChange={(e) => setRpPerUnitInput(e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>

            {/* Time Per Unit - verbose */}
            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Time per Unit</Label>
              <p className="text-xs text-muted-foreground">
                How much time each unit removes from the countdown
              </p>
              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="999"
                    value={unitMinutes}
                    onChange={(e) => setUnitMinutes(e.target.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={unitSeconds}
                    onChange={(e) => setUnitSeconds(e.target.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">sec</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {"Current: Rp "}
                {parseInt(rpPerUnitInput, 10).toLocaleString("id-ID") || "..."}{" "}
                {" / "}
                {(() => {
                  const m = parseInt(unitMinutes, 10) || 0;
                  const s = parseInt(unitSeconds, 10) || 0;
                  const parts: string[] = [];
                  if (m > 0) parts.push(`${m} ${m === 1 ? "minute" : "minutes"}`);
                  if (s > 0) parts.push(`${s} ${s === 1 ? "second" : "seconds"}`);
                  return parts.length > 0 ? parts.join(" ") : "0 seconds";
                })()}
              </p>
            </div>

            {/* Submit */}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating..." : "Update Settings"}
            </Button>

            {/* Status */}
            {status && (
              <p
                className={`text-sm text-center ${
                  status.startsWith("Error")
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {status}
              </p>
            )}
          </form>

          {/* Current State */}
          <div className="mt-6 rounded-md bg-secondary p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Current State
            </p>
            <div className="flex flex-col gap-1 text-sm text-foreground font-mono">
              <span>targetAt: {state.targetAt}</span>
              <span>rate: {state.rateLabel}</span>
              <span>secondsPerUnit: {state.secondsPerUnit}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

// --- Main Page ---
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_token");
    if (saved) setToken(saved);
  }, []);

  const handleLogin = (t: string) => {
    setToken(t);
    sessionStorage.setItem("admin_token", t);
  };

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <AdminPanel token={token} />;
}
