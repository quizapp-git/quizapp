import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type StartSessionResponse = {
  session_id: string;
  quiz_id: string;
  total_questions: number;
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
  res: NextApiResponse<StartSessionResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const quizId = getSingleParam(req.query.id);

  if (!quizId) {
    res.status(400).json({ error: "Quiz id is required" });
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

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id,total_questions,status")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz || quiz.status !== "published") {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const totalQuestions =
    typeof quiz.total_questions === "number" ? quiz.total_questions : 0;

  const { data: session, error: sessionError } = await supabase
    .from("user_quiz_sessions")
    .insert({
      user_id: user.id,
      quiz_id: quiz.id,
      total_questions: totalQuestions
    })
    .select("id,quiz_id,total_questions")
    .single();

  if (sessionError || !session) {
    res.status(500).json({ error: "Failed to start session" });
    return;
  }

  res.status(200).json({
    session_id: session.id,
    quiz_id: session.quiz_id,
    total_questions: session.total_questions
  });
}

