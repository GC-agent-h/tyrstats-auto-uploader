const STORAGE_KEY = "tyr-auto-uploader-session";

export type AccountSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
};

type Listener = (session: AccountSession | null) => void;

const listeners = new Set<Listener>();

export function subscribeSession(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(session: AccountSession | null) {
  for (const listener of listeners) listener(session);
}

export function readSession(): AccountSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccountSession>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }
    return parsed as AccountSession;
  } catch {
    return null;
  }
}

export function writeSession(session: AccountSession | null) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  emit(session);
}

type TokenBody = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  email?: string;
  error?: string;
  needs_confirmation?: boolean;
};

export function sessionFromApi(body: TokenBody): AccountSession | null {
  if (
    !body.access_token ||
    !body.refresh_token ||
    !body.email ||
    typeof body.expires_at !== "number"
  ) {
    return null;
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: body.expires_at,
    email: body.email,
  };
}
