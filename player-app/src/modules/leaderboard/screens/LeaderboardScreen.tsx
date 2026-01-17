import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LeaderboardStackParamList } from "../../../navigation/LeaderboardStack";
import { useAuth } from "../../auth/hooks";
import {
  type LeaderboardEntry,
  type LeaderboardPeriod,
  useLeaderboard
} from "../hooks";

type Props = NativeStackScreenProps<LeaderboardStackParamList, "Leaderboard">;

type PeriodOption = {
  label: string;
  value: LeaderboardPeriod;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "All-time", value: "all_time" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" }
];

export function LeaderboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>("all_time");

  const {
    entries,
    currentUserRank,
    isLoading,
    isRefetching,
    error,
    refetch
  } = useLeaderboard({ period, limit: 50 });

  const currentUserId = user?.id ?? null;

  const handleSelectPeriod = useCallback((next: LeaderboardPeriod) => {
    setPeriod(next);
  }, []);

  const handlePressEntry = useCallback(
    (entry: LeaderboardEntry) => {
      navigation.navigate("PlayerStats", { entry });
    },
    [navigation]
  );

  const currentUserEntry = useMemo(
    () => entries.find((entry) => entry.user_id === currentUserId) ?? null,
    [entries, currentUserId]
  );

  const showYourPositionCard =
    Boolean(currentUserRank) && !currentUserEntry && Boolean(currentUserId);

  if (!user?.accessToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.message}>Sign in to view the leaderboard.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>

      <View style={styles.periodTabs}>
        {PERIOD_OPTIONS.map((option) => {
          const isActive = option.value === period;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.periodTab,
                isActive && styles.periodTabActive
              ]}
              onPress={() => handleSelectPeriod(option.value)}
            >
              <Text
                style={[
                  styles.periodTabText,
                  isActive && styles.periodTabTextActive
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
          <Text style={styles.message}>Loading rankings...</Text>
        </View>
      )}

      {!isLoading && error && (
        <View style={styles.loadingContainer}>
          <Text style={styles.message}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !error && (
        <>
          {entries.length === 0 && (
            <View style={styles.loadingContainer}>
              <Text style={styles.message}>
                No rankings yet for this period.
              </Text>
            </View>
          )}

          {entries.length > 0 && (
            <FlatList<LeaderboardEntry>
              data={entries}
              keyExtractor={(item: LeaderboardEntry) => item.user_id}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
              }
              renderItem={({ item }: { item: LeaderboardEntry }) => {
                const isTopThree = item.rank <= 3;
                const isCurrentUser = item.user_id === currentUserId;

                return (
                  <TouchableOpacity
                    style={[
                      styles.row,
                      isTopThree && styles.rowTopThree,
                      isCurrentUser && styles.rowCurrentUser
                    ]}
                    onPress={() => handlePressEntry(item)}
                  >
                    <View style={styles.rankColumn}>
                      <Text style={styles.rankText}>#{item.rank}</Text>
                    </View>
                    <View style={styles.mainColumn}>
                      <Text style={styles.usernameText}>
                        {item.username || "Player"}
                      </Text>
                      <Text style={styles.subText}>
                        Quizzes: {item.total_quizzes_played.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.coinsColumn}>
                      <Text style={styles.coinsText}>
                        {item.lifetime_earned_coins.toLocaleString()} coins
                      </Text>
                      <Text style={styles.subText}>
                        PKR {item.lifetime_income_pkr.toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {showYourPositionCard && (
            <View style={styles.positionCard}>
              <Text style={styles.positionTitle}>Your position</Text>
              <Text style={styles.positionBody}>
                You are currently ranked #{currentUserRank} for this period.
              </Text>
              <Text style={styles.positionBody}>
                Play more quizzes and earn coins to climb the leaderboard.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center"
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  periodTabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 16,
    marginHorizontal: 4,
    alignItems: "center"
  },
  periodTabActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF"
  },
  periodTabText: {
    fontSize: 14,
    color: "#333"
  },
  periodTabTextActive: {
    color: "#fff",
    fontWeight: "600"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd"
  },
  rowTopThree: {
    backgroundColor: "#fff9e6"
  },
  rowCurrentUser: {
    borderWidth: 1,
    borderColor: "#007AFF"
  },
  rankColumn: {
    width: 56,
    alignItems: "flex-start"
  },
  rankText: {
    fontSize: 16,
    fontWeight: "600"
  },
  mainColumn: {
    flex: 1
  },
  coinsColumn: {
    alignItems: "flex-end"
  },
  usernameText: {
    fontSize: 16,
    fontWeight: "500"
  },
  coinsText: {
    fontSize: 14,
    fontWeight: "500"
  },
  subText: {
    fontSize: 12,
    color: "#555"
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF"
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14
  },
  positionCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9"
  },
  positionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4
  },
  positionBody: {
    fontSize: 14,
    marginBottom: 2
  }
});
