import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type Account = {
  id: string;
  user_id: string;
  type: "BANK" | "EASYPAISA" | "JAZZCASH";
  account_title: string;
  account_number: string;
  bank_name: string | null;
  is_default: boolean;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "DISABLED";
  created_at: string;
  updated_at: string;
  verified_at: string | null;
};

type ListResponse = { accounts: Account[] };
type CreateBody = {
  type: "BANK" | "EASYPAISA" | "JAZZCASH";
  account_title: string;
  account_number: string;
  bank_name?: string | null;
  is_default?: boolean;
};
type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | Account | ErrorResponse>
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

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("player_payment_accounts")
      .select(
        "id,user_id,type,account_title,account_number,bank_name,is_default,status,created_at,updated_at,verified_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load accounts" });
      return;
    }
    res.status(200).json({
      accounts:
        data?.map(a => ({
          id: (a as any).id,
          user_id: (a as any).user_id,
          type: (a as any).type,
          account_title: (a as any).account_title,
          account_number: (a as any).account_number,
          bank_name: (a as any).bank_name ?? null,
          is_default: (a as any).is_default,
          status: (a as any).status,
          created_at: new Date((a as any).created_at).toISOString(),
          updated_at: new Date((a as any).updated_at).toISOString(),
          verified_at: (a as any).verified_at
            ? new Date((a as any).verified_at).toISOString()
            : null
        })) ?? []
    });
    return;
  }

  if (req.method === "POST") {
    const body = req.body as CreateBody;
    if (
      !body ||
      !body.type ||
      !body.account_title ||
      !body.account_number ||
      (body.type === "BANK" && !body.bank_name)
    ) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    if (body.is_default) {
      await supabase
        .from("player_payment_accounts")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true);
    }

    const { data, error } = await supabase
      .from("player_payment_accounts")
      .insert({
        user_id: user.id,
        type: body.type,
        account_title: body.account_title,
        account_number: body.account_number,
        bank_name: body.bank_name ?? null,
        is_default: Boolean(body.is_default),
        status: "PENDING"
      })
      .select()
      .single();

    if (error || !data) {
      res.status(400).json({ error: "Failed to create account" });
      return;
    }

    res.status(201).json({
      id: (data as any).id,
      user_id: (data as any).user_id,
      type: (data as any).type,
      account_title: (data as any).account_title,
      account_number: (data as any).account_number,
      bank_name: (data as any).bank_name ?? null,
      is_default: (data as any).is_default,
      status: (data as any).status,
      created_at: new Date((data as any).created_at).toISOString(),
      updated_at: new Date((data as any).updated_at).toISOString(),
      verified_at: (data as any).verified_at
        ? new Date((data as any).verified_at).toISOString()
        : null
    });
    return;
  }

  res.setHeader("Allow", "GET,POST");
  res.status(405).json({ error: "Method not allowed" });
}
