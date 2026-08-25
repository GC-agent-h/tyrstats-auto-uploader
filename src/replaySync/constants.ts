export const DEMO_FOLDER_SEGMENTS = ["Tyr", "Saved", "Demos"] as const;
export const LEDGER_FILENAME = "sync-ledger.json";

/** Tyr keeps writing the file until the match ends; wait until mtime is this old. */
export const QUIET_AFTER_WRITE_MS = 20_000;
export const SCAN_EVERY_MS = 12_000;
export const PAUSE_AFTER_SEND_MS = 5_000;

/** Matches tyrstats /api/process-replay. */
export const MAX_REPLAY_BYTES = 40 * 1024 * 1024;

export const PROCESS_REPLAY_PATH = "/api/process-replay";
