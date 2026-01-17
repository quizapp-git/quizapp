import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type FriendItem = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  is_blocked: boolean;
  since: string;
};

type FriendsResponse = {
  friends: FriendItem[];
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FriendsResponse | ErrorResponse>
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

  const { data: friendRows, error: friendsError } = await supabase
    .from("friends")
    .select("friend_id,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (friendsError) {
    res.status(500).json({ error: "Failed to load friends" });
    return;
  }

  if (!friendRows || friendRows.length === 0) {
    res.status(200).json({ friends: [] });
    return;
  }

  const friendIds = Array.from(
    new Set(friendRows.map((row: any) => row.friend_id as string))
  );

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,username,avatar_url,is_blocked")
    .in("id", friendIds);

  if (profilesError) {
    res.status(500).json({ error: "Failed to load friend profiles" });
    return;
  }

  const profilesById = new Map(
    (profiles || []).map((p: any) => [p.id as string, p])
  );

  const items: FriendItem[] = friendRows
    .map((row: any) => {
      const profile = profilesById.get(row.friend_id as string);
      if (!profile) {
        return null;
      }

      return {
        user_id: profile.id as string,
        username: (profile.username as string | null) ?? null,
        avatar_url: (profile.avatar_url as string | null) ?? null,
        is_blocked: Boolean(profile.is_blocked),
        since: row.created_at as string
      };
    })
    .filter((item): item is FriendItem => item !== null);

  res.status(200).json({ friends: items });
}

