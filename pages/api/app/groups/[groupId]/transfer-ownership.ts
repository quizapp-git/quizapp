import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type TransferOwnershipResponse = {
  success: boolean;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransferOwnershipResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { groupId } = req.query;
  const { newOwnerId } = req.body;

  if (!groupId || typeof groupId !== "string") {
    res.status(400).json({ error: "Invalid groupId" });
    return;
  }

  if (!newOwnerId || typeof newOwnerId !== "string") {
    res.status(400).json({ error: "Invalid newOwnerId" });
    return;
  }

  let supabase;
  let userId;

  try {
    const context = await getAuthContext(req);
    supabase = context.supabase;
    userId = context.user.id;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // 1. Check if group exists and current user is owner
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  if (group.owner_id !== userId) {
    res.status(403).json({ error: "Only the owner can transfer ownership" });
    return;
  }

  if (newOwnerId === userId) {
    res.status(400).json({ error: "You are already the owner" });
    return;
  }

  // 2. Check if new owner is a member of the group
  const { data: member, error: memberError } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", newOwnerId)
    .single();

  if (memberError || !member) {
    res.status(400).json({ error: "New owner must be a member of the group" });
    return;
  }

  // 3. Perform updates
  // We'll update the group owner_id first
  const { error: updateGroupError } = await supabase
    .from("groups")
    .update({ owner_id: newOwnerId })
    .eq("id", groupId);

  if (updateGroupError) {
    console.error("Error updating group owner:", updateGroupError);
    res.status(500).json({ error: "Failed to transfer ownership" });
    return;
  }

  // Update new owner's role to 'owner'
  await supabase
    .from("group_members")
    .update({ role: "owner" })
    .eq("group_id", groupId)
    .eq("user_id", newOwnerId);

  // Update old owner's role to 'admin'
  await supabase
    .from("group_members")
    .update({ role: "admin" })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  // 4. Audit Log
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "group_transfer_ownership",
    details: {
      group_id: groupId,
      new_owner_id: newOwnerId,
      old_owner_id: userId,
    },
  });

  res.status(200).json({ success: true });
}
