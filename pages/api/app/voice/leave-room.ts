import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type LeaveRoomBody = {
  voice_room_id?: string;
};

type LeaveRoomResponse = {
  success: boolean;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaveRoomResponse | ErrorResponse>
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

  const body = req.body as LeaveRoomBody | undefined;
  const voiceRoomId = body?.voice_room_id;

  if (!voiceRoomId) {
    res.status(400).json({ error: "voice_room_id is required" });
    return;
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("voice_room_participants")
    .update({ left_at: now })
    .eq("voice_room_id", voiceRoomId)
    .eq("user_id", user.id)
    .is("left_at", null);

  if (updateError) {
    res.status(500).json({ error: "Failed to leave voice room" });
    return;
  }

  const { count, error: remainingError } = await supabase
    .from("voice_room_participants")
    .select("id", { count: "exact", head: true })
    .eq("voice_room_id", voiceRoomId)
    .is("left_at", null);

  if (!remainingError && typeof count === "number" && count === 0) {
    await supabase
      .from("voice_rooms")
      .update({ is_active: false })
      .eq("id", voiceRoomId);

    await supabase.from("audit_logs").insert({
      admin_id: null,
      action: "VOICE_ROOM_DISABLED",
      target_type: "voice_room",
      target_id: voiceRoomId,
      metadata: null
    });
  }

  await supabase.from("audit_logs").insert({
    admin_id: null,
    action: "VOICE_ROOM_LEFT",
    target_type: "voice_room",
    target_id: voiceRoomId,
    metadata: {
      user_id: user.id
    }
  });

  res.status(200).json({ success: true });
}

