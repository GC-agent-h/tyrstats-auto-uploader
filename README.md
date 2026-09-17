# Tyrstats AutoUploader

Desktop app that watches Tyr’s replay folder and uploads finished `.replay` files to the tyrstats website. Sign-in is optional: unsigned uploads count as Others.

Tauri 2 + React + TypeScript. This repository is **source only** — install dependencies and build on your machine.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/learn/get-started) (stable)
- Windows: [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (usually already installed) and Visual Studio C++ build tools
- Linux: webkit2gtk 4.1, GTK 3, libsoup 3, a C compiler; `dpkg` / `rpm-build` if you want installers

See [Tauri prerequisites](https://tauri.app/start/prerequisites/) if `tauri dev` fails to compile.

## Setup

```bash
git clone <this-repo>
cd tyr-auto-uploader
npm install
```

Copy `.env.example` to `.env`:

```
VITE_SITE_URL=https://your-tyrstats-site.example
```

The app only talks to that site (`/api/auth/*` and `/api/process-replay`).

## Run (development)

```bash
npm run tauri dev
```

That starts the Vite UI and compiles the Rust shell. Start watching the replay folder (sign-in is optional).

- Windows: `%LOCALAPPDATA%\Tyr\Saved\Demos`
- Linux: Tyr runs under Proton. The app reads Steam's `libraryfolders.vdf`, then uses `steamapps/compatdata/2445260/pfx/drive_c/users/steamuser/AppData/Local/Tyr/Saved/Demos`.

The tyrstats site at `VITE_SITE_URL` must be running.

## Build (release)

```bash
npm run tauri build
```

Installers land in `src-tauri/target/release/bundle/` (that directory is gitignored).

On Linux, `npm run tauri build -- --bundles deb,rpm,appimage` builds the packages the Windows NSIS installer does not cover.
