"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminState {
  targetAt: string;
  rpPerUnit: number;
  timeUnit: "seconds" | "minutes";
}

function toDatetimeLocalJakarta(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    // Format as yyyy-MM-ddTHH:mm in Jakarta timezone
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
  // Convert datetime-local value (assumed Jakarta) to ISO
  return new Date(dtLocal + "+07:00").toISOString();
}

export default function AdminPage() {
  const [state, setState] = useState<AdminState | null>(null);
  const [targetAtInput, setTargetAtInput] = useState("");
  const [rpPerUnitInput, setRpPerUnitInput] = useState("");
  const [timeUnitInput, setTimeUnitInput] = useState<"seconds" | "minutes">(
    "seconds"
  );
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as AdminState;
      setState(json);
      setTargetAtInput(toDatetimeLocalJakarta(json.targetAt));
      setRpPerUnitInput(json.rpPerUnit.toString());
      setTimeUnitInput(json.timeUnit);
    } catch {
      setStatus("Failed to load state");
    }
  }, []);

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

      body.timeUnit = timeUnitInput;

      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
                RP per Unit
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

            {/* Time Unit */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="timeUnit" className="text-foreground">
                Time Unit
              </Label>
              <Select
                value={timeUnitInput}
                onValueChange={(v) =>
                  setTimeUnitInput(v as "seconds" | "minutes")
                }
              >
                <SelectTrigger id="timeUnit">
                  <SelectValue placeholder="Select time unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                </SelectContent>
              </Select>
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
              <span>rpPerUnit: {state.rpPerUnit}</span>
              <span>timeUnit: {state.timeUnit}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
