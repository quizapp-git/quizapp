import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type QuizListItem = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  total_questions: number;
  reward_coins: number;
  reward_type: "per_quiz" | "per_question";
};

type QuizzesResponse = {
  items: QuizListItem[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuizzesResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let supabase;

  try {
    const context = await getAuthContext(req);
    supabase = context.supabase;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { difficulty } = req.query;

  let query = supabase
    .from("quizzes")
    .select("id,title,description,difficulty,total_questions,reward_coins")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (typeof difficulty === "string" && difficulty.length > 0) {
    query = query.eq("difficulty", difficulty);
  }

  const { data, error } = await query;

  if (error || !data) {
    res.status(500).json({ error: "Failed to load quizzes" });
    return;
  }

  const items: QuizListItem[] = data.map((quiz: any) => ({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? null,
    difficulty: quiz.difficulty,
    total_questions: quiz.total_questions,
    reward_coins: quiz.reward_coins,
    reward_type: "per_quiz"
  }));

  res.status(200).json({ items });
}

