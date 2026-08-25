import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import { siteUrl } from "./config";
import { isDesktopShell } from "./runtime";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = `${siteUrl}${path}`;
  if (isDesktopShell()) {
    return tauriFetch(url, init);
  }
  return fetch(url, init);
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await apiFetch(path, { ...init, headers });
  const body = (await response.json().catch(() => null)) as T | null;
  return { ok: response.ok, status: response.status, body };
}
