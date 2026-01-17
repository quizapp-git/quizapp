import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type FriendRequestItem = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  direction: "incoming" | "outgoing";
  other_user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
};

type FriendRequestsResponse = {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FriendRequestsResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let supabase;
  let user;

  try {
    const context = await getAuthContext(req);
    supabase = context.supabase;
    user = context.user;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data: incomingRows, error: incomingError } = await supabase
    .from("friend_requests")
    .select("id,from_user_id,to_user_id,status,created_at,responded_at")
    .eq("to_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (incomingError) {
    res.status(500).json({ error: "Failed to load incoming requests" });
    return;
  }

  const { data: outgoingRows, error: outgoingError } = await supabase
    .from("friend_requests")
    .select("id,from_user_id,to_user_id,status,created_at,responded_at")
    .eq("from_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (outgoingError) {
    res.status(500).json({ error: "Failed to load outgoing requests" });
    return;
  }

  const otherUserIds = Array.from(
    new Set([
      ...(incomingRows || []).map((r: any) => r.from_user_id as string),
      ...(outgoingRows || []).map((r: any) => r.to_user_id as string)
    ])
  );

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,username,avatar_url")
    .in("id", otherUserIds);

  if (profilesError) {
    res.status(500).json({ error: "Failed to load profiles" });
    return;
  }

  const profilesById = new Map(
    (profiles || []).map((p: any) => [p.id as string, p])
  );

  const incoming: FriendRequestItem[] = (incomingRows || [])
    .map((row: any) => {
      const other = profilesById.get(row.from_user_id as string);
      if (!other) {
        return null;
      }

      return {
        id: row.id as string,
        from_user_id: row.from_user_id as string,
        to_user_id: row.to_user_id as string,
        status: row.status as string,
        created_at: row.created_at as string,
        responded_at: (row.responded_at as string | null) ?? null,
        direction: "incoming",
        other_user: {
          id: other.id as string,
          username: (other.username as string | null) ?? null,
          avatar_url: (other.avatar_url as string | null) ?? null
        }
      };
    })
    .filter((item): item is FriendRequestItem => item !== null);

  const outgoing: FriendRequestItem[] = (outgoingRows || [])
    .map((row: any) => {
      const other = profilesById.get(row.to_user_id as string);
      if (!other) {
        return null;
      }

      return {
        id: row.id as string,
        from_user_id: row.from_user_id as string,
        to_user_id: row.to_user_id as string,
        status: row.status as string,
        created_at: row.created_at as string,
        responded_at: (row.responded_at as string | null) ?? null,
        direction: "outgoing",
        other_user: {
          id: other.id as string,
          username: (other.username as string | null) ?? null,
          avatar_url: (other.avatar_url as string | null) ?? null
        }
      };
    })
    .filter((item): item is FriendRequestItem => item !== null);

  res.status(200).json({ incoming, outgoing });
}

