import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type MuteMemberResponse = {
  success: boolean;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MuteMemberResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const groupIdParam = req.query.groupId;
  const memberUserIdParam = req.query.userId;

  const groupId =
    typeof groupIdParam === "string" ? groupIdParam : groupIdParam?.[0];
  const memberUserId =
    typeof memberUserIdParam === "string"
      ? memberUserIdParam
      : memberUserIdParam?.[0];

  if (!groupId || !memberUserId) {
    res.status(400).json({
      error: "groupId and userId are required",
      code: "MISSING_PARAMS"
    });
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

  const { data: groupRow, error: groupError } = await supabase
    .from("groups")
    .select("id,is_active")
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

  const { data: actorMembership } = await supabase
    .from("group_members")
    .select("id,role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!actorMembership) {
    res.status(403).json({
      error: "User is not a member of this group",
      code: "NOT_MEMBER"
    });
    return;
  }

  if (
    actorMembership.role !== "owner" &&
    actorMembership.role !== "admin"
  ) {
    res.status(403).json({
      error: "Only group owner or admin can mute members",
      code: "INSUFFICIENT_ROLE"
    });
    return;
  }

  const { data: targetMembership } = await supabase
    .from("group_members")
    .select("id,role,user_id,is_muted")
    .eq("group_id", groupId)
    .eq("user_id", memberUserId)
    .maybeSingle();

  if (!targetMembership) {
    res.status(404).json({
      error: "Target member not found in group",
      code: "TARGET_NOT_MEMBER"
    });
    return;
  }

  if (targetMembership.role === "owner") {
    res.status(400).json({
      error: "Group owner cannot be muted",
      code: "CANNOT_MUTE_OWNER"
    });
    return;
  }

  const shouldMute = !targetMembership.is_muted;

  const { error: updateError } = await supabase
    .from("group_members")
    .update({ is_muted: shouldMute })
    .eq("id", targetMembership.id);

  if (updateError) {
    res.status(500).json({ error: "Failed to update mute state" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "GROUP_MEMBER_MUTED",
    target_type: "group_member",
    target_id: targetMembership.id,
    metadata: {
      group_id: groupId,
      muted_user_id: memberUserId,
      actor_user_id: user.id,
      is_muted: shouldMute
    }
  });

  res.status(200).json({ success: true });
}

