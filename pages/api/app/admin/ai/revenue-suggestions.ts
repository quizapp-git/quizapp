import type { NextApiRequest, NextApiResponse } from "next";
import {
  callAiForInsights,
  loadBusinessState,
  logAiUsage
} from "@/lib/adminAiInsights";

type RevenueSuggestionsRequestBody = {
  from?: string | null;
  to?: string | null;
  constraints?: string | null;
};

type RevenueSuggestionsResponse = {
  recommendations: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevenueSuggestionsResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body: RevenueSuggestionsRequestBody;

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
  const constraints =
    typeof body.constraints === "string" && body.constraints.length > 0
      ? body.constraints
      : null;

  try {
    const { supabase, adminId, isSuperAdmin, state } = await loadBusinessState({
      req,
      range: { from, to }
    });

    const adminRole = isSuperAdmin ? "SUPER_ADMIN" : "ADMIN";

    const recommendationsText = await callAiForInsights({
      purpose:
        "Recommend concrete actions to improve revenue and retention while " +
        "staying within the business constraints. Focus on which quizzes to " +
        "promote, how to adjust rewards and revenue share, and how to manage " +
        "payout pacing without harming user trust. Organize the answer into " +
        "short sections with headings and bullet lists.",
      businessState: state,
      extra: {
        admin_role: adminRole,
        constraints:
          constraints ||
          "Respect sustainable payout ratios and keep user incentives strong."
      }
    });

    await logAiUsage({
      supabase,
      adminId,
      action: "AI_REVENUE_SUGGESTIONS",
      metadata: {
        range: state.range,
        constraints
      }
    });

    res.status(200).json({ recommendations: recommendationsText });
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
      .json({ error: "Failed to generate revenue optimization suggestions" });
  }
}
