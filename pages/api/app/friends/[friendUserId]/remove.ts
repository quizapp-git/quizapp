import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type SuccessResponse = {
  success: true;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
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

  const { friendUserId } = req.query;
  const targetId =
    typeof friendUserId === "string" && friendUserId.length > 0
      ? friendUserId
      : Array.isArray(friendUserId)
        ? friendUserId[0]
        : null;

  if (!targetId) {
    res.status(400).json({ error: "Missing friendUserId", code: "MISSING_ID" });
    return;
  }

  const { data: friendRow, error: friendError } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", user.id)
    .eq("friend_id", targetId)
    .maybeSingle();

  if (friendError) {
    res.status(500).json({ error: "Failed to check friendship" });
    return;
  }

  if (!friendRow) {
    res.status(404).json({
      error: "Friendship not found",
      code: "NOT_FRIENDS"
    });
    return;
  }

  const { error: deleteError1 } = await supabase
    .from("friends")
    .delete()
    .eq("user_id", user.id)
    .eq("friend_id", targetId);

  if (deleteError1) {
    res.status(500).json({ error: "Failed to remove friendship" });
    return;
  }

  const { error: deleteError2 } = await supabase
    .from("friends")
    .delete()
    .eq("user_id", targetId)
    .eq("friend_id", user.id);

  if (deleteError2) {
    res.status(500).json({ error: "Failed to remove friendship" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "FRIEND_REMOVED",
    target_type: "friendship",
    target_id: null,
    metadata: {
      user_id: user.id,
      friend_user_id: targetId
    }
  });

  res.status(200).json({ success: true });
}

