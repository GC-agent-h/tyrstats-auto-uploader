import { useEffect, useRef, useState } from "react";

import { getAccessToken } from "../lib/auth";
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
  const [folder, setFolder] = useState(DEFAULT_FOLDER_HINT);
  const [watching, setWatching] = useState(false);
  const [includeExisting, setIncludeExisting] = useState(false);
  const [events, setEvents] = useState<SyncEvent[]>([]);

  useEffect(() => {
    if (!isDesktopShell()) return;

    const sync = new ReplaySync(
      async () => {
        return getAccessToken();
      },
      (event) => {
        setEvents((current) => [...current.slice(-99), event]);
      },
    );
    syncRef.current = sync;

    void demoFolderPath().then((path) => {
      setFolder(path);
      sync.setFolder(path);
    });

    return () => {
      sync.stopWatching();
      syncRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (signedIn) return;
    syncRef.current?.stopWatching();
    setWatching(false);
  }, [signedIn]);

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

  const locked = !signedIn;
  const folderReady = isDesktopShell() && folder !== DEFAULT_FOLDER_HINT;

  return (
    <section className={`pane pane-folder${locked ? " is-locked" : ""}`}>
      {locked && (
        <p className="lock-note">
          Sign in on the left to start watching. Uploads use your tyrstats
          account.
        </p>
      )}

      <div className="pane-body" inert={locked}>
        <h1>Replay folder</h1>
        <p className="lede">
          Tyr writes finished matches to{" "}
          <code>{DEFAULT_FOLDER_HINT}</code>. This app watches that folder only.
        </p>

        <label>
          Folder to watch
          <input type="text" value={folder} readOnly />
        </label>

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
              const value = event.target.checked;
              setIncludeExisting(value);
              const sync = syncRef.current;
              sync?.setIncludeExisting(value);
              if (value && sync?.watching) {
                void sync.runOnce();
              }
            }}
          />
          Also send replays that were already on disk
        </label>

        <div className="actions">
          <button
            className={watching ? "cta auto-on" : "cta secondary"}
            type="button"
            disabled={locked || !folderReady}
            onClick={toggleWatch}
          >
            {watching ? "Stop auto upload" : "Start auto upload"}
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
