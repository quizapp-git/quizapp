import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type CompleteSessionBody = {
  correct_answers: number;
  total_questions: number;
};

type CompleteSessionResponse = {
  final_score: number;
  coins_earned: number;
  coins_balance: number;
  lifetime_earned_coins: number;
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
  res: NextApiResponse<CompleteSessionResponse | ErrorResponse>
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

  const body = req.body as CompleteSessionBody;

  const correctAnswers = Math.max(
    0,
    Number.isFinite(body.correct_answers) ? Math.floor(body.correct_answers) : 0
  );
  const totalQuestions = Math.max(
    1,
    Number.isFinite(body.total_questions)
      ? Math.floor(body.total_questions)
      : 1
  );

  const { data: session, error: sessionError } = await supabase
    .from("user_quiz_sessions")
    .select("id,user_id,quiz_id,completed_at,total_questions")
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

  if (session.completed_at) {
    res.status(400).json({ error: "Session already completed" });
    return;
  }

  if (session.total_questions !== totalQuestions) {
    res
      .status(400)
      .json({ error: "Total questions does not match the session" });
    return;
  }

  if (correctAnswers > totalQuestions) {
    res.status(400).json({ error: "Invalid correct answers count" });
    return;
  }

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("reward_coins")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const rewardPerCorrect =
    typeof quiz.reward_coins === "number" ? quiz.reward_coins : 0;
  const coinsEarned = correctAnswers * rewardPerCorrect;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,coins_balance,lifetime_earned_coins")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const { data: settingsRow, error: settingsError } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "coins_to_pkr")
    .single();

  if (settingsError || !settingsRow) {
    res.status(500).json({ error: "Failed to load settings" });
    return;
  }

  const pkrPerCoin =
    typeof settingsRow.value?.pkr_per_coin === "number"
      ? settingsRow.value.pkr_per_coin
      : Number(settingsRow.value?.pkr_per_coin ?? 1);

  const now = new Date().toISOString();

  const { error: updateSessionError } = await supabase
    .from("user_quiz_sessions")
    .update({
      completed_at: now,
      correct_answers: correctAnswers,
      coins_earned: coinsEarned
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (updateSessionError) {
    res.status(500).json({ error: "Failed to update session" });
    return;
  }

  const updatedCoinsBalance = profile.coins_balance + coinsEarned;
  const updatedLifetimeCoins = profile.lifetime_earned_coins + coinsEarned;

  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({
      coins_balance: updatedCoinsBalance,
      lifetime_earned_coins: updatedLifetimeCoins
    })
    .eq("id", user.id);

  if (updateProfileError) {
    res.status(500).json({ error: "Failed to update profile" });
    return;
  }

  if (coinsEarned > 0) {
    const { error: transactionError } = await supabase
      .from("coin_transactions")
      .insert({
        user_id: user.id,
        type: "earn",
        amount_coins: coinsEarned,
        pkr_value_per_coin: pkrPerCoin,
        description: "Quiz session reward"
      });

    if (transactionError) {
      res.status(500).json({ error: "Failed to create coin transaction" });
      return;
    }
  }

  res.status(200).json({
    final_score: correctAnswers,
    coins_earned: coinsEarned,
    coins_balance: updatedCoinsBalance,
    lifetime_earned_coins: updatedLifetimeCoins
  });
}

