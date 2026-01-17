import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";
import { getCommunicationStatus } from "@/lib/communicationStatus";

type CreateRoomBody = {
  quiz_id?: string | null;
};

type CreateRoomResponse = {
  voice_room_id: string;
  room_code: string;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateRoomResponse | ErrorResponse>
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

  const body = req.body as CreateRoomBody | undefined;
  const quizId = body?.quiz_id ?? null;

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

  let roomCode = generateRoomCode();
  let createdRoomId: string | null = null;
  let createdRoomCode: string | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from("voice_rooms")
      .insert({
        quiz_id: quizId,
        room_code: roomCode,
        is_active: true
      })
      .select("id,room_code")
      .single();

    if (!error && data) {
      createdRoomId = data.id;
      createdRoomCode = data.room_code;
      break;
    }

    roomCode = generateRoomCode();
  }

  if (!createdRoomId || !createdRoomCode) {
    res.status(500).json({ error: "Failed to create voice room" });
    return;
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "VOICE_ROOM_CREATED",
    target_type: "voice_room",
    target_id: createdRoomId,
    metadata: {
      user_id: user.id,
      quiz_id: quizId
    }
  });

  res.status(200).json({
    voice_room_id: createdRoomId,
    room_code: createdRoomCode
  });
}

