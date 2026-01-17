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

  if (targetId === user.id) {
    res.status(400).json({
      error: "Cannot block yourself",
      code: "SELF_BLOCK"
    });
    return;
  }

  const { error: deleteError1 } = await supabase
    .from("friends")
    .delete()
    .eq("user_id", user.id)
    .eq("friend_id", targetId);

  if (deleteError1) {
    res.status(500).json({ error: "Failed to update friendship" });
    return;
  }

  const { error: deleteError2 } = await supabase
    .from("friends")
    .delete()
    .eq("user_id", targetId)
    .eq("friend_id", user.id);

  if (deleteError2) {
    res.status(500).json({ error: "Failed to update friendship" });
    return;
  }

  const { data: existingBlock, error: existingError } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", user.id)
    .eq("to_user_id", targetId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    res.status(500).json({ error: "Failed to update block state" });
    return;
  }

  if (existingBlock) {
    const { error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: "blocked", responded_at: new Date().toISOString() })
      .eq("id", existingBlock.id);

    if (updateError) {
      res.status(500).json({ error: "Failed to update block state" });
      return;
    }
  } else {
    const { error: insertError } = await supabase.from("friend_requests").insert({
      from_user_id: user.id,
      to_user_id: targetId,
      status: "blocked",
      responded_at: new Date().toISOString()
    });

    if (insertError) {
      res.status(500).json({ error: "Failed to create block state" });
      return;
    }
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "USER_BLOCKED",
    target_type: "profile",
    target_id: targetId,
    metadata: {
      blocked_by: user.id
    }
  });

  res.status(200).json({ success: true });
}

