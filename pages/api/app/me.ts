import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type MeResponse = {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  coins_balance: number;
  lifetime_earned_coins: number;
  coins_balance_pkr: number;
  pkr_per_coin: number;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MeResponse | ErrorResponse>
) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET,PUT");
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

  const { data: settingsRow, error: settingsError } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "coins_to_pkr")
    .single();

  if (settingsError || !settingsRow) {
    res.status(500).json({ error: "Failed to load settings" });
    return;
  }

  const pkrPerCoin =
    typeof settingsRow.value?.pkr_per_coin === "number"
      ? settingsRow.value.pkr_per_coin
      : Number(settingsRow.value?.pkr_per_coin ?? 1);

  if (req.method === "PUT") {
    const allowedFields = [
      "username",
      "avatar_url",
      "full_name",
      "mobile_number",
      "city",
      "country",
      "display_name",
      "bio",
      "language",
      "timezone"
    ] as const;

    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body && body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (updateError) {
        res.status(400).json({ error: "Failed to update profile" });
        return;
      }
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id,email,username,avatar_url,coins_balance,lifetime_earned_coins"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const coinsBalancePkr = profile.coins_balance * pkrPerCoin;

  res.status(200).json({
    id: profile.id,
    email: profile.email,
    username: profile.username,
    avatar_url: profile.avatar_url,
    coins_balance: profile.coins_balance,
    lifetime_earned_coins: profile.lifetime_earned_coins,
    coins_balance_pkr: coinsBalancePkr,
    pkr_per_coin: pkrPerCoin
  });
}
