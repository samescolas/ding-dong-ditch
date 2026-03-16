import { getConfig } from "../config/store.js";
import { getStorage } from "../storage/index.js";

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

async function cleanup(): Promise<void> {
  const { retentionDays } = getConfig().defaults;
  if (!retentionDays || retentionDays <= 0) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  await getStorage().deleteOlderThan(cutoffStr);
}

export function startCleanup(): void {
  cleanup().catch((e) => console.error("[cleanup] error:", (e as Error).message));
  setInterval(() => {
    cleanup().catch((e) => console.error("[cleanup] error:", (e as Error).message));
  }, CLEANUP_INTERVAL);
  console.log(`[cleanup] running every hour`);
}
