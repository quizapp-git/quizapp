import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type Item = {
  id: string;
  type: string;
  amount_coins: number;
  pkr_value_per_coin: number;
  description: string | null;
  created_at: string;
};
type Response = { items: Item[]; nextCursor: string | null };
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
  const limit = Math.min(
    Number(req.query.limit ?? 25),
    100
  );
  const cursor = req.query.cursor as string | undefined;
  let query = supabase
    .from("coin_transactions")
    .select(
      "id,type,amount_coins,pkr_value_per_coin,description,created_at"
    )
    .eq("user_id", user.id)
    .in("type", ["earn", "ad_revenue_share", "withdrawal"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (cursor) {
    query = query.lt("created_at", cursor);
  }
  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: "Failed to load history" });
    return;
  }
  const items =
    data?.map(r => ({
      id: (r as any).id as string,
      type: (r as any).type as string,
      amount_coins: (r as any).amount_coins as number,
      pkr_value_per_coin: Number((r as any).pkr_value_per_coin),
      description: ((r as any).description ?? null) as string | null,
      created_at: new Date((r as any).created_at).toISOString()
    })) ?? [];
  const nextCursor = items.length === limit ? items[items.length - 1].created_at : null;
  res.status(200).json({ items, nextCursor });
}
