import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type QuestionItem = {
  id: string;
  question_text: string;
  options: unknown;
  difficulty: string;
  category: string;
};

type QuizDetail = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  total_questions: number;
  questions: QuestionItem[];
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
  res: NextApiResponse<QuizDetail | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const quizId = getSingleParam(req.query.id);

  if (!quizId) {
    res.status(400).json({ error: "Quiz id is required" });
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

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .eq("status", "published")
    .single();

  if (quizError || !quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const { data: mappings, error: mappingsError } = await supabase
    .from("quiz_questions")
    .select("question_id,sequence")
    .eq("quiz_id", quizId)
    .order("sequence", { ascending: true });

  if (mappingsError || !mappings) {
    res.status(500).json({ error: "Failed to load quiz questions" });
    return;
  }

  const questionIds = mappings.map((row: any) => row.question_id);
  const questionsMap = new Map<string, QuestionItem>();

  if (questionIds.length > 0) {
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id,question_text,options,difficulty,category")
      .in("id", questionIds);

    if (questionsError || !questions) {
      res.status(500).json({ error: "Failed to load questions" });
      return;
    }

    for (const q of questions as any[]) {
      questionsMap.set(q.id, {
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        difficulty: q.difficulty,
        category: q.category
      });
    }
  }

  const orderedQuestions: QuestionItem[] = mappings
    .map((row: any) => questionsMap.get(row.question_id))
    .filter((q): q is QuestionItem => Boolean(q));

  res.status(200).json({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? null,
    difficulty: quiz.difficulty,
    total_questions: quiz.total_questions,
    questions: orderedQuestions
  });
}

