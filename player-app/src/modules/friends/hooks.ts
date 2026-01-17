import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { useAuth } from "../auth/hooks";
import { get, post } from "../api/client";

export type FriendItem = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  is_blocked: boolean;
  since: string;
};

export type FriendRequestUser = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export type FriendRequestItem = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  direction: "incoming" | "outgoing";
  other_user: FriendRequestUser;
};

type FriendsResponse = {
  friends: FriendItem[];
};

type FriendRequestsResponse = {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
};

type FriendRequestBody = {
  to_user_id?: string;
  username?: string;
  email?: string;
};

export function useFriends() {
  const { user } = useAuth();
  const accessToken = user?.accessToken;

  const friendsQuery = useQuery<FriendsResponse, Error>({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      if (!accessToken) {
        return { friends: [] };
      }
      return get<FriendsResponse>("/friends", accessToken);
    },
    enabled: Boolean(accessToken)
  });

  const requestsQuery = useQuery<FriendRequestsResponse, Error>({
    queryKey: ["friendRequests", user?.id],
    queryFn: async () => {
      if (!accessToken) {
        return { incoming: [], outgoing: [] };
      }
      return get<FriendRequestsResponse>("/friends/requests", accessToken);
    },
    enabled: Boolean(accessToken)
  });

  const friends = useMemo(
    () => friendsQuery.data?.friends ?? [],
    [friendsQuery.data]
  );

  const incomingRequests = useMemo(
    () => requestsQuery.data?.incoming ?? [],
    [requestsQuery.data]
  );

  const outgoingRequests = useMemo(
    () => requestsQuery.data?.outgoing ?? [],
    [requestsQuery.data]
  );

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    isLoadingFriends: friendsQuery.isLoading,
    friendsError: friendsQuery.error?.message ?? null,
    isLoadingRequests: requestsQuery.isLoading,
    requestsError: requestsQuery.error?.message ?? null,
    refetchFriends: friendsQuery.refetch,
    refetchRequests: requestsQuery.refetch
  };
}

export function useFriendActions() {
  const { user } = useAuth();
  const accessToken = user?.accessToken;
  const queryClient = useQueryClient();

  const sendFriendRequest = useMutation({
    mutationFn: async (body: FriendRequestBody) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<
        {
          id: string;
          from_user_id: string;
          to_user_id: string;
          status: string;
          created_at: string;
        },
        FriendRequestBody
      >("/friends/request", body, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests", user?.id] });
    }
  });

  const acceptFriendRequest = useMutation({
    mutationFn: async (id: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/friends/request/${id}/accept`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["friends", user?.id] });
    }
  });

  const rejectFriendRequest = useMutation({
    mutationFn: async (id: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/friends/request/${id}/reject`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests", user?.id] });
    }
  });

  const removeFriend = useMutation({
    mutationFn: async (friendUserId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/friends/${friendUserId}/remove`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests", user?.id] });
    }
  });

  const blockUser = useMutation({
    mutationFn: async (friendUserId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return post<{ success: true }, {}>(
        `/friends/${friendUserId}/block`,
        {},
        accessToken
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests", user?.id] });
    }
  });

  return {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    blockUser
  };
}

