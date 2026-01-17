import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type AnswerRequestBody = {
  question_id: string;
  selected_option_index: number;
  question_index?: number;
};

type AnswerResponse = {
  correct: boolean;
};

type ErrorResponse = {
  error: string;
};

function getSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0] ?? null;
  }

  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnswerResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const quizId = getSingleParam(req.query.id);
  const sessionId = getSingleParam(req.query.sessionId);

  if (!quizId || !sessionId) {
    res.status(400).json({ error: "Quiz id and session id are required" });
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

  const body = req.body as AnswerRequestBody;

  if (
    !body ||
    !body.question_id ||
    typeof body.selected_option_index !== "number"
  ) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

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

  const { data: mapping, error: mappingError } = await supabase
    .from("quiz_questions")
    .select("question_id,sequence")
    .eq("quiz_id", quizId)
    .eq("question_id", body.question_id)
    .single();

  if (mappingError || !mapping) {
    res.status(404).json({ error: "Question not part of quiz" });
    return;
  }

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id,correct_option_index")
    .eq("id", body.question_id)
    .single();

  if (questionError || !question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const correct = body.selected_option_index === question.correct_option_index;

  res.status(200).json({ correct });
}

