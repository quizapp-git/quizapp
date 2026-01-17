import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type InvitationActionResponse = {
  success: boolean;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InvitationActionResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const invitationIdParam = req.query.invitationId;
  const invitationId =
    typeof invitationIdParam === "string"
      ? invitationIdParam
      : invitationIdParam?.[0];

  if (!invitationId) {
    res
      .status(400)
      .json({ error: "invitationId is required", code: "MISSING_ID" });
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

  const { data: invitationRow, error: invitationError } = await supabase
    .from("group_invitations")
    .select("id,group_id,from_user_id,to_user_id,status")
    .eq("id", invitationId)
    .single();

  if (invitationError || !invitationRow) {
    res
      .status(404)
      .json({ error: "Invitation not found", code: "NOT_FOUND" });
    return;
  }

  if (invitationRow.to_user_id !== user.id) {
    res.status(403).json({
      error: "User is not the target of this invitation",
      code: "NOT_TARGET"
    });
    return;
  }

  if (invitationRow.status !== "pending") {
    res.status(400).json({
      error: "Invitation is not pending",
      code: "INVITE_NOT_PENDING"
    });
    return;
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("group_invitations")
    .update({
      status: "rejected",
      responded_at: now
    })
    .eq("id", invitationRow.id);

  if (updateError) {
    res
      .status(500)
      .json({ error: "Failed to update invitation", code: "UPDATE_FAILED" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "GROUP_INVITE_REJECTED",
    target_type: "group_invitation",
    target_id: invitationRow.id,
    metadata: {
      group_id: invitationRow.group_id,
      from_user_id: invitationRow.from_user_id,
      to_user_id: invitationRow.to_user_id
    }
  });

  res.status(200).json({ success: true });
}

