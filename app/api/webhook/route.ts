import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { updateState, readState } from "@/lib/state";
import {
  calculateReductionSeconds,
  remainingSeconds,
  formatHHMMSS,
  now,
} from "@/lib/time";

interface WebhookPayload {
  id: string;
  type: string;
  message: string;
  amount: number;
  hasRecording: boolean;
  gifUrl: string;
  pollingTitle: string | null;
  pollingOptionId: string | null;
  pollingOptionTitle: string | null;
  soundboardName: string | null;
  soundboardSoundId: string | null;
  gifterId: string | null;
  gifterName: string;
  gifterEmail: string;
  creatorId: string;
  creatorUsername: string;
  creatorName: string;
  mediaType: string | null;
  mediaId: string | null;
  mediaStartTime: number | null;
  createdAt: string;
  updatedAt: string;
  expiredAt: string;
}

async function handleWebhookbak(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as WebhookPayload;

    // Validate required fields
    if (!body.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (body.type !== "alert") {
      return NextResponse.json(
        { error: "Invalid type, expected 'alert'" },
        { status: 400 },
      );
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    // Check for duplicate
    const currentState = await readState();
    if (currentState.lastProcessedWebhookIds.includes(body.id)) {
      return NextResponse.json(
        { message: "duplicate ignored" },
        { status: 200 },
      );
    }

    // Process the webhook
    const reductionSecs = calculateReductionSeconds(
      body.amount,
      currentState.rpPerUnit,
      currentState.secondsPerUnit,
    );

    const updatedState = await updateState((state) => {
      // Re-check duplicate inside mutex
      if (state.lastProcessedWebhookIds.includes(body.id)) {
        return state;
      }

      const target = new Date(state.targetAt).getTime();
      const reduced = target - reductionSecs * 1000;
      const current = now().getTime();
      // If reduced time is at or before now, set target to now (immediately 0)
      const newTargetAt = new Date(Math.max(reduced, current)).toISOString();

      const updatedIds = [...state.lastProcessedWebhookIds, body.id];
      if (updatedIds.length > 100) {
        updatedIds.shift();
      }

      return {
        ...state,
        targetAt: newTargetAt,
        lastProcessedWebhookIds: updatedIds,
        lastDonation: {
          id: body.id,
          gifterName: body.gifterName || "Anonymous",
          amount: body.amount,
          reductionSeconds: reductionSecs,
          timestamp: new Date().toISOString(),
        },
      };
    });

    const remaining = remainingSeconds(updatedState.targetAt);

    return NextResponse.json({
      targetAt: updatedState.targetAt,
      reductionSeconds: reductionSecs,
      remainingSeconds: remaining,
      formattedHHMMSS: formatHHMMSS(remaining),
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleWebhook(request: NextRequest): Promise<NextResponse> {
  try {
    const webhookToken = process.env.TAKO_WEBHOOK_TOKEN || "";

    // 1️⃣ Get signature from header
    const takoSignature = request.headers.get("x-tako-signature") || "";

    if (!webhookToken) {
      console.error("Webhook token not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }

    if (!takoSignature) {
      return NextResponse.json(
        { error: "Missing X-Tako-Signature header" },
        { status: 401 },
      );
    }

    // 2️⃣ Get raw body (IMPORTANT)
    const rawBody = await request.text();

    // 3️⃣ Compute HMAC SHA-256
    const computedSignature = crypto
      .createHmac("sha256", webhookToken)
      .update(rawBody)
      .digest("hex");

    // 4️⃣ Timing safe comparison
    const isValid =
      computedSignature.length === takoSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(computedSignature),
        Buffer.from(takoSignature),
      );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 5️⃣ Parse JSON only after signature validated
    const body = JSON.parse(rawBody) as WebhookPayload;

    // =====================
    // Your existing logic
    // =====================

    if (!body.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (body.type !== "alert") {
      return NextResponse.json(
        { error: "Invalid type, expected 'alert'" },
        { status: 400 },
      );
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    const currentState = await readState();

    if (currentState.lastProcessedWebhookIds.includes(body.id)) {
      return NextResponse.json(
        { message: "duplicate ignored" },
        { status: 200 },
      );
    }

    const reductionSecs = calculateReductionSeconds(
      body.amount,
      currentState.rpPerUnit,
      currentState.secondsPerUnit,
    );

    const updatedState = await updateState((state) => {
      if (state.lastProcessedWebhookIds.includes(body.id)) {
        return state;
      }

      const target = new Date(state.targetAt).getTime();
      const reduced = target - reductionSecs * 1000;
      const current = now().getTime();

      const newTargetAt = new Date(Math.max(reduced, current)).toISOString();

      const updatedIds = [...state.lastProcessedWebhookIds, body.id];
      if (updatedIds.length > 100) updatedIds.shift();

      return {
        ...state,
        targetAt: newTargetAt,
        lastProcessedWebhookIds: updatedIds,
        lastDonation: {
          id: body.id,
          gifterName: body.gifterName || "Anonymous",
          amount: body.amount,
          reductionSeconds: reductionSecs,
          timestamp: new Date().toISOString(),
        },
      };
    });

    const remaining = remainingSeconds(updatedState.targetAt);

    return NextResponse.json({
      targetAt: updatedState.targetAt,
      reductionSeconds: reductionSecs,
      remainingSeconds: remaining,
      formattedHHMMSS: formatHHMMSS(remaining),
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return handleWebhook(request);
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect("https://wahyupratama.web.id");
}

export async function PUT(request: NextRequest) {
  return handleWebhook(request);
}

export async function PATCH(request: NextRequest) {
  return handleWebhook(request);
}

export async function DELETE(request: NextRequest) {
  return handleWebhook(request);
}
