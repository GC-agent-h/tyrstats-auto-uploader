import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import { siteUrl } from "../lib/config";
import { isDesktopShell } from "../lib/runtime";
import { PROCESS_REPLAY_PATH } from "./constants";

export type PublishStatus = "imported" | "merged" | "skipped" | "failed";

export type PublishResult =
  | { ok: true; status: Exclude<PublishStatus, "failed">; message: string }
  | { ok: false; retry: boolean; message: string };

type ApiBody = {
  status?: PublishStatus;
  match_guid?: string;
  reason?: string;
  error?: string;
};

function alreadyOnSite(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("both teams") ||
    lower.includes("already been uploaded") ||
    (lower.includes("this team") && lower.includes("already"))
  );
}

function describe(body: ApiBody | null, fallback: string) {
  if (!body) return fallback;
  if (body.error) return body.error;
  if (body.reason) {
    return body.match_guid ? `${body.reason} (${body.match_guid})` : body.reason;
  }
  if (body.status && body.match_guid) return `${body.status}: ${body.match_guid}`;
  if (body.status) return body.status;
  return fallback;
}

async function postForm(url: string, token: string, file: File) {
  const init: RequestInit = {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: (() => {
      const form = new FormData();
      form.append("file", file);
      return form;
    })(),
  };

  if (isDesktopShell()) {
    return tauriFetch(url, init);
  }
  return fetch(url, init);
}

export async function publishReplay(
  fileName: string,
  bytes: Uint8Array,
  token: string,
): Promise<PublishResult> {
  const file = new File([new Blob([bytes])], fileName, {
    type: "application/octet-stream",
  });
  const url = `${siteUrl}${PROCESS_REPLAY_PATH}`;

  let response: Response;
  try {
    response = await postForm(url, token, file);
  } catch (error) {
    return {
      ok: false,
      retry: true,
      message: error instanceof Error ? error.message : "connection failed",
    };
  }

  const body = (await response.json().catch(() => null)) as ApiBody | null;

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      retry: true,
      message: body?.error ?? "Not allowed to upload. Sign in again.",
    };
  }

  if (!response.ok) {
    const message = describe(body, `Upload failed (${response.status})`);
    if (alreadyOnSite(message)) {
      return { ok: true, status: "skipped", message };
    }
    return {
      ok: false,
      retry: response.status >= 500 || response.status === 429,
      message,
    };
  }

  if (body?.status === "failed") {
    return {
      ok: false,
      retry: false,
      message: describe(body, "Import failed"),
    };
  }

  if (body?.status === "skipped") {
    return { ok: true, status: "skipped", message: describe(body, "skipped") };
  }

  if (body?.status === "imported" || body?.status === "merged") {
    return { ok: true, status: body.status, message: describe(body, body.status) };
  }

  return { ok: true, status: "imported", message: describe(body, "uploaded") };
}
