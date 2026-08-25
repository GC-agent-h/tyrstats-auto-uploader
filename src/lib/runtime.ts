export function isDesktopShell() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
