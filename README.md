# Tyrstats AutoUploader

Desktop app that watches Tyr’s replay folder and uploads finished `.replay` files to the tyrstats website with the same email/password account.

Tauri 2 + React + TypeScript. This repository is **source only** — install dependencies and build on your machine.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/learn/get-started) (stable)
- Windows: [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (usually already installed) and Visual Studio C++ build tools

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

That starts the Vite UI and compiles the Rust shell. Sign in, then start watching `%LOCALAPPDATA%\Tyr\Saved\Demos`.

The tyrstats site at `VITE_SITE_URL` must be running.

## Build (release)

```bash
npm run tauri build
```

Installers land in `src-tauri/target/release/bundle/` (that directory is gitignored).
