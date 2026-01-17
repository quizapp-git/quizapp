import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type JoinGroupResponse = {
  success: boolean;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JoinGroupResponse | ErrorResponse>
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

  const { data: groupRow, error: groupError } = await supabase
    .from("groups")
    .select("id,is_public,is_active,max_members")
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

  if (!groupRow.is_public) {
    res.status(403).json({
      error: "Group is not public",
      code: "GROUP_NOT_PUBLIC"
    });
    return;
  }

  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
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

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: user.id,
    role: "member"
  });

  if (memberError) {
    res.status(500).json({ error: "Failed to join group" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "GROUP_MEMBER_ADDED",
    target_type: "group_member",
    target_id: null,
    metadata: {
      group_id: groupId,
      user_id: user.id
    }
  });

  res.status(200).json({ success: true });
}

