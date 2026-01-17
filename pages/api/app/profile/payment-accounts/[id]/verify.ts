import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: true } | ErrorResponse>
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
  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  const { data: account, error: aErr } = await supabase
    .from("player_payment_accounts")
    .select("id,user_id,status")
    .eq("id", id)
    .single();
  if (aErr || !account || (account as any).user_id !== user.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { error } = await supabase
    .from("player_payment_accounts")
    .update({ status: "VERIFIED", verified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    res.status(400).json({ error: "Failed to verify" });
    return;
  }
  res.status(200).json({ ok: true });
}
