import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type GroupListItem = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_public: boolean;
  max_members: number;
  is_active: boolean;
  owner_id: string;
  role: string;
  joined_at: string;
};

type GroupsResponse = {
  groups: GroupListItem[];
};

type CreateGroupBody = {
  name?: string;
  description?: string;
  is_public?: boolean;
  max_members?: number;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

type CreateGroupResponse = GroupListItem;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GroupsResponse | CreateGroupResponse | ErrorResponse>
) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET,POST");
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

  if (req.method === "GET") {
    const { data: memberRows, error: membersError } = await supabase
      .from("group_members")
      .select("group_id,role,joined_at")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });

    if (membersError) {
      res.status(500).json({ error: "Failed to load groups" });
      return;
    }

    if (!memberRows || memberRows.length === 0) {
      res.status(200).json({ groups: [] });
      return;
    }

    const groupIds = Array.from(
      new Set((memberRows as any[]).map((row) => row.group_id as string))
    );

    const { data: groupRows, error: groupsError } = await supabase
      .from("groups")
      .select(
        "id,name,description,icon,is_public,max_members,is_active,owner_id,created_at,updated_at"
      )
      .in("id", groupIds);

    if (groupsError || !groupRows) {
      res.status(500).json({ error: "Failed to load groups" });
      return;
    }

    const groupsById = new Map(
      (groupRows as any[]).map((g) => [g.id as string, g])
    );

    const items: GroupListItem[] = (memberRows as any[])
      .map((row) => {
        const group = groupsById.get(row.group_id as string);
        if (!group) {
          return null;
        }

        return {
          id: group.id as string,
          name: group.name as string,
          description: (group.description as string | null) ?? null,
          icon: (group.icon as string | null) ?? null,
          is_public: Boolean(group.is_public),
          max_members: Number(group.max_members ?? 0),
          is_active: Boolean(group.is_active),
          owner_id: group.owner_id as string,
          role: row.role as string,
          joined_at: row.joined_at as string
        };
      })
      .filter((item): item is GroupListItem => item !== null);

    res.status(200).json({ groups: items });
    return;
  }

  const body = req.body as CreateGroupBody | undefined;

  if (!body || typeof body.name !== "string") {
    res.status(400).json({ error: "name is required", code: "INVALID_NAME" });
    return;
  }

  const trimmedName = body.name.trim();

  if (!trimmedName) {
    res.status(400).json({ error: "name is required", code: "INVALID_NAME" });
    return;
  }

  const description =
    typeof body.description === "string" && body.description.length > 0
      ? body.description
      : null;
  const isPublic =
    typeof body.is_public === "boolean" ? body.is_public : false;

  let maxMembers =
    typeof body.max_members === "number" && Number.isFinite(body.max_members)
      ? Math.floor(body.max_members)
      : 20;

  if (maxMembers <= 0) {
    maxMembers = 1;
  } else if (maxMembers > 200) {
    maxMembers = 200;
  }

  const { data: groupRow, error: groupError } = await supabase
    .from("groups")
    .insert({
      name: trimmedName,
      description,
      owner_id: user.id,
      icon: null,
      is_public: isPublic,
      max_members: maxMembers
    })
    .select(
      "id,name,description,icon,is_public,max_members,is_active,owner_id,created_at,updated_at"
    )
    .single();

  if (groupError || !groupRow) {
    res.status(500).json({ error: "Failed to create group" });
    return;
  }

  const { data: memberRow, error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: groupRow.id,
      user_id: user.id,
      role: "owner"
    })
    .select("id,joined_at")
    .single();

  if (memberError || !memberRow) {
    res.status(500).json({ error: "Failed to create group membership" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "GROUP_CREATED",
    target_type: "group",
    target_id: groupRow.id,
    metadata: {
      owner_id: user.id,
      is_public: isPublic,
      max_members: maxMembers
    }
  });

  const response: GroupListItem = {
    id: groupRow.id as string,
    name: groupRow.name as string,
    description: (groupRow.description as string | null) ?? null,
    icon: (groupRow.icon as string | null) ?? null,
    is_public: Boolean(groupRow.is_public),
    max_members: Number(groupRow.max_members ?? 0),
    is_active: Boolean(groupRow.is_active),
    owner_id: groupRow.owner_id as string,
    role: "owner",
    joined_at: memberRow.joined_at as string
  };

  res.status(200).json(response);
}

