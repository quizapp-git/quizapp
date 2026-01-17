import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/hooks";
import { get } from "../api/client";

export type LeaderboardPeriod = "all_time" | "weekly" | "monthly";

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  username: string | null;
  lifetime_income_pkr: number;
  lifetime_earned_coins: number;
  total_quizzes_played: number;
};

export type LeaderboardResponse = {
  period: LeaderboardPeriod;
  limit: number;
  entries: LeaderboardEntry[];
  current_user_rank: number | null;
};

type UseLeaderboardArgs = {
  period: LeaderboardPeriod;
  limit?: number;
};

export function useLeaderboard({ period, limit = 50 }: UseLeaderboardArgs) {
  const { user } = useAuth();
  const accessToken = user?.accessToken;

  const query = useQuery<LeaderboardResponse, Error>({
    queryKey: ["leaderboard", user?.id, period, limit],
    queryFn: async () => {
      if (!accessToken) {
        return {
          period,
          limit,
          entries: [],
          current_user_rank: null
        };
      }
      const params = new URLSearchParams();
      params.set("period", period);
      params.set("limit", String(limit));
      return get<LeaderboardResponse>(
        `/leaderboard?${params.toString()}`,
        accessToken
      );
    },
    enabled: Boolean(accessToken)
  });

  const entries = useMemo(
    () => query.data?.entries ?? [],
    [query.data?.entries]
  );

  return {
    period: query.data?.period ?? period,
    limit: query.data?.limit ?? limit,
    entries,
    currentUserRank: query.data?.current_user_rank ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error?.message ?? null,
    refetch: query.refetch
  };
}

