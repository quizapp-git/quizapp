import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type GroupChatMessageItem = {
  id: string;
  group_id: string;
  from_user_id: string;
  type: string;
  quick_chat_message_id: string | null;
  text: string | null;
  created_at: string;
  sender_username: string | null;
  sender_avatar_url: string | null;
  quick_chat_key: string | null;
  quick_chat_text: string | null;
};

type MessagesResponse = {
  messages: GroupChatMessageItem[];
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MessagesResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { group_id, before, limit } = req.query;

  const groupId =
    typeof group_id === "string" ? group_id : group_id?.[0];

  if (!groupId) {
    res.status(400).json({ error: "group_id is required", code: "MISSING_ID" });
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
    .select("id")
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

  let pageSize =
    typeof limit === "string" ? parseInt(limit, 10) || 50 : 50;

  if (pageSize <= 0) {
    pageSize = 1;
  } else if (pageSize > 100) {
    pageSize = 100;
  }

  const beforeTimestamp =
    typeof before === "string" && before.length > 0 ? before : null;

  let query = supabase
    .from("group_chat_messages")
    .select(
      "id,group_id,from_user_id,type,quick_chat_message_id,text,created_at"
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (beforeTimestamp) {
    query = query.lt("created_at", beforeTimestamp);
  }

  const { data: rows, error: messagesError } = await query;

  if (messagesError || !rows) {
    res.status(500).json({ error: "Failed to load messages" });
    return;
  }

  if (rows.length === 0) {
    res.status(200).json({ messages: [] });
    return;
  }

  const senderIds = Array.from(
    new Set((rows as any[]).map((row) => row.from_user_id as string))
  );
  const quickIds = Array.from(
    new Set(
      (rows as any[])
        .map((row) => row.quick_chat_message_id as string | null)
        .filter((id): id is string => !!id)
    )
  );

  const { data: senders, error: sendersError } = await supabase
    .from("profiles")
    .select("id,username,avatar_url")
    .in("id", senderIds);

  if (sendersError || !senders) {
    res.status(500).json({ error: "Failed to load senders" });
    return;
  }

  const sendersById = new Map(
    (senders as any[]).map((p) => [p.id as string, p])
  );

  let quickById = new Map<string, any>();

  if (quickIds.length > 0) {
    const { data: quickRows, error: quickError } = await supabase
      .from("quick_chat_messages")
      .select("id,key,text")
      .in("id", quickIds);

    if (quickError) {
      res.status(500).json({ error: "Failed to load quick chat messages" });
      return;
    }

    quickById = new Map(
      ((quickRows as any[]) || []).map((row) => [row.id as string, row])
    );
  }

  const items: GroupChatMessageItem[] = (rows as any[])
    .map((row) => {
      const sender = sendersById.get(row.from_user_id as string);
      const quick =
        row.quick_chat_message_id &&
        quickById.get(row.quick_chat_message_id as string);

      return {
        id: row.id as string,
        group_id: row.group_id as string,
        from_user_id: row.from_user_id as string,
        type: row.type as string,
        quick_chat_message_id:
          (row.quick_chat_message_id as string | null) ?? null,
        text: (row.text as string | null) ?? null,
        created_at: row.created_at as string,
        sender_username: sender
          ? ((sender.username as string | null) ?? null)
          : null,
        sender_avatar_url: sender
          ? ((sender.avatar_url as string | null) ?? null)
          : null,
        quick_chat_key: quick ? ((quick.key as string | null) ?? null) : null,
        quick_chat_text: quick
          ? ((quick.text as string | null) ?? null)
          : null
      };
    })
    .reverse();

  res.status(200).json({ messages: items });
}

