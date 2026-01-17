import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type PayoutStatsPoint = {
  date: string;
  status: string;
  requests_count: number;
  total_pkr: number;
};

type PayoutMethodPoint = {
  date: string;
  method: string;
  status: string;
  requests_count: number;
  total_pkr: number;
};

type PayoutSlaPoint = {
  date: string;
  avg_hours_to_paid: number | null;
  paid_count: number;
  rejected_count: number;
};

type CashflowPoint = {
  date: string;
  admob_inflow_pkr: number;
  payouts_outflow_pkr: number;
};

type PayoutsReportResponse = {
  range: { from: string; to: string };
  payouts: PayoutStatsPoint[];
  methods: PayoutMethodPoint[];
  sla: PayoutSlaPoint[];
  cashflow: CashflowPoint[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PayoutsReportResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
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

  const { data: adminProfile, error: adminError } = await supabase
    .from("admin_profiles")
    .select("id,is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !adminProfile) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { from, to } = req.query;

  const fromDate = typeof from === "string" && from.length > 0 ? from : null;
  const toDate = typeof to === "string" && to.length > 0 ? to : null;

  const [
    { data: payoutData, error: payoutError },
    { data: methodData, error: methodError },
    { data: slaData, error: slaError },
    { data: cashflowData, error: cashflowError }
  ] = await Promise.all([
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
      .order("date", { ascending: true })
  ]);

  if (payoutError || !payoutData) {
    res.status(500).json({ error: "Failed to load payout stats" });
    return;
  }

  if (methodError || !methodData) {
    res.status(500).json({ error: "Failed to load payout method stats" });
    return;
  }

  if (slaError || !slaData) {
    res.status(500).json({ error: "Failed to load payout SLA stats" });
    return;
  }

  if (cashflowError || !cashflowData) {
    res.status(500).json({ error: "Failed to load cashflow stats" });
    return;
  }

  const payouts: PayoutStatsPoint[] = (payoutData as any[]).map((row) => ({
    date: row.date as string,
    status: String(row.status ?? ""),
    requests_count: Number(row.requests_count ?? 0),
    total_pkr: Number(row.total_pkr ?? 0)
  }));

  const methods: PayoutMethodPoint[] = (methodData as any[]).map((row) => ({
    date: row.date as string,
    method: String(row.method ?? ""),
    status: String(row.status ?? ""),
    requests_count: Number(row.requests_count ?? 0),
    total_pkr: Number(row.total_pkr ?? 0)
  }));

  const sla: PayoutSlaPoint[] = (slaData as any[]).map((row) => ({
    date: row.date as string,
    avg_hours_to_paid:
      row.avg_hours_to_paid === null || row.avg_hours_to_paid === undefined
        ? null
        : Number(row.avg_hours_to_paid),
    paid_count: Number(row.paid_count ?? 0),
    rejected_count: Number(row.rejected_count ?? 0)
  }));

  const cashflow: CashflowPoint[] = (cashflowData as any[]).map((row) => ({
    date: row.date as string,
    admob_inflow_pkr: Number(row.admob_inflow_pkr ?? 0),
    payouts_outflow_pkr: Number(row.payouts_outflow_pkr ?? 0)
  }));

  res.status(200).json({
    range: { from: fromDate ?? "", to: toDate ?? "" },
    payouts,
    methods,
    sla,
    cashflow
  });
}

