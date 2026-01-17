import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: true } | ErrorResponse>
) {
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

  const { data: account, error: findErr } = await supabase
    .from("player_payment_accounts")
    .select("id,user_id")
    .eq("id", id)
    .single();
  if (findErr || !account || (account as any).user_id !== user.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (req.method === "PUT") {
    const body = req.body as Record<string, unknown>;
    const allowed = [
      "account_title",
      "account_number",
      "bank_name",
      "is_default",
      "status"
    ];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in body && body[k] !== undefined) updates[k] = body[k];
    }
    if (updates.is_default === true) {
      await supabase
        .from("player_payment_accounts")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true);
    }
    const { error } = await supabase
      .from("player_payment_accounts")
      .update(updates)
      .eq("id", id);
    if (error) {
      res.status(400).json({ error: "Failed to update" });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === "DELETE") {
    const { error } = await supabase
      .from("payout_requests")
      .select("id")
      .eq("payment_account_id", id)
      .limit(1);
    const { error: delErr } = await supabase
      .from("player_payment_accounts")
      .delete()
      .eq("id", id);
    if (delErr) {
      res.status(400).json({ error: "Failed to delete" });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader("Allow", "PUT,DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
