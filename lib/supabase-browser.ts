// Realtime client: this file is browser-safe and must never import the service-role key.

"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pictionaryChannelName } from "./pictionary-channel";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 30 } }
    });
  }
  return browserClient;
}
