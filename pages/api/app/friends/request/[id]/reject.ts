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

  const { id } = req.query;
  const requestId =
    typeof id === "string" && id.length > 0 ? id : Array.isArray(id) ? id[0] : null;

  if (!requestId) {
    res.status(400).json({ error: "Missing request id", code: "MISSING_ID" });
    return;
  }

  const { data: request, error: requestError } = await supabase
    .from("friend_requests")
    .select("id,from_user_id,to_user_id,status")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    res.status(404).json({ error: "Friend request not found" });
    return;
  }

  if (request.to_user_id !== user.id) {
    res.status(403).json({
      error: "Only the recipient can reject this request",
      code: "NOT_RECIPIENT"
    });
    return;
  }

  if (request.status !== "pending") {
    res.status(400).json({
      error: "Only pending requests can be rejected",
      code: "INVALID_STATUS"
    });
    return;
  }

  const nowIso = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("friend_requests")
    .update({ status: "rejected", responded_at: nowIso })
    .eq("id", requestId);

  if (updateError) {
    res.status(500).json({ error: "Failed to update friend request" });
    return;
  }

  res.status(200).json({ success: true });
}

