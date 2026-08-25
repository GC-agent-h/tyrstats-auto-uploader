import { FormEvent, useState } from "react";

import { siteUrl } from "../lib/config";
import { openWebsitePath } from "../lib/openWebsite";
import { supabase } from "../lib/supabase";

export function AuthScreen() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
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
          email,
          password,
          options: {
            emailRedirectTo: `${siteUrl}/upload`,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

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
    <section className="card">
      <h1>{signUp ? "Create your account" : "Sign in"}</h1>
      <p className="lede">
        {signUp
          ? "Use your email address to upload Tyr replay files."
          : "Sign in to upload Tyr replay files."}
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
          {submitting ? "Please wait…" : signUp ? "Create account" : "Sign in"}
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
    </section>
  );
}
