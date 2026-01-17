import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";
import { getCommunicationStatus } from "@/lib/communicationStatus";
import { createVoiceTokenForRoom } from "@/lib/voiceProvider";

type JoinRoomBody = {
  voice_room_id?: string;
  room_code?: string;
};

type JoinRoomResponse = {
  voice_room_id: string;
  provider: string;
  channel_name: string;
  token: string;
  expires_at: string;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JoinRoomResponse | ErrorResponse>
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

  const body = req.body as JoinRoomBody | undefined;
  const voiceRoomId = body?.voice_room_id;
  const roomCode = body?.room_code;

  if (!voiceRoomId && !roomCode) {
    res.status(400).json({ error: "voice_room_id or room_code is required" });
    return;
  }

  try {
    const communication = await getCommunicationStatus(supabase, user.id);
    if (!communication.can_use_voice_chat) {
      res.status(403).json({
        error: "Voice chat is locked for this user",
        code: "VOICE_CHAT_LOCKED"
      });
      return;
    }
  } catch {
    res.status(500).json({ error: "Failed to evaluate communication stage" });
    return;
  }

  let query = supabase
    .from("voice_rooms")
    .select("id,room_code,is_active")
    .limit(1);

  if (voiceRoomId) {
    query = query.eq("id", voiceRoomId);
  } else if (roomCode) {
    query = query.eq("room_code", roomCode);
  }

  const { data: rooms, error: roomError } = await query;

  if (roomError || !rooms || rooms.length === 0) {
    res.status(404).json({ error: "Voice room not found" });
    return;
  }

  const room = rooms[0];

  if (!room.is_active) {
    res.status(400).json({
      error: "Voice room is not active",
      code: "VOICE_ROOM_INACTIVE"
    });
    return;
  }

  const { error: participantError } = await supabase
    .from("voice_room_participants")
    .insert({
      voice_room_id: room.id,
      user_id: user.id
    });

  if (participantError) {
    res.status(500).json({ error: "Failed to join voice room" });
    return;
  }

  const tokenResult = await createVoiceTokenForRoom({
    roomId: room.id,
    roomCode: room.room_code,
    userId: user.id
  });

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "VOICE_ROOM_JOINED",
    target_type: "voice_room",
    target_id: room.id,
    metadata: {
      user_id: user.id
    }
  });

  res.status(200).json({
    voice_room_id: room.id,
    provider: tokenResult.provider,
    channel_name: tokenResult.channelName,
    token: tokenResult.token,
    expires_at: tokenResult.expiresAt
  });
}

