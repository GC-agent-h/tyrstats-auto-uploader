import { exists } from "@tauri-apps/plugin-fs";

import { PAUSE_AFTER_SEND_MS, SCAN_EVERY_MS } from "./constants";
import { sha256Hex } from "./digest";
import {
  isOversize,
  isQuietReplay,
  listReplayFiles,
  readReplayBytes,
  type ReplayFile,
} from "./folder";
import {
  BASELINE_NOTE,
  isBaselineSkip,
  isUnchangedFile,
  loadLedger,
  remember,
  rememberedDigests,
  saveLedger,
  type Ledger,
  type LedgerRecord,
} from "./ledger";
import { publishReplay } from "./publish";

export type SyncEvent = {
  at: number;
  level: "info" | "ok" | "warn" | "error";
  text: string;
};

type TokenFn = () => Promise<string | null>;
type EventFn = (event: SyncEvent) => void;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stamp(
  file: ReplayFile,
  digest: string | null,
  note: string,
): LedgerRecord {
  return {
    digest,
    recordedAt: Date.now(),
    note,
    size: file.size,
    modifiedAt: file.modifiedAt,
  };
}

export class ReplaySync {
  private timer: ReturnType<typeof setInterval> | null = null;
  private draining = false;
  private includeExisting = false;
  private folder = "";

  constructor(
    private readonly getToken: TokenFn,
    private readonly emit: EventFn,
  ) {}

  setFolder(path: string) {
    this.folder = path;
  }

  setIncludeExisting(value: boolean) {
    this.includeExisting = value;
  }

  get watching() {
    return this.timer !== null;
  }

  startWatching() {
    if (this.timer) return;
    this.log("info", "Auto-upload started.");
    void this.drain();
    this.timer = setInterval(() => {
      void this.drain();
    }, SCAN_EVERY_MS);
  }

  stopWatching() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.log("info", "Auto-upload stopped.");
    }
  }

  async runOnce() {
    await this.drain();
  }

  private log(level: SyncEvent["level"], text: string) {
    this.emit({ at: Date.now(), level, text });
  }

  private async drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      await this.drainUnsafe();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log("error", `Scan failed: ${message}`);
    } finally {
      this.draining = false;
    }
  }

  private async drainUnsafe() {
    const folder = this.folder;
    if (!folder) {
      this.log("error", "No folder selected.");
      return;
    }
    if (!(await exists(folder))) {
      this.log("error", `Replay folder not found: ${folder}`);
      return;
    }

    const ledger = await loadLedger();
    const files = await listReplayFiles(folder);

    if (!ledger.initialized) {
      if (this.includeExisting) {
        ledger.initialized = true;
        await saveLedger(ledger);
        this.log(
          "info",
          `Folder has ${files.length} replay(s). Existing files will be sent.`,
        );
      } else {
        const skipped = await snapshotExisting(ledger, files);
        this.log(
          "info",
          `First run: ${skipped} replay(s) already on disk were left in place. Only new matches will be sent.`,
        );
        return;
      }
    }

    const token = await this.getToken();
    if (!token) {
      this.log("error", "Not signed in.");
      return;
    }

    const seen = rememberedDigests(ledger);
    const pending = files.filter((file) => {
      const record = ledger.records[file.name];
      if (!isUnchangedFile(record, file)) return true;
      return this.includeExisting && isBaselineSkip(record);
    });
    if (pending.length === 0) return;

    this.log("info", `${pending.length} candidate(s) in ${folder}`);

    for (const file of pending) {
      await this.handleFile(file, ledger, seen, token);
    }
  }

  private async handleFile(
    file: ReplayFile,
    ledger: Ledger,
    seen: Set<string>,
    token: string,
  ) {
    if (isOversize(file.size)) {
      remember(ledger, file.name, stamp(file, null, "too large"));
      await saveLedger(ledger);
      this.log("warn", `${file.name}: skipped (too large)`);
      return;
    }

    if (!(await isQuietReplay(file.path, file.size, file.modifiedAt))) {
      return;
    }

    let bytes: Uint8Array;
    try {
      bytes = await readReplayBytes(file.path);
    } catch {
      return;
    }

    const digest = await sha256Hex(bytes);
    const previous = ledger.records[file.name];
    if (previous?.digest === digest) {
      remember(ledger, file.name, stamp(file, digest, previous.note));
      await saveLedger(ledger);
      return;
    }
    if (seen.has(digest)) {
      remember(ledger, file.name, stamp(file, digest, "duplicate contents"));
      await saveLedger(ledger);
      this.log("warn", `${file.name}: already sent under another name`);
      return;
    }

    const result = await publishReplay(file.name, bytes, token);
    if (!result.ok) {
      this.log("error", `${file.name}: ${result.message}`);
      if (!result.retry) {
        remember(ledger, file.name, stamp(file, digest, result.message));
        await saveLedger(ledger);
        seen.add(digest);
      }
      await wait(PAUSE_AFTER_SEND_MS);
      return;
    }

    remember(ledger, file.name, stamp(file, digest, result.message));
    await saveLedger(ledger);
    seen.add(digest);
    this.log("ok", `${file.name}: ${result.message}`);
    await wait(PAUSE_AFTER_SEND_MS);
  }
}

async function snapshotExisting(ledger: Ledger, files: ReplayFile[]) {
  const now = Date.now();
  for (const file of files) {
    if (ledger.records[file.name]) continue;
    remember(ledger, file.name, {
      digest: null,
      recordedAt: now,
      note: BASELINE_NOTE,
      size: file.size,
      modifiedAt: file.modifiedAt,
    });
  }
  ledger.initialized = true;
  await saveLedger(ledger);
  return files.length;
}
