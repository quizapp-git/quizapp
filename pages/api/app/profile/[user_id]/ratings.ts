import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type Item = {
  id: string;
  rater_id: string;
  stars: number;
  review: string | null;
  created_at: string;
};
type Response = { items: Item[]; average: number; count: number };
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
  try {
    const ctx = await getAuthContext(req);
    supabase = ctx.supabase;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.query.user_id as string;
  if (!userId) {
    res.status(400).json({ error: "Missing user_id" });
    return;
  }
  const { data, error } = await supabase
    .from("player_ratings")
    .select("id,rater_id,stars,review,created_at")
    .eq("ratee_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    res.status(500).json({ error: "Failed to load ratings" });
    return;
  }
  const items =
    data?.map(r => ({
      id: (r as any).id,
      rater_id: (r as any).rater_id,
      stars: (r as any).stars,
      review: (r as any).review ?? null,
      created_at: new Date((r as any).created_at).toISOString()
    })) ?? [];
  const count = items.length;
  const average =
    count > 0
      ? items.reduce((a, b) => a + b.stars, 0) / count
      : 0;
  res.status(200).json({ items, average, count });
}
