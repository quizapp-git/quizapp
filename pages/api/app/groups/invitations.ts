import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type GroupInvitationItem = {
  id: string;
  group_id: string;
  group_name: string | null;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
};

type GroupInvitationsResponse = {
  invitations: GroupInvitationItem[];
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GroupInvitationsResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
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

  const { data: outgoing, error: outgoingError } = await supabase
    .from("group_invitations")
    .select("id,group_id,from_user_id,to_user_id,status,created_at,responded_at")
    .eq("from_user_id", user.id);

  if (outgoingError) {
    res
      .status(500)
      .json({ error: "Failed to load group invitations" });
    return;
  }

  const { data: incoming, error: incomingError } = await supabase
    .from("group_invitations")
    .select("id,group_id,from_user_id,to_user_id,status,created_at,responded_at")
    .eq("to_user_id", user.id);

  if (incomingError) {
    res
      .status(500)
      .json({ error: "Failed to load group invitations" });
    return;
  }

  const rows = [
    ...((outgoing as any[]) || []),
    ...((incoming as any[]) || [])
  ];

  if (rows.length === 0) {
    res.status(200).json({ invitations: [] });
    return;
  }

  const groupIds = Array.from(
    new Set(rows.map((row) => row.group_id as string))
  );

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id,name")
    .in("id", groupIds);

  if (groupsError || !groups) {
    res
      .status(500)
      .json({ error: "Failed to load groups for invitations" });
    return;
  }

  const groupsById = new Map(
    (groups as any[]).map((g) => [g.id as string, g])
  );

  const invitations: GroupInvitationItem[] = rows.map((row) => {
    const group = groupsById.get(row.group_id as string);

    return {
      id: row.id as string,
      group_id: row.group_id as string,
      group_name: group ? ((group.name as string | null) ?? null) : null,
      from_user_id: row.from_user_id as string,
      to_user_id: row.to_user_id as string,
      status: row.status as string,
      created_at: row.created_at as string,
      responded_at: (row.responded_at as string | null) ?? null
    };
  });

  res.status(200).json({ invitations });
}

