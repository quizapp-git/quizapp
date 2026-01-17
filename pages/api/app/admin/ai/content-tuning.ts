import type { NextApiRequest, NextApiResponse } from "next";
import {
  callAiForInsights,
  loadBusinessState,
  logAiUsage
} from "@/lib/adminAiInsights";

type ContentTuningRequestBody = {
  from?: string | null;
  to?: string | null;
  quizId?: string | null;
};

type ContentTuningResponse = {
  insights: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContentTuningResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body: ContentTuningRequestBody;

  try {
    body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const from =
    typeof body.from === "string" && body.from.length > 0 ? body.from : null;
  const to =
    typeof body.to === "string" && body.to.length > 0 ? body.to : null;
  const quizId =
    typeof body.quizId === "string" && body.quizId.length > 0
      ? body.quizId
      : null;

  try {
    const { supabase, adminId, isSuperAdmin, state } = await loadBusinessState({
      req,
      range: { from, to },
      quizId
    });

    const adminRole = isSuperAdmin ? "SUPER_ADMIN" : "ADMIN";

    const insightsText = await callAiForInsights({
      purpose:
        "Identify quizzes and questions that may be too hard or confusing, " +
        "and suggest how to rebalance content and difficulty to improve " +
        "completion and ad impressions while keeping the experience fair. " +
        "Use headings and bullet lists so admins can scan quickly.",
      businessState: state,
      extra: {
        focus_quiz_id: quizId ?? null,
        admin_role: adminRole
      }
    });

    await logAiUsage({
      supabase,
      adminId,
      action: "AI_CONTENT_TUNING",
      metadata: {
        range: state.range,
        quizId
      }
    });

    res.status(200).json({ insights: insightsText });
  } catch (error: any) {
    if (error && typeof error.statusCode === "number") {
      const status = error.statusCode;
      if (status === 401) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (status === 403) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (status === 400) {
        res.status(400).json({ error: "Bad request" });
        return;
      }
    }

    res
      .status(500)
      .json({ error: "Failed to generate content and difficulty tuning" });
  }
}
