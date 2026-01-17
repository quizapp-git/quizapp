import type { NextApiRequest, NextApiResponse } from "next";
import {
  callAiForInsights,
  loadBusinessState,
  logAiUsage
} from "@/lib/adminAiInsights";

type WhatIfScenario = {
  newPkrPerCoin?: number | null;
  newWithdrawalThreshold?: number | null;
  newUserSharePercent?: number | null;
  newPlatformSharePercent?: number | null;
  newRewardCoinsPerQuiz?: number | null;
};

type WhatIfRequestBody = {
  from?: string | null;
  to?: string | null;
  scenario?: WhatIfScenario | null;
};

type WhatIfResponse = {
  analysis: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WhatIfResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body: WhatIfRequestBody;

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

  const scenario: WhatIfScenario = {
    newPkrPerCoin:
      body.scenario && typeof body.scenario.newPkrPerCoin === "number"
        ? body.scenario.newPkrPerCoin
        : null,
    newWithdrawalThreshold:
      body.scenario && typeof body.scenario.newWithdrawalThreshold === "number"
        ? body.scenario.newWithdrawalThreshold
        : null,
    newUserSharePercent:
      body.scenario && typeof body.scenario.newUserSharePercent === "number"
        ? body.scenario.newUserSharePercent
        : null,
    newPlatformSharePercent:
      body.scenario &&
      typeof body.scenario.newPlatformSharePercent === "number"
        ? body.scenario.newPlatformSharePercent
        : null,
    newRewardCoinsPerQuiz:
      body.scenario && typeof body.scenario.newRewardCoinsPerQuiz === "number"
        ? body.scenario.newRewardCoinsPerQuiz
        : null
  };

  try {
    const { supabase, adminId, isSuperAdmin, state } = await loadBusinessState({
      req,
      range: { from, to }
    });

    if (!isSuperAdmin) {
      res.status(403).json({
        error:
          "Only Super Admins can run what-if simulations for critical settings."
      });
      return;
    }

    const adminRole = "SUPER_ADMIN";

    const analysisText = await callAiForInsights({
      purpose:
        "Simulate the qualitative impact of changing coin value, withdrawal " +
        "thresholds, revenue share percentages and quiz rewards. Explain how " +
        "user earnings distribution, platform margins and user motivation " +
        "might change, and call out risks. Treat results as directional only. " +
        "Structure the answer as three sections (Overview, Impacts, Risks) " +
        "with concise bullet lists.",
      businessState: state,
      extra: {
        scenario,
        admin_role: adminRole
      }
    });

    await logAiUsage({
      supabase,
      adminId,
      action: "AI_WHAT_IF",
      metadata: {
        range: state.range,
        scenario
      }
    });

    res.status(200).json({ analysis: analysisText });
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
      .json({ error: "Failed to generate what-if simulation analysis" });
  }
}

