import { getAuthContext } from "./supabaseServerClient";

type TimeRange = {
  from: string | null;
  to: string | null;
};

type LoadBusinessStateParams = {
  req: any;
  range: TimeRange;
  appId?: string | null;
  quizId?: string | null;
};

type BusinessState = {
  range: { from: string; to: string };
  admin_role: "SUPER_ADMIN" | "ADMIN";
  user_growth: any[];
  user_retention: any[];
  quiz_performance: any[];
  admob_app_daily: any[];
  quiz_ad_performance: any[];
  revenue_share_summary: any[];
  user_earnings_distribution_by_date: {
    date: string;
    total_share_pkr: number;
    total_share_coins: number;
    unique_users: number;
  }[];
  coin_liability: any | null;
  coin_velocity: any[];
  payout_stats: any[];
  payout_methods: any[];
  payout_sla: any[];
  cashflow: any[];
  settings: {
    coins_to_pkr: any | null;
    withdrawal_threshold: any | null;
    ad_revenue_share: any | null;
  };
};

type AiCallContext = {
  purpose: string;
  businessState: BusinessState;
  extra?: any;
};

export async function loadBusinessState(
  params: LoadBusinessStateParams
): Promise<{
  supabase: any;
  user: any;
  adminId: string;
  isSuperAdmin: boolean;
  state: BusinessState;
}> {
  const { req, range, appId, quizId } = params;

  const { supabase, user } = await getAuthContext(req);

  const { data: adminProfile, error: adminError } = await supabase
    .from("admin_profiles")
    .select("id,is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !adminProfile) {
    const error: any = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }

  const adminRole: "SUPER_ADMIN" | "ADMIN" = adminProfile.is_super_admin
    ? "SUPER_ADMIN"
    : "ADMIN";

  const fromDate = range.from && range.from.length > 0 ? range.from : null;
  const toDate = range.to && range.to.length > 0 ? range.to : null;

  let quizPerformanceQuery = supabase
    .from("quiz_performance_stats")
    .select("*")
    .gte("date", fromDate ?? "1970-01-01")
    .lte("date", toDate ?? "2999-12-31")
    .order("date", { ascending: true });

  if (quizId && quizId.length > 0) {
    quizPerformanceQuery = quizPerformanceQuery.eq("quiz_id", quizId);
  }

  let admobAppQuery = supabase
    .from("admob_app_daily_stats")
    .select("*")
    .gte("date", fromDate ?? "1970-01-01")
    .lte("date", toDate ?? "2999-12-31")
    .order("date", { ascending: true });

  if (appId && appId.length > 0) {
    admobAppQuery = admobAppQuery.eq("admob_app_id", appId);
  }

  let quizAdPerformanceQuery = supabase
    .from("quiz_ad_performance_stats")
    .select("*")
    .gte("date", fromDate ?? "1970-01-01")
    .lte("date", toDate ?? "2999-12-31")
    .order("date", { ascending: true });

  if (quizId && quizId.length > 0) {
    quizAdPerformanceQuery = quizAdPerformanceQuery.eq("quiz_id", quizId);
  }

  const [
    { data: userGrowthData, error: userGrowthError },
    { data: userRetentionData, error: userRetentionError },
    { data: quizPerformanceData, error: quizPerformanceError },
    { data: admobAppData, error: admobAppError },
    { data: quizAdPerformanceData, error: quizAdPerformanceError },
    { data: revenueShareData, error: revenueShareError },
    { data: userDistributionData, error: userDistributionError },
    { data: coinLiabilityData, error: coinLiabilityError },
    { data: coinVelocityData, error: coinVelocityError },
    { data: payoutStatsData, error: payoutStatsError },
    { data: payoutMethodsData, error: payoutMethodsError },
    { data: payoutSlaData, error: payoutSlaError },
    { data: cashflowData, error: cashflowError },
    { data: settingsRows, error: settingsError }
  ] = await Promise.all([
    supabase
      .from("user_engagement_stats")
      .select("*")
      .gte("date", fromDate ?? "1970-01-01")
      .lte("date", toDate ?? "2999-12-31")
      .order("date", { ascending: true }),
    supabase
      .from("user_retention_stats")
      .select("*")
      .order("cohort_date", { ascending: true }),
    quizPerformanceQuery,
    admobAppQuery,
    quizAdPerformanceQuery,
    supabase
      .from("revenue_share_summary")
      .select("*")
      .gte("date", fromDate ?? "1970-01-01")
      .lte("date", toDate ?? "2999-12-31")
      .order("date", { ascending: true }),
    supabase
      .from("user_earnings_distribution")
      .select("*")
      .gte("date", fromDate ?? "1970-01-01")
      .lte("date", toDate ?? "2999-12-31"),
    supabase.from("coin_liability_stats").select("*").limit(1),
    supabase
      .from("coin_velocity_stats")
      .select("*")
      .gte("date", fromDate ?? "1970-01-01")
      .lte("date", toDate ?? "2999-12-31")
      .order("date", { ascending: true }),
    supabase
      .from("payout_stats")
      .select("*")
      .gte("date", fromDate ?? "1970-01-01")
      .lte("date", toDate ?? "2999-12-31")
      .order("date", { ascending: true }),
    supabase
      .from("payout_method_breakdown")
      .select("*")
      .gte("date", fromDate ?? "1970-01-01")
      .lte("date", toDate ?? "2999-12-31")
      .order("date", { ascending: true }),
    supabase
      .from("payout_sla_stats")
      .select("*")
      .gte("date", fromDate ?? "1970-01-01")
      .lte("date", toDate ?? "2999-12-31")
      .order("date", { ascending: true }),
    supabase
      .from("cashflow_stats")
      .select("*")
      .gte("date", fromDate ?? "1970-01-01")
      .lte("date", toDate ?? "2999-12-31")
      .order("date", { ascending: true }),
    supabase
      .from("app_settings")
      .select("*")
      .in("key", ["coins_to_pkr", "withdrawal_threshold", "ad_revenue_share"])
  ]);

  if (
    userGrowthError ||
    userRetentionError ||
    quizPerformanceError ||
    admobAppError ||
    quizAdPerformanceError ||
    revenueShareError ||
    userDistributionError ||
    coinLiabilityError ||
    coinVelocityError ||
    payoutStatsError ||
    payoutMethodsError ||
    payoutSlaError ||
    cashflowError ||
    settingsError
  ) {
    const error: any = new Error("Failed to load analytics for AI insights");
    error.statusCode = 500;
    throw error;
  }

  const userDistributionByDateMap = new Map<
    string,
    { total_share_pkr: number; total_share_coins: number; user_ids: Set<string> }
  >();

  (userDistributionData as any[] | null | undefined)?.forEach((row: any) => {
    const date = String(row.date);
    const existing =
      userDistributionByDateMap.get(date) ||
      {
        total_share_pkr: 0,
        total_share_coins: 0,
        user_ids: new Set<string>()
      };
    existing.total_share_pkr += Number(row.total_share_pkr ?? 0);
    existing.total_share_coins += Number(row.total_share_coins ?? 0);
    if (row.user_id) {
      existing.user_ids.add(String(row.user_id));
    }
    userDistributionByDateMap.set(date, existing);
  });

  const user_earnings_distribution_by_date =
    Array.from(userDistributionByDateMap.entries()).map(
      ([date, value]) => ({
        date,
        total_share_pkr: value.total_share_pkr,
        total_share_coins: value.total_share_coins,
        unique_users: value.user_ids.size
      })
    );

  const settingsMap: Record<string, any> = {};
  (settingsRows as any[] | null | undefined)?.forEach((row: any) => {
    settingsMap[String(row.key)] = row.value;
  });

  const coinLiabilityRow = (coinLiabilityData as any[] | null | undefined)?.[0];

  const state: BusinessState = {
    range: {
      from: fromDate ?? "",
      to: toDate ?? ""
    },
    admin_role: adminRole,
    user_growth: (userGrowthData as any[]) ?? [],
    user_retention: (userRetentionData as any[]) ?? [],
    quiz_performance: (quizPerformanceData as any[]) ?? [],
    admob_app_daily: (admobAppData as any[]) ?? [],
    quiz_ad_performance: (quizAdPerformanceData as any[]) ?? [],
    revenue_share_summary: (revenueShareData as any[]) ?? [],
    user_earnings_distribution_by_date,
    coin_liability: coinLiabilityRow ?? null,
    coin_velocity: (coinVelocityData as any[]) ?? [],
    payout_stats: (payoutStatsData as any[]) ?? [],
    payout_methods: (payoutMethodsData as any[]) ?? [],
    payout_sla: (payoutSlaData as any[]) ?? [],
    cashflow: (cashflowData as any[]) ?? [],
    settings: {
      coins_to_pkr: settingsMap["coins_to_pkr"] ?? null,
      withdrawal_threshold: settingsMap["withdrawal_threshold"] ?? null,
      ad_revenue_share: settingsMap["ad_revenue_share"] ?? null
    }
  };

  return {
    supabase,
    user,
    adminId: String(adminProfile.id),
    isSuperAdmin: Boolean(adminProfile.is_super_admin),
    state
  };
}

export async function callAiForInsights(
  context: AiCallContext
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const range = context.businessState.range;
    return [
      "AI insights are not configured yet.",
      `You can still review the analytics manually for ${range.from} to ${range.to}.`,
      "Set OPENAI_API_KEY in the environment to enable AI-generated insights."
    ].join(" ");
  }

  const payload = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content:
          "You are an AI assistant embedded in an admin analytics portal for a quiz app. " +
          "You only see aggregated analytics and configuration, never raw PII. " +
          "You support internal admin roles (Super Admin, Super Manager, Super Viewer) and never regular players. " +
          "Act as a revenue and growth copilot. " +
          "Always format your final answer in GitHub-flavored markdown with short headings and bullet lists, " +
          "without code blocks or JSON, and keep answers concise, actionable and business-focused."
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            purpose: context.purpose,
            business_state: context.businessState,
            extra: context.extra ?? null
          },
          null,
          2
        )
      }
    ]
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(
      `AI provider error: ${response.status} ${response.statusText} ${text}`
    );
    throw error;
  }

  const json = (await response.json()) as any;
  const content =
    json.choices?.[0]?.message?.content &&
    typeof json.choices[0].message.content === "string"
      ? json.choices[0].message.content
      : "";

  return content.trim();
}

export async function logAiUsage(params: {
  supabase: any;
  adminId: string;
  action: string;
  metadata: any;
}): Promise<void> {
  const { supabase, adminId, action, metadata } = params;

  try {
    await supabase.from("audit_logs").insert({
      admin_id: adminId,
      action,
      target_type: "ai_insights",
      target_id: null,
      metadata
    });
  } catch {
  }
}

