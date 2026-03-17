const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

const current = LEVELS[(process.env.LOG_LEVEL as Level) || "info"] ?? LEVELS.info;

export const log = {
  debug: (...args: unknown[]) => { if (current <= LEVELS.debug) console.debug(...args); },
  info: (...args: unknown[]) => { if (current <= LEVELS.info) console.log(...args); },
  warn: (...args: unknown[]) => { if (current <= LEVELS.warn) console.warn(...args); },
  error: (...args: unknown[]) => { if (current <= LEVELS.error) console.error(...args); },
};
