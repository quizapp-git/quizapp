import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";
import {
  getCommunicationStatus,
  type CommunicationStatus
} from "@/lib/communicationStatus";

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CommunicationStatus | ErrorResponse>
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

  try {
    const status = await getCommunicationStatus(supabase, user.id);
    res.status(200).json(status);
  } catch {
    res.status(500).json({ error: "Failed to load communication status" });
  }
}

