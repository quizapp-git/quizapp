import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextApiRequest } from "next";

function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not set");
  }

  return { url, anonKey };
}

export function createSupabaseServerClient(accessToken?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined
  });
}

export async function getAuthContext(
  req: NextApiRequest
): Promise<{ supabase: SupabaseClient; user: User }> {
  const authHeader = req.headers.authorization ?? req.headers.Authorization;
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (!raw || typeof raw !== "string" || !raw.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = raw.slice("Bearer ".length).trim();

  if (!token) {
    throw new Error("Unauthorized");
  }

  const supabase = createSupabaseServerClient(token);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user: data.user };
}

