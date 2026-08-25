import { useEffect, useState } from "react";

import { AuthScreen } from "./components/AuthScreen";
import { FolderPanel } from "./components/FolderPanel";
import { readSession, subscribeSession } from "./lib/session";
import "./App.css";

function App() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEmail(readSession()?.email ?? null);
    setReady(true);
    return subscribeSession((session) => {
      setEmail(session?.email ?? null);
    });
  }, []);

  if (!ready) {
    return (
      <main className="app-shell">
        <section className="card">
          <p className="lede">Loading…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell split">
      <AuthScreen email={email} />
      <FolderPanel signedIn={Boolean(email)} />
    </main>
  );
}

export default App;
