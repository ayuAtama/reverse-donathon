import { NextRequest, NextResponse } from "next/server";
import { updateState, readState } from "@/lib/state";
import { formatSecondsPerUnit } from "@/lib/time";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !ADMIN_PASSWORD) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === ADMIN_PASSWORD;
}

interface AdminPatchBody {
  targetAt?: string;
  rpPerUnit?: number;
  secondsPerUnit?: number;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await readState();
    return NextResponse.json({
      targetAt: state.targetAt,
      initialTargetAt: state.initialTargetAt,
      rpPerUnit: state.rpPerUnit,
      secondsPerUnit: state.secondsPerUnit,
      rateLabel: `Rp ${state.rpPerUnit.toLocaleString("id-ID")} / ${formatSecondsPerUnit(state.secondsPerUnit)}`,
    });
  } catch (error) {
    console.error("Admin GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as AdminPatchBody;

    // Validate targetAt if provided
    if (body.targetAt !== undefined) {
      const parsed = new Date(body.targetAt);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid targetAt datetime" },
          { status: 400 },
        );
      }
    }

    // Validate rpPerUnit if provided
    if (body.rpPerUnit !== undefined) {
      if (typeof body.rpPerUnit !== "number" || body.rpPerUnit <= 0) {
        return NextResponse.json(
          { error: "rpPerUnit must be a positive number" },
          { status: 400 },
        );
      }
    }

    // Validate secondsPerUnit if provided
    if (body.secondsPerUnit !== undefined) {
      if (typeof body.secondsPerUnit !== "number" || body.secondsPerUnit <= 0) {
        return NextResponse.json(
          { error: "secondsPerUnit must be a positive number" },
          { status: 400 },
        );
      }
    }

    const updatedState = await updateState((state) => {
      const newState = { ...state };

      if (body.targetAt !== undefined) {
        const newTarget = new Date(body.targetAt).toISOString();
        newState.targetAt = newTarget;
        // Reset initialTargetAt to the new target so percentage
        // is calculated as 100% at the moment of update and counts
        // down to 0% when the target is reached.
        newState.initialTargetAt = newTarget;
      }

      if (body.rpPerUnit !== undefined) {
        newState.rpPerUnit = body.rpPerUnit;
      }

      if (body.secondsPerUnit !== undefined) {
        newState.secondsPerUnit = body.secondsPerUnit;
      }

      return newState;
    });

    return NextResponse.json({
      message: "State updated",
      targetAt: updatedState.targetAt,
      rpPerUnit: updatedState.rpPerUnit,
      secondsPerUnit: updatedState.secondsPerUnit,
      rateLabel: `Rp ${updatedState.rpPerUnit.toLocaleString("id-ID")} / ${formatSecondsPerUnit(updatedState.secondsPerUnit)}`,
    });
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
