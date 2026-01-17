import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type TransactionsResponse = {
  items: unknown[];
  page: number;
  pageSize: number;
  total: number;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransactionsResponse | ErrorResponse>
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

  const { page = "1", pageSize = "20", type, from, to } = req.query;

  const pageNumber = Math.max(
    1,
    typeof page === "string" ? parseInt(page, 10) || 1 : 1
  );
  const pageSizeNumber = Math.max(
    1,
    Math.min(
      100,
      typeof pageSize === "string" ? parseInt(pageSize, 10) || 20 : 20
    )
  );

  let query = supabase
    .from("coin_transactions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (typeof type === "string" && type.length > 0) {
    query = query.eq("type", type);
  }

  if (typeof from === "string" && from.length > 0) {
    query = query.gte("created_at", from);
  }

  if (typeof to === "string" && to.length > 0) {
    query = query.lte("created_at", to);
  }

  const fromIndex = (pageNumber - 1) * pageSizeNumber;
  const toIndex = fromIndex + pageSizeNumber - 1;

  const { data, error, count } = await query.range(fromIndex, toIndex);

  if (error || !data) {
    res.status(500).json({ error: "Failed to load transactions" });
    return;
  }

  res.status(200).json({
    items: data,
    page: pageNumber,
    pageSize: pageSizeNumber,
    total: typeof count === "number" ? count : data.length
  });
}

