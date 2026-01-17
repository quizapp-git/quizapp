import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type ErrorResponse = { error: string };
type Success = { ok: true };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Success | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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
  const body = req.body as {
    ratee_id: string;
    stars: number;
    review?: string;
    session_id?: string;
  };
  if (
    !body ||
    !body.ratee_id ||
    typeof body.stars !== "number" ||
    body.stars < 1 ||
    body.stars > 5
  ) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  if (body.ratee_id === user.id) {
    res.status(400).json({ error: "Cannot rate yourself" });
    return;
  }
  const { error } = await supabase
    .from("player_ratings")
    .insert({
      rater_id: user.id,
      ratee_id: body.ratee_id,
      stars: body.stars,
      review: body.review ?? null,
      session_id: body.session_id ?? null
    });
  if (error) {
    res.status(400).json({ error: "Failed to rate" });
    return;
  }
  res.status(200).json({ ok: true });
}
