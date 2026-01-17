import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext } from "@/lib/supabaseServerClient";

type QuickChatMessage = {
  id: string;
  key: string;
  text: string;
  category: string;
};

type MessagesResponse = {
  messages: QuickChatMessage[];
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MessagesResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let supabase;

  try {
    const context = await getAuthContext(req);
    supabase = context.supabase;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data, error } = await supabase
    .from("quick_chat_messages")
    .select("id,key,text,category")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) {
    res.status(500).json({ error: "Failed to load quick chat messages" });
    return;
  }

  const messages: QuickChatMessage[] = (data as any[]).map((row) => ({
    id: row.id as string,
    key: row.key as string,
    text: row.text as string,
    category: row.category as string
  }));

  res.status(200).json({ messages });
}

