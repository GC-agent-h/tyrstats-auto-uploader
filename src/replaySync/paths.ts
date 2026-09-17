import { invoke } from "@tauri-apps/api/core";
import { join, localDataDir, sep } from "@tauri-apps/api/path";

import { DEMO_FOLDER_SEGMENTS } from "./constants";

export const DEFAULT_FOLDER_HINT = "%LOCALAPPDATA%\\Tyr\\Saved\\Demos";

function onWindows() {
  return sep() === "\\";
}

/**
 * The folder to watch, or null when Tyr's install could not be located.
 *
 * On Windows this is `%LOCALAPPDATA%\Tyr\Saved\Demos`.
 *
 * On Linux the game runs under Proton, so finding its replay folder means
 * finding the Wine prefix. That lookup lives in Rust: it has to read Steam's
 * library list and resolve symlinks, neither of which the sandboxed fs plugin
 * allows.
 */
export async function demoFolderPath(): Promise<string | null> {
  if (onWindows()) {
    return join(await localDataDir(), ...DEMO_FOLDER_SEGMENTS);
  }
  return invoke<string | null>("tyr_demos_folder");
}
