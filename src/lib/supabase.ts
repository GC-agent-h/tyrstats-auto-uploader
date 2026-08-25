import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "./config";

export const supabase: SupabaseClient | null = hasSupabaseConfig()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "tyr-auto-uploader-auth",
      },
    })
  : null;
