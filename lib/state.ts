import fs from "fs";
import path from "path";
import { stateMutex } from "./mutex";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

export interface LastDonation {
  id: string;
  gifterName: string;
  amount: number;
  reductionSeconds: number;
  timestamp: string;
}

export interface AppState {
  targetAt: string;
  initialTargetAt: string;
  rpPerUnit: number;
  secondsPerUnit: number;
  lastProcessedWebhookIds: string[];
  lastDonation: LastDonation | null;
}

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
  const parsed = JSON.parse(raw) as AppState;

  // Migrate old state files that used timeUnit instead of secondsPerUnit
  if ((parsed as Record<string, unknown>)["timeUnit"] !== undefined && parsed.secondsPerUnit === undefined) {
    const oldUnit = (parsed as Record<string, unknown>)["timeUnit"] as string;
    parsed.secondsPerUnit = oldUnit === "minutes" ? 60 : 1;
    delete (parsed as Record<string, unknown>)["timeUnit"];
    await writeStateUnsafe(parsed);
  }

  return parsed;
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
