import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type AdType = "INTERSTITIAL" | "REWARDED" | "BANNER";

type AdPlacement = string;

type RecordAdImpressionBody = {
  provider: string;
  ad_type: AdType;
  placement: AdPlacement;
  quiz_id: string;
  session_id: string;
  question_index: number;
};

type RecordAdImpressionResponse = {
  recorded: boolean;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecordAdImpressionResponse | ErrorResponse>
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

  const body = req.body as RecordAdImpressionBody | undefined;

  if (
    !body ||
    typeof body.quiz_id !== "string" ||
    typeof body.session_id !== "string" ||
    typeof body.question_index !== "number" ||
    body.question_index < 1 ||
    body.question_index > 10
  ) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const quizId = body.quiz_id;
  const sessionId = body.session_id;

  const { data: session, error: sessionError } = await supabase
    .from("user_quiz_sessions")
    .select("id,user_id,quiz_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.user_id !== user.id || session.quiz_id !== quizId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("ad_impressions")
    .select("id")
    .eq("user_id", user.id)
    .eq("quiz_id", quizId)
    .eq("session_id", sessionId)
    .eq("question_index", body.question_index)
    .maybeSingle();

  if (existingError) {
    res.status(500).json({ error: "Failed to check existing impression" });
    return;
  }

  if (existing) {
    res.status(200).json({ recorded: false });
    return;
  }

  const { error: insertError } = await supabase.from("ad_impressions").insert({
    user_id: user.id,
    quiz_id: quizId,
    session_id: sessionId,
    question_index: body.question_index
  });

  if (insertError) {
    res.status(500).json({ error: "Failed to record impression" });
    return;
  }

  res.status(200).json({ recorded: true });
}

