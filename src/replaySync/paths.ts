import { join, localDataDir } from "@tauri-apps/api/path";

import { DEMO_FOLDER_SEGMENTS } from "./constants";

export async function demoFolderPath() {
  return join(await localDataDir(), ...DEMO_FOLDER_SEGMENTS);
}
