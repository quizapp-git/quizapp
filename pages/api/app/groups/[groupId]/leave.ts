import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type LeaveGroupResponse = {
  success: boolean;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaveGroupResponse | ErrorResponse>
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

  const { data: membershipRow } = await supabase
    .from("group_members")
    .select("id,role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipRow) {
    res.status(400).json({
      error: "User is not a member of this group",
      code: "NOT_MEMBER"
    });
    return;
  }

  if (membershipRow.role === "owner") {
    res.status(400).json({
      error: "Group owner cannot leave without transferring ownership",
      code: "OWNER_CANNOT_LEAVE"
    });
    return;
  }

  const { error: deleteError } = await supabase
    .from("group_members")
    .delete()
    .eq("id", membershipRow.id);

  if (deleteError) {
    res.status(500).json({ error: "Failed to leave group" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "GROUP_MEMBER_REMOVED",
    target_type: "group_member",
    target_id: membershipRow.id,
    metadata: {
      group_id: groupId,
      user_id: user.id,
      reason: "left"
    }
  });

  res.status(200).json({ success: true });
}

