import type { NextApiRequest, NextApiResponse } from "next";

type HealthResponse = {
  status: string;
  supabaseConfigured: boolean;
  timestamp: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  const supabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  res.status(200).json({
    status: "ok",
    supabaseConfigured,
    timestamp: new Date().toISOString()
  });
}

