import { NextRequest, NextResponse } from "next/server";
import { updateState, readState } from "@/lib/state";

interface AdminPatchBody {
  targetAt?: string;
  rpPerUnit?: number;
  timeUnit?: "seconds" | "minutes";
}

export async function GET() {
  try {
    const state = await readState();
    return NextResponse.json({
      targetAt: state.targetAt,
      initialTargetAt: state.initialTargetAt,
      rpPerUnit: state.rpPerUnit,
      timeUnit: state.timeUnit,
    });
  } catch (error) {
    console.error("Admin GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminPatchBody;

    // Validate targetAt if provided
    if (body.targetAt !== undefined) {
      const parsed = new Date(body.targetAt);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid targetAt datetime" },
          { status: 400 }
        );
      }
    }

    // Validate rpPerUnit if provided
    if (body.rpPerUnit !== undefined) {
      if (typeof body.rpPerUnit !== "number" || body.rpPerUnit <= 0) {
        return NextResponse.json(
          { error: "rpPerUnit must be a positive number" },
          { status: 400 }
        );
      }
    }

    // Validate timeUnit if provided
    if (body.timeUnit !== undefined) {
      if (body.timeUnit !== "seconds" && body.timeUnit !== "minutes") {
        return NextResponse.json(
          { error: "timeUnit must be 'seconds' or 'minutes'" },
          { status: 400 }
        );
      }
    }

    const updatedState = await updateState((state) => {
      const newState = { ...state };

      if (body.targetAt !== undefined) {
        newState.targetAt = new Date(body.targetAt).toISOString();
      }

      if (body.rpPerUnit !== undefined) {
        newState.rpPerUnit = body.rpPerUnit;
      }

      if (body.timeUnit !== undefined) {
        newState.timeUnit = body.timeUnit;
      }

      return newState;
    });

    return NextResponse.json({
      message: "State updated",
      targetAt: updatedState.targetAt,
      rpPerUnit: updatedState.rpPerUnit,
      timeUnit: updatedState.timeUnit,
    });
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
