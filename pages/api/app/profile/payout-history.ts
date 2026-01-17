import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type PayoutItem = {
  id: string;
  coins_requested: number;
  pkr_amount: number;
  status: string;
  method: string;
  requested_at: string;
  processed_at: string | null;
  payment_account_id: string | null;
};
type Response = { items: PayoutItem[] };
type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  let supabase;
  let user;
  try {
    const ctx = await getAuthContext(req);
    supabase = ctx.supabase;
    user = ctx.user;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { data, error } = await supabase
    .from("payout_requests")
    .select(
      "id,coins_requested,pkr_amount,status,method,requested_at,processed_at,payment_account_id"
    )
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: "Failed to load history" });
    return;
  }
  const items =
    data?.map(p => ({
      id: (p as any).id,
      coins_requested: (p as any).coins_requested,
      pkr_amount: Number((p as any).pkr_amount),
      status: (p as any).status,
      method: (p as any).method,
      requested_at: new Date((p as any).requested_at).toISOString(),
      processed_at: (p as any).processed_at
        ? new Date((p as any).processed_at).toISOString()
        : null,
      payment_account_id: (p as any).payment_account_id ?? null
    })) ?? [];
  res.status(200).json({ items });
}
