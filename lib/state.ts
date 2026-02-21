import { ObjectId } from "mongodb";
import { getDb } from "./mongo";

export interface LastDonation {
  id: string;
  gifterName: string;
  amount: number;
  reductionSeconds: number;
  timestamp: string;
}

export interface AppState {
  _id?: string | ObjectId;
  targetAt: string;
  initialTargetAt: string;
  rpPerUnit: number;
  secondsPerUnit: number;
  lastProcessedWebhookIds: string[];
  lastDonation: LastDonation | null;
}

const COLLECTION_NAME = "app_state";
const SINGLETON_ID = "global_state";

function getDefaults(): AppState {
  const initialTarget =
    process.env.INITIAL_TARGET_DATETIME || "2026-02-28T15:00:00+07:00";
  const rpPerUnit = parseInt(process.env.RP_PER_UNIT || "1000", 10);
  const secondsPerUnit = parseInt(process.env.SECONDS_PER_UNIT || "60", 10);

  return {
    targetAt: new Date(initialTarget).toISOString(),
    initialTargetAt: new Date(initialTarget).toISOString(),
    rpPerUnit,
    secondsPerUnit,
    lastProcessedWebhookIds: [],
    lastDonation: null,
  };
}

export async function readState(): Promise<AppState> {
  const db = await getDb();
  const collection = db.collection<AppState>(COLLECTION_NAME);

  let state = await collection.findOne({ _id: SINGLETON_ID as any });

  if (!state) {
    const defaults = {
      _id: SINGLETON_ID,
      ...getDefaults(),
    };

    await collection.insertOne(defaults as any);
    return defaults;
  }

  return state;
}

export async function updateState(
  updater: (state: AppState) => AppState,
): Promise<AppState> {
  const db = await getDb();
  const collection = db.collection<AppState>(COLLECTION_NAME);

  const current = await readState();
  const updated = updater(current);

  await collection.updateOne(
    { _id: SINGLETON_ID as any },
    { $set: updated },
    { upsert: true },
  );

  return updated;
}
