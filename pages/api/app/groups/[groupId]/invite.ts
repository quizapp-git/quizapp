import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type InviteBody = {
  to_user_id?: string;
};

type InviteResponse = {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InviteResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const groupIdParam = req.query.groupId;
  const groupId =
    typeof groupIdParam === "string" ? groupIdParam : groupIdParam?.[0];

  if (!groupId) {
    res.status(400).json({ error: "groupId is required", code: "MISSING_ID" });
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

  const body = req.body as InviteBody | undefined;
  const toUserId =
    typeof body?.to_user_id === "string" && body.to_user_id.length > 0
      ? body.to_user_id
      : null;

  if (!toUserId) {
    res.status(400).json({
      error: "to_user_id is required",
      code: "MISSING_TARGET"
    });
    return;
  }

  if (toUserId === user.id) {
    res.status(400).json({
      error: "Cannot invite yourself",
      code: "SELF_INVITE"
    });
    return;
  }

  const { data: groupRow, error: groupError } = await supabase
    .from("groups")
    .select("id,is_active,max_members")
    .eq("id", groupId)
    .single();

  if (groupError || !groupRow) {
    res.status(404).json({ error: "Group not found", code: "NOT_FOUND" });
    return;
  }

  if (!groupRow.is_active) {
    res
      .status(400)
      .json({ error: "Group is not active", code: "GROUP_INACTIVE" });
    return;
  }

  const { data: membershipRow } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipRow) {
    res.status(403).json({
      error: "User is not a member of this group",
      code: "NOT_MEMBER"
    });
    return;
  }

  if (membershipRow.role !== "owner" && membershipRow.role !== "admin") {
    res.status(403).json({
      error: "Only group owner or admin can invite members",
      code: "INSUFFICIENT_ROLE"
    });
    return;
  }

  const { data: targetProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", toUserId)
    .single();

  if (profileError || !targetProfile) {
    res.status(404).json({ error: "Target user not found", code: "NO_TARGET" });
    return;
  }

  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", toUserId)
    .maybeSingle();

  if (existingMembership) {
    res.status(400).json({
      error: "User is already a member of this group",
      code: "ALREADY_MEMBER"
    });
    return;
  }

  const { data: existingInvite } = await supabase
    .from("group_invitations")
    .select("id,status")
    .eq("group_id", groupId)
    .eq("to_user_id", toUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    res.status(400).json({
      error: "Invitation already pending for this user",
      code: "INVITE_EXISTS"
    });
    return;
  }

  const { count: memberCount, error: countError } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

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

  const { data: inviteRow, error: inviteError } = await supabase
    .from("group_invitations")
    .insert({
      group_id: groupId,
      from_user_id: user.id,
      to_user_id: toUserId,
      status: "pending"
    })
    .select("id,group_id,from_user_id,to_user_id,status,created_at,responded_at")
    .single();

  if (inviteError || !inviteRow) {
    res.status(500).json({ error: "Failed to create group invitation" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "GROUP_INVITE_SENT",
    target_type: "group_invitation",
    target_id: inviteRow.id,
    metadata: {
      group_id: groupId,
      from_user_id: user.id,
      to_user_id: toUserId
    }
  });

  res.status(200).json({
    id: inviteRow.id as string,
    group_id: inviteRow.group_id as string,
    from_user_id: inviteRow.from_user_id as string,
    to_user_id: inviteRow.to_user_id as string,
    status: inviteRow.status as string,
    created_at: inviteRow.created_at as string,
    responded_at: (inviteRow.responded_at as string | null) ?? null
  });
}

