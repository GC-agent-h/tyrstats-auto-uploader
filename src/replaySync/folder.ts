import { join } from "@tauri-apps/api/path";
import { exists, open, readDir, readFile, stat } from "@tauri-apps/plugin-fs";

import { MAX_REPLAY_BYTES, QUIET_AFTER_WRITE_MS } from "./constants";

export type ReplayFile = {
  name: string;
  path: string;
  size: number;
  modifiedAt: number;
};

async function fileIsUnlocked(path: string) {
  try {
    const handle = await open(path, { read: true });
    await handle.close();
    return true;
  } catch {
    return false;
  }
}

export async function isQuietReplay(path: string, size: number, modifiedAt: number) {
  if (size <= 0) return false;
  if (Date.now() - modifiedAt < QUIET_AFTER_WRITE_MS) return false;
  return fileIsUnlocked(path);
}

export async function listReplayFiles(folder: string): Promise<ReplayFile[]> {
  if (!(await exists(folder))) return [];

  const entries = await readDir(folder);
  const files: ReplayFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile || !entry.name.toLowerCase().endsWith(".replay")) continue;
    const path = await join(folder, entry.name);
    const info = await stat(path);
    files.push({
      name: entry.name,
      path,
      size: info.size,
      modifiedAt: info.mtime?.getTime() ?? 0,
    });
  }

  files.sort((a, b) => a.modifiedAt - b.modifiedAt);
  return files;
}

export async function readReplayBytes(path: string) {
  return readFile(path);
}

export function isOversize(size: number) {
  return size > MAX_REPLAY_BYTES;
}
