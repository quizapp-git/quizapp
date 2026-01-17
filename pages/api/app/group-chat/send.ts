import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";
import { applyChatFilter } from "@/lib/chatFilter";
import { getCommunicationStatus } from "@/lib/communicationStatus";

type GroupChatType = "quick" | "emoticon" | "text";

type SendBody = {
  group_id?: string;
  type?: GroupChatType;
  quick_chat_message_id?: string;
  text?: string;
};

type GroupChatMessageResponse = {
  id: string;
  group_id: string;
  from_user_id: string;
  type: GroupChatType;
  quick_chat_message_id: string | null;
  text: string | null;
  created_at: string;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GroupChatMessageResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  const body = req.body as SendBody | undefined;

  if (!body) {
    res.status(400).json({ error: "Missing request body" });
    return;
  }

  const groupId =
    typeof body.group_id === "string" && body.group_id.length > 0
      ? body.group_id
      : null;

  if (!groupId) {
    res.status(400).json({
      error: "group_id is required",
      code: "MISSING_GROUP_ID"
    });
    return;
  }

  const type =
    body.type === "quick" || body.type === "emoticon" || body.type === "text"
      ? body.type
      : null;

  if (!type) {
    res.status(400).json({
      error: "type must be 'quick', 'emoticon' or 'text'",
      code: "INVALID_TYPE"
    });
    return;
  }

  let communication;

  try {
    communication = await getCommunicationStatus(supabase, user.id);
  } catch {
    res.status(500).json({ error: "Failed to evaluate communication stage" });
    return;
  }

  const { data: senderProfile, error: senderError } = await supabase
    .from("profiles")
    .select("is_blocked,chat_muted_until")
    .eq("id", user.id)
    .single();

  if (senderError || !senderProfile) {
    res.status(500).json({ error: "Failed to load sender profile" });
    return;
  }

  if (senderProfile.is_blocked) {
    res.status(403).json({
      error: "Chat is blocked for this user",
      code: "USER_BLOCKED"
    });
    return;
  }

  if (senderProfile.chat_muted_until) {
    const mutedUntil = new Date(senderProfile.chat_muted_until as string);
    if (Number.isFinite(mutedUntil.getTime()) && mutedUntil > new Date()) {
      res.status(403).json({
        error: "User is muted from chat",
        code: "USER_MUTED"
      });
      return;
    }
  }

  const { data: groupRow, error: groupError } = await supabase
    .from("groups")
    .select("id,is_active")
    .eq("id", groupId)
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

  const { data: membershipRow } = await supabase
    .from("group_members")
    .select("id,is_muted")
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

  if (membershipRow.is_muted) {
    res.status(403).json({
      error: "User is muted in this group",
      code: "GROUP_MUTED"
    });
    return;
  }

  if (
    (type === "quick" || type === "emoticon") &&
    !communication.can_use_preset_quick_chat
  ) {
    res.status(403).json({
      error: "Quick chat is locked for this user",
      code: "QUICK_CHAT_LOCKED"
    });
    return;
  }

  if (type === "text" && !communication.can_use_custom_text_chat) {
    res.status(403).json({
      error: "Custom text chat is locked for this user",
      code: "COMMUNICATION_STAGE_INSUFFICIENT"
    });
    return;
  }

  let maxMessagesPerMinute = 10;

  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "chat_filter")
    .maybeSingle();

  if (settingsRow && typeof settingsRow.value === "object" && settingsRow.value) {
    const value = settingsRow.value as any;
    if (typeof value.max_messages_per_minute === "number") {
      maxMessagesPerMinute = value.max_messages_per_minute;
    } else if (typeof value.max_messages_per_minute === "string") {
      const parsed = Number.parseInt(value.max_messages_per_minute, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        maxMessagesPerMinute = parsed;
      }
    }
  }

  if (maxMessagesPerMinute > 0) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60_000).toISOString();

    const { count: recentCount, error: rateError } = await supabase
      .from("group_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("from_user_id", user.id)
      .eq("group_id", groupId)
      .gte("created_at", windowStart);

    if (
      !rateError &&
      typeof recentCount === "number" &&
      recentCount >= maxMessagesPerMinute
    ) {
      res.status(429).json({
        error: "Group chat rate limit exceeded",
        code: "RATE_LIMITED"
      });
      return;
    }
  }

  let quickChatMessageId: string | null = null;
  let text: string | null = null;

  if (type === "quick" || type === "emoticon") {
    quickChatMessageId =
      typeof body.quick_chat_message_id === "string" &&
      body.quick_chat_message_id.length > 0
        ? body.quick_chat_message_id
        : null;

    if (!quickChatMessageId) {
      res.status(400).json({
        error: "quick_chat_message_id is required for this type",
        code: "MISSING_MESSAGE_ID"
      });
      return;
    }

    const { data: messageRow, error: messageError } = await supabase
      .from("quick_chat_messages")
      .select("id,is_active,category")
      .eq("id", quickChatMessageId)
      .single();

    if (messageError || !messageRow) {
      res.status(404).json({
        error: "Quick chat message not found",
        code: "MESSAGE_NOT_FOUND"
      });
      return;
    }

    if (!messageRow.is_active) {
      res.status(400).json({
        error: "Quick chat message is not active",
        code: "MESSAGE_INACTIVE"
      });
      return;
    }

    if (type === "quick" && messageRow.category !== "text") {
      res.status(400).json({
        error: "Quick chat category mismatch",
        code: "CATEGORY_MISMATCH"
      });
      return;
    }

    if (type === "emoticon" && messageRow.category !== "emoticon") {
      res.status(400).json({
        error: "Emoticon category mismatch",
        code: "CATEGORY_MISMATCH"
      });
      return;
    }
  } else if (type === "text") {
    const rawText =
      typeof body.text === "string" && body.text.length > 0
        ? body.text
        : "";

    if (!rawText.trim()) {
      res.status(400).json({
        error: "text is required for type 'text'",
        code: "MISSING_TEXT"
      });
      return;
    }

    const filterResult = await applyChatFilter(supabase, rawText);

    if (!filterResult.ok && filterResult.blocked) {
      res.status(400).json({
        error: "Message blocked by chat filter",
        code: "MESSAGE_BLOCKED"
      });
      return;
    }

    text = filterResult.text;

    if (!text || !text.trim()) {
      res.status(400).json({
        error: "Message is empty after filtering",
        code: "EMPTY_AFTER_FILTER"
      });
      return;
    }
  }

  const { data: insertData, error: insertError } = await supabase
    .from("group_chat_messages")
    .insert({
      group_id: groupId,
      from_user_id: user.id,
      type,
      quick_chat_message_id: quickChatMessageId,
      text
    })
    .select("id,group_id,from_user_id,type,quick_chat_message_id,text,created_at")
    .single();

  if (insertError || !insertData) {
    res.status(500).json({ error: "Failed to send message" });
    return;
  }

  res.status(200).json({
    id: insertData.id as string,
    group_id: insertData.group_id as string,
    from_user_id: insertData.from_user_id as string,
    type: insertData.type as GroupChatType,
    quick_chat_message_id:
      (insertData.quick_chat_message_id as string | null) ?? null,
    text: (insertData.text as string | null) ?? null,
    created_at: insertData.created_at as string
  });
}
