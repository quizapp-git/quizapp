import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/hooks";
import { get, post } from "../api/client";
import { supabase } from "../auth/supabaseClient";

export type QuickChatMessage = {
  id: string;
  key: string;
  text: string;
  category?: string | null;
};

export type QuickChatEvent = {
  id: string;
  from_user_id: string;
  to_user_id: string | null;
  quick_chat_message_id: string;
  quiz_id: string | null;
  session_id: string | null;
  context: string | null;
  created_at: string;
};

type MessagesResponse = {
  messages: QuickChatMessage[];
};

type QuickChatSendBody = {
  to_user_id?: string;
  quick_chat_message_id?: string;
  quiz_id?: string | null;
  session_id?: string | null;
  context?: string | null;
};

export function useQuickChatMessages() {
  const { user } = useAuth();
  const accessToken = user?.accessToken;

  const query = useQuery<MessagesResponse, Error>({
    queryKey: ["quickChatMessages", user?.id],
    queryFn: async () => {
      if (!accessToken) {
        return { messages: [] };
      }
      return get<MessagesResponse>("/quick-chat/messages", accessToken);
    },
    enabled: Boolean(accessToken)
  });

  return {
    messages: query.data?.messages ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch
  };
}

type UseQuickChatSessionParams = {
  quizId?: string;
  sessionId?: string | null;
  enabled?: boolean;
};

export function useQuickChatSession({
  quizId,
  sessionId,
  enabled
}: UseQuickChatSessionParams) {
  const { user } = useAuth();
  const [events, setEvents] = useState<QuickChatEvent[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id) {
      return;
    }

    // Supabase Realtime filter limitation: usually supports single column filter.
    // We filter by to_user_id to ensure privacy/relevance.
    // Additional filtering for session_id is done client-side.
    const filter = `to_user_id=eq.${user.id}`;

    const channel = supabase
      .channel(
        sessionId
          ? `quick_chat_session_${sessionId}`
          : `quick_chat_user_${user.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quick_chat_events",
          filter
        },
        (payload) => {
          const row = payload.new as any;
          
          // Client-side filtering for session
          if (sessionId && row.session_id !== sessionId) {
            return;
          }

          const event: QuickChatEvent = {
            id: row.id as string,
            from_user_id: row.from_user_id as string,
            to_user_id: (row.to_user_id as string | null) ?? null,
            quick_chat_message_id: row.quick_chat_message_id as string,
            quiz_id: (row.quiz_id as string | null) ?? null,
            session_id: (row.session_id as string | null) ?? null,
            context: (row.context as string | null) ?? null,
            created_at: row.created_at as string
          };
          setEvents((prev) => [event, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, sessionId]);

  const sendQuickChat = useCallback(
    async (args: {
      quickChatMessageId: string;
      toUserId: string;
      context?: string | null;
    }) => {
      if (!user?.accessToken) {
        throw new Error("Not authenticated");
      }

      setIsSending(true);
      setSendError(null);

      try {
        const body: QuickChatSendBody = {
          to_user_id: args.toUserId,
          quick_chat_message_id: args.quickChatMessageId,
          quiz_id: quizId ?? null,
          session_id: sessionId ?? null,
          context: args.context ?? null
        };

        const response = await post<QuickChatEvent, QuickChatSendBody>(
          "/quick-chat/send",
          body,
          user.accessToken
        );

        setEvents((prev) => [response, ...prev].slice(0, 20));

        return response;
      } catch (e) {
        if (e instanceof Error) {
          setSendError(e.message);
        } else {
          setSendError("Failed to send quick chat message");
        }
        throw e;
      } finally {
        setIsSending(false);
      }
    },
    [user?.accessToken, quizId, sessionId]
  );

  const latestEvents = useMemo(
    () => events.slice(0, 10),
    [events]
  );

  return {
    events: latestEvents,
    isSending,
    sendError,
    sendQuickChat
  };
}
