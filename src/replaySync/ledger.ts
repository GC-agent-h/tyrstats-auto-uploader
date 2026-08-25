import { appLocalDataDir } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

import { LEDGER_FILENAME } from "./constants";

export type LedgerRecord = {
  digest: string | null;
  recordedAt: number;
  note: string;
};

export type Ledger = {
  version: 1;
  initialized: boolean;
  records: Record<string, LedgerRecord>;
};

function emptyLedger(): Ledger {
  return { version: 1, initialized: false, records: {} };
}

function parseLedger(raw: string): Ledger {
  try {
    const data = JSON.parse(raw) as Partial<Ledger>;
    if (data.version !== 1 || typeof data.records !== "object" || !data.records) {
      return emptyLedger();
    }
    return {
      version: 1,
      initialized: Boolean(data.initialized),
      records: data.records,
    };
  } catch {
    return emptyLedger();
  }
}

export async function loadLedger(): Promise<Ledger> {
  const present = await exists(LEDGER_FILENAME, {
    baseDir: BaseDirectory.AppLocalData,
  });
  if (!present) return emptyLedger();
  try {
    return parseLedger(
      await readTextFile(LEDGER_FILENAME, {
        baseDir: BaseDirectory.AppLocalData,
      }),
    );
  } catch {
    return emptyLedger();
  }
}

export async function saveLedger(ledger: Ledger) {
  await mkdir(await appLocalDataDir(), { recursive: true });
  await writeTextFile(LEDGER_FILENAME, JSON.stringify(ledger, null, 2), {
    baseDir: BaseDirectory.AppLocalData,
  });
}

export function rememberedDigests(ledger: Ledger) {
  const digests = new Set<string>();
  for (const record of Object.values(ledger.records)) {
    if (record.digest) digests.add(record.digest);
  }
  return digests;
}

export function remember(
  ledger: Ledger,
  fileName: string,
  record: LedgerRecord,
) {
  ledger.records[fileName] = record;
}
