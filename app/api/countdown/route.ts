import { NextResponse } from "next/server";
import { readState } from "@/lib/state";
import {
  remainingSeconds,
  formatHHMMSS,
  percentageRemaining,
} from "@/lib/time";

export async function GET() {
  try {
    const state = await readState();
    const remaining = remainingSeconds(state.targetAt);
    const pct = percentageRemaining(state.initialTargetAt, state.targetAt);

    return NextResponse.json({
      targetAt: state.targetAt,
      remainingSeconds: remaining,
      formattedHHMMSS: formatHHMMSS(remaining),
      percentageRemaining: pct,
      rpPerUnit: state.rpPerUnit,
      timeUnit: state.timeUnit,
    });
  } catch (error) {
    console.error("Countdown error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
