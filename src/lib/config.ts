export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
export const siteUrl = (import.meta.env.VITE_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
