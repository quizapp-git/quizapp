import type { NextApiRequest, NextApiResponse } from "next";
import {
  callAiForInsights,
  loadBusinessState,
  logAiUsage
} from "@/lib/adminAiInsights";

type SummaryRequestBody = {
  from?: string | null;
  to?: string | null;
  appId?: string | null;
  quizId?: string | null;
};

type SummaryResponse = {
  summary: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SummaryResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body: SummaryRequestBody;

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
  const appId =
    typeof body.appId === "string" && body.appId.length > 0
      ? body.appId
      : null;
  const quizId =
    typeof body.quizId === "string" && body.quizId.length > 0
      ? body.quizId
      : null;

  try {
    const { supabase, adminId, isSuperAdmin, state } = await loadBusinessState({
      req,
      range: { from, to },
      appId,
      quizId
    });

    const adminRole = isSuperAdmin ? "SUPER_ADMIN" : "ADMIN";

    const summaryText = await callAiForInsights({
      purpose:
        "Summarize current performance for admins in plain language. " +
        "Cover user growth and engagement, quiz performance, AdMob revenue, " +
        "revenue sharing, coin liability and payouts. Highlight key trends " +
        "and notable changes. Use 2–3 short headings with bullet lists and " +
        "keep it under 12 bullet points.",
      businessState: state,
      extra: {
        appId,
        quizId,
        admin_role: adminRole
      }
    });

    await logAiUsage({
      supabase,
      adminId,
      action: "AI_SUMMARY",
      metadata: {
        range: state.range,
        appId,
        quizId
      }
    });

    res.status(200).json({ summary: summaryText });
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

    res.status(500).json({ error: "Failed to generate AI summary" });
  }
}
