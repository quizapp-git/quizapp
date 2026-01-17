import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";
import {
  getCommunicationStatus,
  type CommunicationStatus
} from "@/lib/communicationStatus";

type GetResponse = {
  profile: {
    id: string;
    email: string;
    username: string | null;
    full_name: string | null;
    mobile_number: string | null;
    city: string | null;
    country: string | null;
    avatar_url: string | null;
    display_name: string | null;
    bio: string | null;
    language: string | null;
    timezone: string | null;
    is_email_verified: boolean;
    is_phone_verified: boolean;
  };
  stats: {
    total_quizzes_played: number;
    total_quizzes_won: number;
    total_gold_won: number;
    lifetime_income_pkr: number;
    current_balance_coins: number;
    current_balance_pkr: number;
    streak_days: number;
    last_active_at: string | null;
  } | null;
  badges: {
    count: number;
    recent: Array<{ badge_id: string; unlocked_at: string }>;
  };
  ratings: {
    average: number;
    count: number;
  };
  communication: CommunicationStatus;
};

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | ErrorResponse>
) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET,PUT");
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

  if (req.method === "PUT") {
    const allowedFields = [
      "full_name",
      "mobile_number",
      "city",
      "country",
      "avatar_url",
      "display_name",
      "bio",
      "language",
      "timezone",
      "username"
    ] as const;
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const f of allowedFields) {
      if (f in body && body[f] !== undefined) updates[f] = body[f];
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) {
        res.status(400).json({ error: "Failed to update profile" });
        return;
      }
    }
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select(
      "id,email,username,full_name,mobile_number,city,country,avatar_url,display_name,bio,language,timezone,is_email_verified,is_phone_verified"
    )
    .eq("id", user.id)
    .single();
  if (pErr || !profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const { data: stats } = await supabase
    .from("player_stats")
    .select(
      "total_quizzes_played,total_quizzes_won,total_gold_won,lifetime_income_pkr,current_balance_coins,current_balance_pkr,streak_days,last_active_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: recentBadges } = await supabase
    .from("player_badges")
    .select("badge_id,unlocked_at")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false })
    .limit(5);

  const { data: ratingAgg } = await supabase
    .from("player_ratings")
    .select("stars")
    .eq("ratee_id", user.id);
  const count = ratingAgg ? ratingAgg.length : 0;
  const average =
    count > 0
      ? (ratingAgg!.reduce((a, r) => a + (r as any).stars, 0) as number) / count
      : 0;

  const communication = await getCommunicationStatus(supabase, user.id);

  res.status(200).json({
    profile: {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      full_name: profile.full_name,
      mobile_number: profile.mobile_number,
      city: profile.city,
      country: profile.country,
      avatar_url: profile.avatar_url,
      display_name: profile.display_name,
      bio: profile.bio,
      language: profile.language,
      timezone: profile.timezone,
      is_email_verified: profile.is_email_verified,
      is_phone_verified: profile.is_phone_verified
    },
    stats: stats
      ? {
          total_quizzes_played: stats.total_quizzes_played,
          total_quizzes_won: stats.total_quizzes_won,
          total_gold_won: stats.total_gold_won,
          lifetime_income_pkr: Number(stats.lifetime_income_pkr),
          current_balance_coins: stats.current_balance_coins,
          current_balance_pkr: Number(stats.current_balance_pkr),
          streak_days: stats.streak_days,
          last_active_at: stats.last_active_at
            ? new Date(stats.last_active_at).toISOString()
            : null
        }
      : null,
    badges: {
      count: recentBadges ? recentBadges.length : 0,
      recent:
        recentBadges?.map(b => ({
          badge_id: (b as any).badge_id as string,
          unlocked_at: new Date((b as any).unlocked_at).toISOString()
        })) ?? []
    },
    ratings: {
      average,
      count
    },
    communication
  });
}
