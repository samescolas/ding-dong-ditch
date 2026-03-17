import { getConfig } from "../config/store.js";
import { getStorage } from "../storage/index.js";
import { deleteRecordingsOlderThan } from "../db/recordings.js";
import { log } from "../logger.js";

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

async function cleanup(): Promise<void> {
  const { retentionDays } = getConfig().defaults;
  if (!retentionDays || retentionDays <= 0) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  await getStorage().deleteOlderThan(cutoffStr);

  try {
    const count = deleteRecordingsOlderThan(cutoffStr);
    if (count > 0) log.info(`[cleanup] removed ${count} DB records older than ${cutoffStr}`);
  } catch (e) {
    log.error("[cleanup] DB cleanup error:", (e as Error).message);
  }
}

export function startCleanup(): void {
  cleanup().catch((e) => log.error("[cleanup] error:", (e as Error).message));
  setInterval(() => {
    cleanup().catch((e) => log.error("[cleanup] error:", (e as Error).message));
  }, CLEANUP_INTERVAL);
  log.info(`[cleanup] running every hour`);
}
