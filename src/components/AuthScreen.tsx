import { FormEvent, useState } from "react";

import { siteUrl } from "../lib/config";
import { openWebsitePath } from "../lib/openWebsite";
import { supabase } from "../lib/supabase";

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

  const signUp = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    const result = signUp
      ? await supabase.auth.signUp({
          email: emailValue,
          password,
          options: {
            emailRedirectTo: `${siteUrl}/upload`,
          },
        })
      : await supabase.auth.signInWithPassword({
          email: emailValue,
          password,
        });

    setSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (signUp && !result.data.session) {
      setMessage("Check your email to confirm your account.");
    }
  }

  return (
    <section className="pane pane-auth">
      {email ? (
        <>
          <h1>Signed in</h1>
          <p className="lede">{email}</p>
          <p className="muted">
            The folder on the right is unlocked. Sign out to use a different
            account.
          </p>
          <button
            className="cta ghost"
            type="button"
            onClick={() => supabase?.auth.signOut()}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <h1>{signUp ? "Create your account" : "Sign in"}</h1>
          <p className="lede">
            {signUp
              ? "Use the same email as tyrstats to upload Tyr replay files."
              : "Sign in with your tyrstats account to choose a folder."}
          </p>

          <form className="form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={emailValue}
                onChange={(event) => setEmailValue(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={signUp ? "new-password" : "current-password"}
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {!signUp && (
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

            <button className="cta" type="submit" disabled={submitting}>
              {submitting
                ? "Please wait…"
                : signUp
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <button
            className="text-btn toggle"
            type="button"
            onClick={() => {
              setMode(signUp ? "sign-in" : "sign-up");
              setError("");
              setMessage("");
            }}
          >
            {signUp
              ? "Already have an account? Sign in"
              : "Need an account? Sign up"}
          </button>
        </>
      )}
    </section>
  );
}
