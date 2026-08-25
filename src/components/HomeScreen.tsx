import { useEffect, useRef, useState } from "react";

import { supabase } from "../lib/supabase";
import { isDesktopShell } from "../lib/runtime";
import { demoFolderPath } from "../replaySync/paths";
import {
  ReplaySync,
  type SyncEvent,
} from "../replaySync/service";

type Props = {
  email: string;
};

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString();
}

export function HomeScreen({ email }: Props) {
  const syncRef = useRef<ReplaySync | null>(null);
  const [folder, setFolder] = useState("…");
  const [watching, setWatching] = useState(false);
  const [includeExisting, setIncludeExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<SyncEvent[]>([]);

  useEffect(() => {
    if (!isDesktopShell()) return;

    const sync = new ReplaySync(
      async () => {
        const { data } = await supabase!.auth.getSession();
        return data.session?.access_token ?? null;
      },
      (event) => {
        setEvents((current) => [...current.slice(-99), event]);
      },
    );
    syncRef.current = sync;
    void demoFolderPath().then(setFolder);

    return () => {
      sync.stopWatching();
      syncRef.current = null;
    };
  }, []);

  function toggleWatch() {
    const sync = syncRef.current;
    if (!sync) return;
    if (sync.watching) {
      sync.stopWatching();
      setWatching(false);
      return;
    }
    sync.setIncludeExisting(includeExisting);
    sync.startWatching();
    setWatching(true);
  }

  async function sendWaiting() {
    const sync = syncRef.current;
    if (!sync) return;
    setBusy(true);
    sync.setIncludeExisting(includeExisting);
    await sync.runOnce();
    setBusy(false);
  }

  if (!isDesktopShell()) {
    return (
      <section className="card wide">
        <h1>Tyr Auto Uploader</h1>
        <p className="lede">Signed in as {email}</p>
        <p className="muted">
          Folder watching needs the desktop shell. Run{" "}
          <code>npm run tauri dev</code>.
        </p>
        <button
          className="cta ghost"
          type="button"
          onClick={() => supabase?.auth.signOut()}
        >
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="card wide">
      <header className="toolbar">
        <div>
          <h1>Tyr Auto Uploader</h1>
          <p className="lede">Signed in as {email}</p>
        </div>
        <button
          className="cta ghost compact"
          type="button"
          onClick={() => supabase?.auth.signOut()}
        >
          Sign out
        </button>
      </header>

      <p className="path-line">
        Watching <code>{folder}</code>
      </p>
      <p className="muted tight">
        New <code>.replay</code> files are sent after the match finishes writing
        them. Files already in the folder on first start are ignored unless you
        opt in below.
      </p>

      <label className="check">
        <input
          type="checkbox"
          checked={includeExisting}
          onChange={(event) => {
            setIncludeExisting(event.target.checked);
            syncRef.current?.setIncludeExisting(event.target.checked);
          }}
        />
        Also send replays that were already on disk
      </label>

      <div className="actions">
        <button className="cta" type="button" onClick={toggleWatch}>
          {watching ? "Stop watching" : "Start watching"}
        </button>
        <button
          className="cta secondary"
          type="button"
          disabled={busy}
          onClick={() => void sendWaiting()}
        >
          {busy ? "Sending…" : "Send waiting files"}
        </button>
      </div>

      <ul className="log">
        {events.length === 0 ? (
          <li className="log-empty">No activity yet.</li>
        ) : (
          events
            .slice()
            .reverse()
            .map((event, index) => (
              <li key={`${event.at}-${index}`} className={`log-${event.level}`}>
                <span className="log-time">{formatTime(event.at)}</span>
                {event.text}
              </li>
            ))
        )}
      </ul>
    </section>
  );
}
