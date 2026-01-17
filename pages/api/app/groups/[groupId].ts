import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type GroupMember = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  joined_at: string;
  is_muted: boolean;
};

type GroupDetailsResponse = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_public: boolean;
  max_members: number;
  is_active: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
  members: GroupMember[];
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GroupDetailsResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
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
    .select(
      "id,name,description,icon,is_public,max_members,is_active,owner_id,created_at,updated_at"
    )
    .eq("id", groupId)
    .single();

  if (groupError || !groupRow) {
    res.status(404).json({ error: "Group not found", code: "NOT_FOUND" });
    return;
  }

  const { data: membershipRow } = await supabase
    .from("group_members")
    .select("id,role")
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

  const { data: memberRows, error: membersError } = await supabase
    .from("group_members")
    .select("user_id,role,joined_at,is_muted")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (membersError) {
    res.status(500).json({ error: "Failed to load group members" });
    return;
  }

  const membersData = (memberRows as any[]) || [];

  if (membersData.length === 0) {
    const response: GroupDetailsResponse = {
      id: groupRow.id as string,
      name: groupRow.name as string,
      description: (groupRow.description as string | null) ?? null,
      icon: (groupRow.icon as string | null) ?? null,
      is_public: Boolean(groupRow.is_public),
      max_members: Number(groupRow.max_members ?? 0),
      is_active: Boolean(groupRow.is_active),
      owner_id: groupRow.owner_id as string,
      created_at: groupRow.created_at as string,
      updated_at: groupRow.updated_at as string,
      members: []
    };

    res.status(200).json(response);
    return;
  }

  const userIds = Array.from(
    new Set(membersData.map((row) => row.user_id as string))
  );

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,username,avatar_url")
    .in("id", userIds);

  if (profilesError || !profiles) {
    res.status(500).json({ error: "Failed to load member profiles" });
    return;
  }

  const profilesById = new Map(
    (profiles as any[]).map((p) => [p.id as string, p])
  );

  const members: GroupMember[] = membersData.map((row) => {
    const profile = profilesById.get(row.user_id as string);

    return {
      user_id: row.user_id as string,
      username: profile ? ((profile.username as string | null) ?? null) : null,
      avatar_url: profile
        ? ((profile.avatar_url as string | null) ?? null)
        : null,
      role: row.role as string,
      joined_at: row.joined_at as string,
      is_muted: Boolean(row.is_muted)
    };
  });

  const response: GroupDetailsResponse = {
    id: groupRow.id as string,
    name: groupRow.name as string,
    description: (groupRow.description as string | null) ?? null,
    icon: (groupRow.icon as string | null) ?? null,
    is_public: Boolean(groupRow.is_public),
    max_members: Number(groupRow.max_members ?? 0),
    is_active: Boolean(groupRow.is_active),
    owner_id: groupRow.owner_id as string,
    created_at: groupRow.created_at as string,
    updated_at: groupRow.updated_at as string,
    members
  };

  res.status(200).json(response);
}

