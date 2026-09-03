import { FormEvent, useRef, useState } from "react";

import { signIn, signInWithSteam, signOut, signUp } from "../lib/auth";
import { openWebsitePath } from "../lib/openWebsite";

type Props = {
  email: string | null;
};

export function AuthScreen({ email }: Props) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [emailValue, setEmailValue] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [steamWaiting, setSteamWaiting] = useState(false);
  const steamAbort = useRef<AbortController | null>(null);

  const signUpMode = mode === "sign-up";
  const busy = submitting || steamWaiting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const result = signUpMode
      ? await signUp(emailValue, password)
      : await signIn(emailValue, password);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.needsConfirmation) {
      setMessage("Check your email to confirm your account.");
    }
  }

  async function handleSteam() {
    steamAbort.current?.abort();
    const controller = new AbortController();
    steamAbort.current = controller;
    setSteamWaiting(true);
    setError("");
    setMessage("");

    const result = await signInWithSteam(controller.signal);
    if (steamAbort.current === controller) {
      setSteamWaiting(false);
      steamAbort.current = null;
    }
    if (!result.ok && result.error !== "cancelled") {
      setError(result.error);
    }
  }

  function cancelSteam() {
    steamAbort.current?.abort();
    steamAbort.current = null;
    setSteamWaiting(false);
  }

  return (
    <section className="pane pane-auth">
      {email ? (
        <>
          <h1>Signed in</h1>
          <p className="lede">{email}</p>
          <p className="muted">
            Watching is unlocked on the right. Sign out to use a different
            account.
          </p>
          <button
            className="cta ghost"
            type="button"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <h1>{signUpMode ? "Create your account" : "Sign in"}</h1>
          <p className="lede">
            {signUpMode
              ? "Continue with Steam, or use the same email as tyrstats."
              : "Continue with Steam or your tyrstats email to start watching."}
          </p>

          {steamWaiting ? (
            <div className="steam-wait">
              <p className="muted tight">
                Finish signing in with Steam in your browser, then return here.
              </p>
              <button
                className="cta ghost"
                type="button"
                onClick={cancelSteam}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="cta steam"
              type="button"
              onClick={() => void handleSteam()}
              disabled={busy}
            >
              Continue with Steam
            </button>
          )}

          <p className="or-email">or use email</p>

          <form className="form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={emailValue}
                onChange={(event) => setEmailValue(event.target.value)}
                required
                disabled={busy}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={signUpMode ? "new-password" : "current-password"}
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={busy}
              />
            </label>
            {!signUpMode && (
              <p className="forgot">
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => openWebsitePath("/auth/reset-password")}
                >
                  Forgot password?
                </button>
              </p>
            )}

            {error && <p className="error">{error}</p>}
            {message && <p className="success">{message}</p>}

            <button className="cta" type="submit" disabled={busy}>
              {submitting
                ? "Please wait…"
                : signUpMode
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <button
            className="text-btn toggle"
            type="button"
            disabled={busy}
            onClick={() => {
              setMode(signUpMode ? "sign-in" : "sign-up");
              setError("");
              setMessage("");
            }}
          >
            {signUpMode
              ? "Already have an account? Sign in"
              : "Need an account? Sign up"}
          </button>
        </>
      )}
    </section>
  );
}
