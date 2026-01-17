import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type FriendRequestBody = {
  to_user_id?: string;
  username?: string;
  email?: string;
};

type FriendRequestResponse = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FriendRequestResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  const body = req.body as FriendRequestBody | undefined;

  if (!body) {
    res.status(400).json({ error: "Missing request body" });
    return;
  }

  const toUserIdRaw =
    typeof body.to_user_id === "string" && body.to_user_id.length > 0
      ? body.to_user_id
      : null;
  const usernameRaw =
    typeof body.username === "string" && body.username.length > 0
      ? body.username
      : null;
  const emailRaw =
    typeof body.email === "string" && body.email.length > 0
      ? body.email
      : null;

  if (!toUserIdRaw && !usernameRaw && !emailRaw) {
    res.status(400).json({
      error: "to_user_id, username or email is required",
      code: "MISSING_TARGET"
    });
    return;
  }

  let targetUserId: string | null = null;

  if (toUserIdRaw) {
    targetUserId = toUserIdRaw;
  } else {
    const query = supabase.from("profiles").select("id").limit(1);
    if (usernameRaw) {
      query.eq("username", usernameRaw);
    } else if (emailRaw) {
      query.eq("email", emailRaw);
    }
    const { data, error } = await query.single();
    if (error || !data) {
      res.status(404).json({ error: "Target user not found" });
      return;
    }
    targetUserId = data.id as string;
  }

  if (!targetUserId) {
    res.status(404).json({ error: "Target user not found" });
    return;
  }

  if (targetUserId === user.id) {
    res.status(400).json({
      error: "Cannot send friend request to yourself",
      code: "SELF_REQUEST"
    });
    return;
  }

  const { data: blockedByTarget } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", targetUserId)
    .eq("to_user_id", user.id)
    .eq("status", "blocked")
    .maybeSingle();

  if (blockedByTarget) {
    res.status(403).json({
      error: "This user has blocked you",
      code: "BLOCKED_BY_USER"
    });
    return;
  }

  const { data: blockedBySelf } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", user.id)
    .eq("to_user_id", targetUserId)
    .eq("status", "blocked")
    .maybeSingle();

  if (blockedBySelf) {
    res.status(400).json({
      error: "You have blocked this user",
      code: "BLOCKED_TARGET"
    });
    return;
  }

  const { data: existingFriends1 } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", user.id)
    .eq("friend_id", targetUserId)
    .limit(1);

  const { data: existingFriends2 } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", targetUserId)
    .eq("friend_id", user.id)
    .limit(1);

  if (
    (existingFriends1 && existingFriends1.length > 0) ||
    (existingFriends2 && existingFriends2.length > 0)
  ) {
    res.status(400).json({
      error: "You are already friends with this user",
      code: "ALREADY_FRIENDS"
    });
    return;
  }

  const { data: pendingFromSelf } = await supabase
    .from("friend_requests")
    .select("id,status")
    .eq("from_user_id", user.id)
    .eq("to_user_id", targetUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingFromSelf) {
    res.status(400).json({
      error: "Friend request already sent",
      code: "REQUEST_ALREADY_SENT"
    });
    return;
  }

  const { data: pendingFromTarget } = await supabase
    .from("friend_requests")
    .select("id,status")
    .eq("from_user_id", targetUserId)
    .eq("to_user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingFromTarget) {
    res.status(400).json({
      error: "Incoming friend request already exists",
      code: "REQUEST_ALREADY_EXISTS"
    });
    return;
  }

  const { data: insertData, error: insertError } = await supabase
    .from("friend_requests")
    .insert({
      from_user_id: user.id,
      to_user_id: targetUserId,
      status: "pending"
    })
    .select("id,from_user_id,to_user_id,status,created_at")
    .single();

  if (insertError || !insertData) {
    res.status(500).json({ error: "Failed to create friend request" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "FRIEND_REQUEST_SENT",
    target_type: "friend_request",
    target_id: insertData.id,
    metadata: {
      from_user_id: user.id,
      to_user_id: targetUserId
    }
  });

  res.status(200).json({
    id: insertData.id as string,
    from_user_id: insertData.from_user_id as string,
    to_user_id: insertData.to_user_id as string,
    status: insertData.status as string,
    created_at: insertData.created_at as string
  });
}

