import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

import { supabase } from "../lib/supabase";
import { isDesktopShell } from "../lib/runtime";
import {
  DEFAULT_FOLDER_HINT,
  demoFolderPath,
} from "../replaySync/paths";
import { ReplaySync, type SyncEvent } from "../replaySync/service";

type Props = {
  signedIn: boolean;
};

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString();
}

export function FolderPanel({ signedIn }: Props) {
  const syncRef = useRef<ReplaySync | null>(null);
  const [defaultFolder, setDefaultFolder] = useState(DEFAULT_FOLDER_HINT);
  const [folder, setFolder] = useState(DEFAULT_FOLDER_HINT);
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

    void demoFolderPath().then((path) => {
      setDefaultFolder(path);
      setFolder((current) =>
        current === DEFAULT_FOLDER_HINT ? path : current,
      );
      sync.setFolder(path);
    });

    return () => {
      sync.stopWatching();
      syncRef.current = null;
    };
  }, []);

  useEffect(() => {
    syncRef.current?.setFolder(folder);
  }, [folder]);

  useEffect(() => {
    if (signedIn) return;
    syncRef.current?.stopWatching();
    setWatching(false);
  }, [signedIn]);

  async function browse() {
    if (!isDesktopShell()) return;
    const selected = await open({
      directory: true,
      multiple: false,
      recursive: true,
      defaultPath: folder === DEFAULT_FOLDER_HINT ? undefined : folder,
      title: "Select replay folder",
    });
    if (typeof selected === "string" && selected) {
      setFolder(selected);
      syncRef.current?.setFolder(selected);
    }
  }

  function toggleWatch() {
    const sync = syncRef.current;
    if (!sync) return;
    if (sync.watching) {
      sync.stopWatching();
      setWatching(false);
      return;
    }
    sync.setFolder(folder);
    sync.setIncludeExisting(includeExisting);
    sync.startWatching();
    setWatching(true);
  }

  async function sendWaiting() {
    const sync = syncRef.current;
    if (!sync) return;
    setBusy(true);
    sync.setFolder(folder);
    sync.setIncludeExisting(includeExisting);
    await sync.runOnce();
    setBusy(false);
  }

  const locked = !signedIn;
  const folderReady = isDesktopShell() && folder !== DEFAULT_FOLDER_HINT;

  return (
    <section className={`pane pane-folder${locked ? " is-locked" : ""}`}>
      {locked && (
        <p className="lock-note">
          Sign in on the left to choose a folder and start watching. Uploads
          use your tyrstats account.
        </p>
      )}

      <div className="pane-body" inert={locked}>
        <h1>Replay folder</h1>
        <p className="lede">
          Tyr writes finished matches to{" "}
          <code>{DEFAULT_FOLDER_HINT}</code> by default. That folder is selected
          unless you pick another one.
        </p>

        <label>
          Folder to watch
          <input type="text" value={folder} readOnly />
        </label>

        <div className="actions">
          <button
            className="cta secondary"
            type="button"
            disabled={locked || !isDesktopShell()}
            onClick={() => void browse()}
          >
            Browse…
          </button>
          <button
            className="cta secondary"
            type="button"
            disabled={locked || folder === defaultFolder}
            onClick={() => setFolder(defaultFolder)}
          >
            Use default
          </button>
        </div>

        <p className="muted tight">
          New <code>.replay</code> files are sent after the match finishes
          writing them. Files already in the folder on first start are ignored
          unless you opt in below.
        </p>

        <label className="check">
          <input
            type="checkbox"
            checked={includeExisting}
            disabled={locked}
            onChange={(event) => {
              setIncludeExisting(event.target.checked);
              syncRef.current?.setIncludeExisting(event.target.checked);
            }}
          />
          Also send replays that were already on disk
        </label>

        <div className="actions">
          <button
            className="cta"
            type="button"
            disabled={locked || !folderReady}
            onClick={toggleWatch}
          >
            {watching ? "Stop watching" : "Start watching"}
          </button>
          <button
            className="cta secondary"
            type="button"
            disabled={locked || busy || !folderReady}
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
                <li
                  key={`${event.at}-${index}`}
                  className={`log-${event.level}`}
                >
                  <span className="log-time">{formatTime(event.at)}</span>
                  {event.text}
                </li>
              ))
          )}
        </ul>
      </div>
    </section>
  );
}
