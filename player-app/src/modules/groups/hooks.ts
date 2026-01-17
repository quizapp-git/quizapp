import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { useAuth } from "../auth/hooks";
import { get, post } from "../api/client";
import { supabase } from "../auth/supabaseClient";

export type GroupRole = "owner" | "admin" | "member";

export type Group = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  max_members: number;
  members_count: number;
  is_owner: boolean;
  is_admin: boolean;
  is_member: boolean;
};

export type GroupMember = {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  role: GroupRole;
  is_muted: boolean;
};

type GroupsResponse = {
  groups: Group[];
};

type GroupDetailResponse = {
  group: Group;
  members: GroupMember[];
  is_full: boolean;
  is_muted: boolean;
};

export type GroupInvitationDirection = "incoming" | "outgoing";

export type GroupInvitation = {
  id: string;
  group_id: string;
  group_name: string;
  created_at: string;
  status: string;
  direction: GroupInvitationDirection;
};

type GroupInvitationsResponse = {
  incoming: GroupInvitation[];
  outgoing: GroupInvitation[];
};

export type GroupChatMessageType = "quick" | "emoticon" | "text";

export type GroupChatMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  sender_name: string | null;
  type: GroupChatMessageType;
  content: string;
  created_at: string;
  is_filtered?: boolean;
};

type GroupChatMessagesResponse = {
  messages: GroupChatMessage[];
};

type CreateGroupBody = {
  name: string;
  description: string | null;
  is_public: boolean;
  max_members: number;
};

type GroupChatSendBody = {
  group_id: string;
  type: GroupChatMessageType;
  content?: string;
  quick_chat_message_id?: string;
};

export function useGroups() {
  const { user } = useAuth();
  const accessToken = user?.accessToken;

  const query = useQuery<GroupsResponse, Error>({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      if (!accessToken) {
        return { groups: [] };
      }
      return get<GroupsResponse>("/groups", accessToken);
    },
    enabled: Boolean(accessToken)
  });

  const groups = useMemo(() => query.data?.groups ?? [], [query.data]);

  return {
    groups,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch
  };
}

export function useCreateGroup() {
  const { user } = useAuth();
  const accessToken = user?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateGroupBody) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<Group, CreateGroupBody>("/groups", body, accessToken);
    },
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
      if (context && typeof context === "object") {
        const ctx = context as { invalidateGroup?: string };
        if (ctx.invalidateGroup) {
          queryClient.invalidateQueries({
            queryKey: ["group", user?.id, ctx.invalidateGroup]
          });
        }
      }
    }
  });
}

export function useGroup(groupId: string) {
  const { user } = useAuth();
  const accessToken = user?.accessToken;
  const queryClient = useQueryClient();

  const query = useQuery<GroupDetailResponse, Error>({
    queryKey: ["group", user?.id, groupId],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return get<GroupDetailResponse>(`/groups/${groupId}`, accessToken);
    },
    enabled: Boolean(accessToken && groupId)
  });

  const invalidateGroupQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["group", user?.id, groupId] });
    queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
  };

  const leaveGroup = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/groups/${groupId}/leave`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      invalidateGroupQueries();
    }
  });

  const inviteFriend = useMutation({
    mutationFn: async (userId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const body = { user_id: userId };
      return post<{ success: true }, typeof body>(
        `/groups/${groupId}/invite`,
        body,
        accessToken
      );
    },
    onSuccess: () => {
      invalidateGroupQueries();
    }
  });

  const kickMember = useMutation({
    mutationFn: async (memberId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/groups/${groupId}/members/${memberId}/kick`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      invalidateGroupQueries();
    }
  });

  const muteMember = useMutation({
    mutationFn: async (memberId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/groups/${groupId}/members/${memberId}/mute`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      invalidateGroupQueries();
    }
  });

  const unmuteMember = useMutation({
    mutationFn: async (memberId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/groups/${groupId}/members/${memberId}/unmute`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      invalidateGroupQueries();
    }
  });

  const makeAdmin = useMutation({
    mutationFn: async (memberId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/groups/${groupId}/members/${memberId}/make-admin`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      invalidateGroupQueries();
    }
  });

  return {
    group: query.data?.group ?? null,
    members: query.data?.members ?? [],
    isGroupFull: query.data?.is_full ?? false,
    isMuted: query.data?.is_muted ?? false,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    leaveGroup,
    inviteFriend,
    kickMember,
    muteMember,
    unmuteMember,
    makeAdmin
  };
}

export function useGroupInvitations() {
  const { user } = useAuth();
  const accessToken = user?.accessToken;
  const queryClient = useQueryClient();

  const query = useQuery<GroupInvitationsResponse, Error>({
    queryKey: ["groupInvitations", user?.id],
    queryFn: async () => {
      if (!accessToken) {
        return { incoming: [], outgoing: [] };
      }
      return get<GroupInvitationsResponse>("/groups/invitations", accessToken);
    },
    enabled: Boolean(accessToken)
  });

  const acceptInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/groups/invitations/${invitationId}/accept`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["groupInvitations", user?.id]
      });
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
    }
  });

  const rejectInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/groups/invitations/${invitationId}/reject`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["groupInvitations", user?.id]
      });
    }
  });

  return {
    incoming: query.data?.incoming ?? [],
    outgoing: query.data?.outgoing ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    acceptInvitation,
    rejectInvitation
  };
}

export function useGroupChat(groupId: string | null | undefined) {
  const { user } = useAuth();
  const accessToken = user?.accessToken;
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const lastSentRef = useRef<number | null>(null);

  useEffect(() => {
    if (!accessToken || !groupId) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setHistoryError(null);

    get<GroupChatMessagesResponse>(
      `/group-chat/messages?group_id=${groupId}`,
      accessToken
    )
      .then((response) => {
        if (!isCancelled) {
          setMessages(response.messages ?? []);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          if (error instanceof Error) {
            setHistoryError(error.message);
          } else {
            setHistoryError("Failed to load messages");
          }
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [accessToken, groupId]);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    const channel = supabase
      .channel(`group_chat:${groupId}`)
      .on(
        "broadcast",
        { event: "new_message" },
        (payload: { payload: unknown }) => {
          const message = payload.payload as GroupChatMessage;
          setMessages((prev) => [...prev, message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const checkThrottle = () => {
    const now = Date.now();
    if (lastSentRef.current && now - lastSentRef.current < 1000) {
      const message = "You are sending messages too fast.";
      setSendError(message);
      throw new Error(message);
    }
    lastSentRef.current = now;
  };

  const sendQuickMessage = useCallback(
    async (quickChatMessageId: string) => {
      if (!accessToken || !groupId) {
        throw new Error("Not authenticated");
      }

      checkThrottle();
      setIsSending(true);
      setSendError(null);

      try {
        const body: GroupChatSendBody = {
          group_id: groupId,
          type: "quick",
          quick_chat_message_id: quickChatMessageId
        };

        const response = await post<GroupChatMessage, GroupChatSendBody>(
          "/group-chat/send",
          body,
          accessToken
        );

        setMessages((prev) => [...prev, response]);
        return response;
      } catch (error) {
        if (error instanceof Error) {
          setSendError(error.message);
        } else {
          setSendError("Failed to send message");
        }
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [accessToken, groupId]
  );

  const sendEmoticon = useCallback(
    async (quickChatMessageId: string) => {
      if (!accessToken || !groupId) {
        throw new Error("Not authenticated");
      }

      checkThrottle();
      setIsSending(true);
      setSendError(null);

      try {
        const body: GroupChatSendBody = {
          group_id: groupId,
          type: "emoticon",
          quick_chat_message_id: quickChatMessageId
        };

        const response = await post<GroupChatMessage, GroupChatSendBody>(
          "/group-chat/send",
          body,
          accessToken
        );

        setMessages((prev) => [...prev, response]);
        return response;
      } catch (error) {
        if (error instanceof Error) {
          setSendError(error.message);
        } else {
          setSendError("Failed to send message");
        }
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [accessToken, groupId]
  );

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!accessToken || !groupId) {
        throw new Error("Not authenticated");
      }

      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      checkThrottle();
      setIsSending(true);
      setSendError(null);

      try {
        const body: GroupChatSendBody = {
          group_id: groupId,
          type: "text",
          content: trimmed
        };

        const response = await post<GroupChatMessage, GroupChatSendBody>(
          "/group-chat/send",
          body,
          accessToken
        );

        setMessages((prev) => [...prev, response]);
        return response;
      } catch (error) {
        if (error instanceof Error) {
          setSendError(error.message);
        } else {
          setSendError("Failed to send message");
        }
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [accessToken, groupId]
  );

  return {
    messages,
    isLoading,
    historyError,
    isSending,
    sendError,
    sendQuickMessage,
    sendEmoticon,
    sendTextMessage
  };
}

