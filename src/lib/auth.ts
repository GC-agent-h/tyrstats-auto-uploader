import { apiFetch, apiJson } from "./api";
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
