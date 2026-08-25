import { openUrl } from "@tauri-apps/plugin-opener";

import { siteUrl } from "../lib/config";

export async function openWebsitePath(path: string) {
  const url = `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
