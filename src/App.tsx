import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { AuthScreen } from "./components/AuthScreen";
import { FolderPanel } from "./components/FolderPanel";
import { hasSupabaseConfig } from "./lib/config";
import { supabase } from "./lib/supabase";
import "./App.css";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (!hasSupabaseConfig()) {
    return (
      <main className="app-shell">
        <section className="card">
          <h1>Missing configuration</h1>
          <p className="lede">
            Copy <code>.env.example</code> to <code>.env</code> and set the
            public Supabase URL and anon key from tyrstats. Do not add the
            service role key.
          </p>
        </section>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="app-shell">
        <section className="card">
          <p className="lede">Loading…</p>
        </section>
      </main>
    );
  }

  const email = session?.user.email ?? null;

  return (
    <main className="app-shell split">
      <AuthScreen email={email} />
      <FolderPanel signedIn={Boolean(email)} />
    </main>
  );
}

export default App;
