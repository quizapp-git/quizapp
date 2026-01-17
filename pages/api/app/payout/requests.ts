import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type CreatePayoutRequestBody = {
  coins_requested?: number;
  pkr_amount?: number;
  method: "bank_transfer" | "easypaisa" | "jazzcash";
  method_details: unknown;
};

type PayoutRequest = {
  id: string;
  coins_requested: number;
  pkr_amount: number;
  status: string;
  method: string;
  method_details: unknown;
  requested_at: string;
};

type PayoutRequestsResponse = {
  items: PayoutRequest[];
};

type CreatePayoutResponse = {
  request: PayoutRequest;
  coins_balance: number;
  coins_balance_pkr: number;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    PayoutRequestsResponse | CreatePayoutResponse | ErrorResponse
  >
) {
  if (req.method === "GET") {
    await handleGet(req, res);
    return;
  }

  if (req.method === "POST") {
    await handlePost(req, res);
    return;
  }

  res.setHeader("Allow", "GET,POST");
  res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<PayoutRequestsResponse | ErrorResponse>
) {
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

  const { data, error } = await supabase
    .from("payout_requests")
    .select(
      "id,coins_requested,pkr_amount,status,method,method_details,requested_at"
    )
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false });

  if (error || !data) {
    res.status(500).json({ error: "Failed to load payout requests" });
    return;
  }

  res.status(200).json({
    items: data as PayoutRequest[]
  });
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<CreatePayoutResponse | ErrorResponse>
) {
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

  const body = req.body as CreatePayoutRequestBody;

  if (!body || !body.method || !body.method_details) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const hasCoinsRequested =
    typeof body.coins_requested === "number" && body.coins_requested > 0;
  const hasPkrAmount =
    typeof body.pkr_amount === "number" && body.pkr_amount > 0;

  if (hasCoinsRequested === hasPkrAmount) {
    res.status(400).json({
      error: "Provide exactly one of coins_requested or pkr_amount"
    });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,coins_balance")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const { data: settingsRows, error: settingsError } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["coins_to_pkr", "withdrawal_threshold"]);

  if (settingsError || !settingsRows) {
    res.status(500).json({ error: "Failed to load settings" });
    return;
  }

  const coinsToPkr = settingsRows.find(
    (row: any) => row.key === "coins_to_pkr"
  );
  const withdrawalThreshold = settingsRows.find(
    (row: any) => row.key === "withdrawal_threshold"
  );

  const pkrPerCoin =
    typeof coinsToPkr?.value?.pkr_per_coin === "number"
      ? coinsToPkr.value.pkr_per_coin
      : Number(coinsToPkr?.value?.pkr_per_coin ?? 1);

  const minPkr =
    typeof withdrawalThreshold?.value?.min_pkr === "number"
      ? withdrawalThreshold.value.min_pkr
      : Number(withdrawalThreshold?.value?.min_pkr ?? 0);

  let coinsRequested: number;
  let pkrAmount: number;

  if (hasCoinsRequested) {
    coinsRequested = Math.floor(body.coins_requested ?? 0);
    pkrAmount = coinsRequested * pkrPerCoin;
  } else {
    pkrAmount = body.pkr_amount ?? 0;
    coinsRequested = Math.ceil(pkrAmount / pkrPerCoin);
  }

  if (pkrAmount < minPkr) {
    res.status(400).json({ error: "Requested amount is below minimum" });
    return;
  }

  if (coinsRequested > profile.coins_balance) {
    res.status(400).json({ error: "Insufficient coin balance" });
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("payout_requests")
    .insert({
      user_id: user.id,
      coins_requested: coinsRequested,
      pkr_amount: pkrAmount,
      status: "pending",
      method: body.method,
      method_details: body.method_details
    })
    .select(
      "id,coins_requested,pkr_amount,status,method,method_details,requested_at"
    )
    .single();

  if (insertError || !inserted) {
    res.status(500).json({ error: "Failed to create payout request" });
    return;
  }

  const updatedCoinsBalance = profile.coins_balance - coinsRequested;

  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({ coins_balance: updatedCoinsBalance })
    .eq("id", user.id);

  if (updateProfileError) {
    res.status(500).json({ error: "Failed to update profile balance" });
    return;
  }

  const { error: transactionError } = await supabase
    .from("coin_transactions")
    .insert({
      user_id: user.id,
      type: "withdrawal",
      amount_coins: coinsRequested,
      pkr_value_per_coin: pkrPerCoin,
      description: "Payout request"
    });

  if (transactionError) {
    res.status(500).json({ error: "Failed to create coin transaction" });
    return;
  }

  res.status(200).json({
    request: inserted as PayoutRequest,
    coins_balance: updatedCoinsBalance,
    coins_balance_pkr: updatedCoinsBalance * pkrPerCoin
  });
}

