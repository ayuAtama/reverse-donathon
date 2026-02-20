import fs from "fs";
import path from "path";
import { stateMutex } from "./mutex";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

export interface AppState {
  targetAt: string;
  initialTargetAt: string;
  rpPerUnit: number;
  timeUnit: "seconds" | "minutes";
  lastProcessedWebhookIds: string[];
}

function getDefaults(): AppState {
  const initialTarget =
    process.env.INITIAL_TARGET_DATETIME || "2026-02-28T15:00:00+07:00";
  const rpPerUnit = parseInt(process.env.RP_PER_UNIT || "1000", 10);
  const timeUnitRaw = process.env.TIME_UNIT || "seconds";
  const timeUnit: "seconds" | "minutes" =
    timeUnitRaw === "minutes" ? "minutes" : "seconds";

  return {
    targetAt: new Date(initialTarget).toISOString(),
    initialTargetAt: new Date(initialTarget).toISOString(),
    rpPerUnit,
    timeUnit,
    lastProcessedWebhookIds: [],
  };
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Read state from file. If file doesn't exist, create it with defaults.
 */
export async function readState(): Promise<AppState> {
  ensureDataDir();

  if (!fs.existsSync(STATE_FILE)) {
    const defaults = getDefaults();
    await writeStateUnsafe(defaults);
    return defaults;
  }

  const raw = fs.readFileSync(STATE_FILE, "utf-8");
  return JSON.parse(raw) as AppState;
}

/**
 * Write state atomically (temp file + rename). Does NOT acquire mutex.
 */
async function writeStateUnsafe(state: AppState): Promise<void> {
  ensureDataDir();
  const tempFile = path.join(DATA_DIR, `state.tmp.${Date.now()}.json`);
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tempFile, STATE_FILE);
}

/**
 * Read state, apply updater, write back. Runs inside mutex.
 */
export async function updateState(
  updater: (state: AppState) => AppState
): Promise<AppState> {
  return stateMutex.runExclusive(async () => {
    const current = await readState();
    const updated = updater(current);
    await writeStateUnsafe(updated);
    return updated;
  });
}
