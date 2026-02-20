"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    const { url, anonKey } = getPublicSupabaseEnv();
    client = createBrowserClient(url, anonKey);
  }

  return client;
}
