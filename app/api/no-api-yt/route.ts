import { error } from "console";
import { NextResponse } from "next/server";
import { Client } from "youtubei";

export interface SubGoalResult {
  exactGoal: number;
  nextDisplay: string;
}
type YouTubeUnit = "K" | "M" | "B";

export const GET = async () => {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const youtube = new Client();

  if (!channelId) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  // function helper for next sub count goals
  const getNextSubGoal = (displayValue: string) => {
    // Use a regex to safely check for pure numbers (handles < 1000 subs)
    if (/^\d+$/.test(displayValue)) {
      const exactGoal = parseInt(displayValue, 10) + 1;
      return { exactGoal, nextDisplay: exactGoal.toString() };
    }

    // Extract unit and cast it to our YouTubeUnit type
    const unit = displayValue.slice(-1).toUpperCase() as YouTubeUnit;
    const numStr = displayValue.slice(0, -1);

    // Use a Record to strongly type the multipliers map
    const multipliers: Record<YouTubeUnit, number> = {
      K: 1000,
      M: 1000000,
      B: 1000000000,
    };
    const multiplier = multipliers[unit];

    // safeguard against invalis unit
    if (!multiplier) {
      throw new Error("Invalid unit");
    }

    // Count how many decimal places are currently shown
    const decimalIndex = numStr.indexOf(".");
    const decimalPlaces =
      decimalIndex === -1 ? 0 : numStr.length - decimalIndex - 1;

    // Calculate the increment step using integer math to avoid floating point bugs
    // Example: "6.29" has 2 decimals. Scale = 100.
    // 629 + 1 = 630. Then divide by 100 = 6.3
    const scale = Math.pow(10, decimalPlaces);
    const integerValue = Math.round(parseFloat(numStr) * scale);
    const nextFloatValue = (integerValue + 1) / scale;

    // Calculate the exact subscriber target
    const exactGoal = Math.round(nextFloatValue * multiplier);

    // Format the next display value nicely (e.g., keeping "6.3K" instead of "6.30000001K")
    // We use toFixed to match the original decimal length, but parseFloat removes trailing zeros
    const formattedDisplay = parseFloat(nextFloatValue.toFixed(decimalPlaces));

    return {
      exactGoal: exactGoal,
      nextDisplay: formattedDisplay + unit,
    };
  };

  try {
    const currentSubCount = await youtube.getChannel(channelId);
    if (!currentSubCount) {
      throw new Error("Channel not found");
    }
    if (!currentSubCount.subscriberCount) {
      throw new Error("Subscriber count not available");
    }
    const subscriberCount = currentSubCount.subscriberCount.split(" ")[0];
    // call helper to get next sub goal
    const nextSubGoal = getNextSubGoal(subscriberCount);
    // return to client
    return NextResponse.json({
      subscriberCount,
      nextSubGoal: nextSubGoal.nextDisplay,
    });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
};
