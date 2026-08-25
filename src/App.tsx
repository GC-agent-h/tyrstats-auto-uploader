import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { AuthScreen } from "./components/AuthScreen";
import { HomeScreen } from "./components/HomeScreen";
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

  return (
    <main className="app-shell">
      {!hasSupabaseConfig() ? (
        <section className="card">
          <h1>Missing configuration</h1>
          <p className="lede">
            Copy <code>.env.example</code> to <code>.env</code> and set the
            public Supabase URL and anon key from tyrstats. Do not add the
            service role key.
          </p>
        </section>
      ) : !ready ? (
        <section className="card">
          <p className="lede">Loading…</p>
        </section>
      ) : session?.user.email ? (
        <HomeScreen email={session.user.email} />
      ) : (
        <AuthScreen />
      )}
    </main>
  );
}

export default App;
