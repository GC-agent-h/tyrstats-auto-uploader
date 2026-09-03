import { apiFetch, apiJson } from "./api";
import { openWebsitePath } from "./openWebsite";
import {
  readSession,
  sessionFromApi,
  writeSession,
  type AccountSession,
} from "./session";

type TokenBody = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  email?: string;
  error?: string;
  needs_confirmation?: boolean;
  pending?: boolean;
  login_id?: string;
  expires_in?: number;
};

export type AuthResult =
  | { ok: true; session: AccountSession | null; needsConfirmation?: boolean }
  | { ok: false; error: string };

async function postCredentials(
  path: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const { ok, body } = await apiJson<TokenBody>(path, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!ok) {
    return { ok: false, error: body?.error ?? "Request failed." };
  }
  if (body?.needs_confirmation) {
    return { ok: true, session: null, needsConfirmation: true };
  }
  const session = body ? sessionFromApi(body) : null;
  if (!session) {
    return { ok: false, error: body?.error ?? "Invalid response from server." };
  }
  writeSession(session);
  return { ok: true, session };
}

export function signIn(email: string, password: string) {
  return postCredentials("/api/auth/sign-in", email, password);
}

export function signUp(email: string, password: string) {
  return postCredentials("/api/auth/sign-up", email, password);
}

function randomBase64Url(bytes: number) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function signInWithSteam(
  signal: AbortSignal,
): Promise<AuthResult> {
  const codeVerifier = randomBase64Url(32);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const started = await apiJson<TokenBody>("/api/auth/steam/device/start", {
    method: "POST",
    body: JSON.stringify({ code_challenge: codeChallenge }),
  });
  if (!started.ok || !started.body?.login_id) {
    return {
      ok: false,
      error: started.body?.error ?? "Could not start Steam login.",
    };
  }

  const loginId = started.body.login_id;
  const deadline =
    Date.now() + Math.max(30, started.body.expires_in ?? 600) * 1000;

  await openWebsitePath(`/api/steam/login?desktop=${encodeURIComponent(loginId)}`);

  while (Date.now() < deadline) {
    if (signal.aborted) {
      return { ok: false, error: "cancelled" };
    }

    const polled = await apiJson<TokenBody>("/api/auth/steam/device/poll", {
      method: "POST",
      body: JSON.stringify({
        login_id: loginId,
        code_verifier: codeVerifier,
      }),
    });

    if (polled.status === 202 || polled.body?.pending) {
      try {
        await sleep(1500, signal);
      } catch {
        return { ok: false, error: "cancelled" };
      }
      continue;
    }

    if (polled.status === 429) {
      try {
        await sleep(2000, signal);
      } catch {
        return { ok: false, error: "cancelled" };
      }
      continue;
    }

    if (!polled.ok) {
      return {
        ok: false,
        error: polled.body?.error ?? "Steam sign-in failed.",
      };
    }

    const session = polled.body ? sessionFromApi(polled.body) : null;
    if (!session) {
      return { ok: false, error: "Invalid response from server." };
    }
    writeSession(session);
    return { ok: true, session };
  }

  return { ok: false, error: "Steam sign-in timed out. Try again." };
}

export async function signOut() {
  const session = readSession();
  if (session) {
    await apiFetch("/api/auth/sign-out", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }).catch(() => undefined);
  }
  writeSession(null);
}

export async function getAccessToken() {
  const session = readSession();
  if (!session) return null;

  const stillValid = session.expiresAt * 1000 > Date.now() + 60_000;
  if (stillValid) return session.accessToken;

  const { ok, body } = await apiJson<TokenBody>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  const next = ok && body ? sessionFromApi(body) : null;
  if (!next) {
    writeSession(null);
    return null;
  }
  writeSession(next);
  return next.accessToken;
}
