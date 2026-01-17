import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";
import { getCommunicationStatus } from "@/lib/communicationStatus";

type QuickChatSendBody = {
  to_user_id?: string;
  quick_chat_message_id?: string;
  quiz_id?: string | null;
  session_id?: string | null;
  context?: string | null;
};

type QuickChatEventResponse = {
  id: string;
  from_user_id: string;
  to_user_id: string | null;
  quick_chat_message_id: string;
  quiz_id: string | null;
  session_id: string | null;
  context: string | null;
  created_at: string;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuickChatEventResponse | ErrorResponse>
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

  const body = req.body as QuickChatSendBody | undefined;

  if (!body) {
    res.status(400).json({ error: "Missing request body" });
    return;
  }

  const toUserId =
    typeof body.to_user_id === "string" && body.to_user_id.length > 0
      ? body.to_user_id
      : null;
  const quickChatMessageId =
    typeof body.quick_chat_message_id === "string" &&
    body.quick_chat_message_id.length > 0
      ? body.quick_chat_message_id
      : null;

  if (!quickChatMessageId) {
    res.status(400).json({
      error: "quick_chat_message_id is required",
      code: "MISSING_MESSAGE_ID"
    });
    return;
  }

  if (!toUserId) {
    res.status(400).json({
      error: "to_user_id is required",
      code: "MISSING_TARGET"
    });
    return;
  }

  if (toUserId === user.id) {
    res.status(400).json({
      error: "Cannot send quick chat to yourself",
      code: "SELF_TARGET"
    });
    return;
  }

  try {
    const communication = await getCommunicationStatus(supabase, user.id);
    if (!communication.can_use_preset_quick_chat) {
      res.status(403).json({
        error: "Quick chat is locked for this user",
        code: "QUICK_CHAT_LOCKED"
      });
      return;
    }
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

  const { data: recipientProfile, error: recipientError } = await supabase
    .from("profiles")
    .select("id,is_blocked")
    .eq("id", toUserId)
    .single();

  if (recipientError || !recipientProfile) {
    res.status(404).json({ error: "Recipient not found" });
    return;
  }

  if (recipientProfile.is_blocked) {
    res.status(403).json({
      error: "Recipient is blocked from chat",
      code: "RECIPIENT_BLOCKED"
    });
    return;
  }

  const { data: blockRow1 } = await supabase
    .from("friend_requests")
    .select("id,status")
    .eq("from_user_id", user.id)
    .eq("to_user_id", toUserId)
    .eq("status", "blocked")
    .maybeSingle();

  if (blockRow1) {
    res.status(403).json({
      error: "You have blocked this user",
      code: "BLOCKED_TARGET"
    });
    return;
  }

  const { data: blockRow2 } = await supabase
    .from("friend_requests")
    .select("id,status")
    .eq("from_user_id", toUserId)
    .eq("to_user_id", user.id)
    .eq("status", "blocked")
    .maybeSingle();

  if (blockRow2) {
    res.status(403).json({
      error: "This user has blocked you",
      code: "BLOCKED_BY_USER"
    });
    return;
  }

  const { data: friendRow1 } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", user.id)
    .eq("friend_id", toUserId)
    .limit(1)
    .maybeSingle();

  const { data: friendRow2 } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", toUserId)
    .eq("friend_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!friendRow1 && !friendRow2) {
    res.status(403).json({
      error: "Quick chat is only allowed between friends",
      code: "NOT_FRIENDS"
    });
    return;
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - 60_000).toISOString();

  const { count: recentCount, error: rateError } = await supabase
    .from("quick_chat_events")
    .select("id", { count: "exact", head: true })
    .eq("from_user_id", user.id)
    .gte("created_at", windowStart);

  if (!rateError && typeof recentCount === "number" && recentCount >= 30) {
    res.status(429).json({
      error: "Quick chat rate limit exceeded",
      code: "RATE_LIMITED"
    });
    return;
  }

  const { data: messageRow, error: messageError } = await supabase
    .from("quick_chat_messages")
    .select("id,is_active")
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

  const quizId =
    typeof body.quiz_id === "string" && body.quiz_id.length > 0
      ? body.quiz_id
      : null;
  const sessionId =
    typeof body.session_id === "string" && body.session_id.length > 0
      ? body.session_id
      : null;
  const context =
    typeof body.context === "string" && body.context.length > 0
      ? body.context
      : null;

  const { data: insertData, error: insertError } = await supabase
    .from("quick_chat_events")
    .insert({
      from_user_id: user.id,
      to_user_id: toUserId,
      quick_chat_message_id: quickChatMessageId,
      quiz_id: quizId,
      session_id: sessionId,
      context
    })
    .select(
      "id,from_user_id,to_user_id,quick_chat_message_id,quiz_id,session_id,context,created_at"
    )
    .single();

  if (insertError || !insertData) {
    res.status(500).json({ error: "Failed to send quick chat message" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "QUICK_CHAT_MESSAGE_SENT",
    target_type: "quick_chat_event",
    target_id: insertData.id,
    metadata: {
      from_user_id: user.id,
      to_user_id: toUserId,
      quick_chat_message_id: quickChatMessageId,
      quiz_id: quizId,
      session_id: sessionId,
      context
    }
  });

  res.status(200).json({
    id: insertData.id as string,
    from_user_id: insertData.from_user_id as string,
    to_user_id: (insertData.to_user_id as string | null) ?? null,
    quick_chat_message_id: insertData.quick_chat_message_id as string,
    quiz_id: (insertData.quiz_id as string | null) ?? null,
    session_id: (insertData.session_id as string | null) ?? null,
    context: (insertData.context as string | null) ?? null,
    created_at: insertData.created_at as string
  });
}

