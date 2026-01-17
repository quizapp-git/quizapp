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

  const { data: groupRow, error: groupError } = await supabase
    .from("groups")
    .select("id,is_active,max_members")
    .eq("id", invitationRow.group_id)
    .single();

  if (groupError || !groupRow) {
    res.status(404).json({ error: "Group not found", code: "GROUP_NOT_FOUND" });
    return;
  }

  if (!groupRow.is_active) {
    res
      .status(400)
      .json({ error: "Group is not active", code: "GROUP_INACTIVE" });
    return;
  }

  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", invitationRow.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    res.status(400).json({
      error: "User is already a member of this group",
      code: "ALREADY_MEMBER"
    });
    return;
  }

  const { count: memberCount, error: countError } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", invitationRow.group_id);

  if (
    !countError &&
    typeof memberCount === "number" &&
    typeof groupRow.max_members === "number" &&
    memberCount >= groupRow.max_members
  ) {
    res
      .status(400)
      .json({ error: "Group is full", code: "GROUP_FULL" });
    return;
  }

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: invitationRow.group_id,
    user_id: user.id,
    role: "member"
  });

  if (memberError) {
    res
      .status(500)
      .json({ error: "Failed to add user to group", code: "ADD_FAILED" });
    return;
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("group_invitations")
    .update({
      status: "accepted",
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
    action: "GROUP_INVITE_ACCEPTED",
    target_type: "group_invitation",
    target_id: invitationRow.id,
    metadata: {
      group_id: invitationRow.group_id,
      from_user_id: invitationRow.from_user_id,
      to_user_id: invitationRow.to_user_id
    }
  });

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "GROUP_MEMBER_ADDED",
    target_type: "group_member",
    target_id: null,
    metadata: {
      group_id: invitationRow.group_id,
      user_id: user.id,
      source: "invite"
    }
  });

  res.status(200).json({ success: true });
}

