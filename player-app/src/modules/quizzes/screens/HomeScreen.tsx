import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../../navigation/HomeStack";
import { useAuth } from "../../auth/hooks";
import { get } from "../../api/client";
import { useLeaderboard } from "../../leaderboard/hooks";

type QuizListItem = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  total_questions: number;
  reward_coins: number;
  reward_type: "per_quiz" | "per_question";
};

type QuizzesResponse = {
  items: QuizListItem[];
};

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    entries: topWeeklyEntries,
    currentUserRank: weeklyRank,
    isLoading: isLoadingLeaderboard,
    error: leaderboardError
  } = useLeaderboard({ period: "weekly", limit: 3 });

  useEffect(() => {
    if (!user?.accessToken) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await get<QuizzesResponse>("/quizzes", user.accessToken);
        if (isMounted) {
          setQuizzes(data.items);
        }
      } catch (e) {
        if (isMounted) {
          setError("Failed to load quizzes");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [user?.accessToken]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quizzes</Text>
      {!user?.accessToken && (
        <Text style={styles.message}>Sign in to see available quizzes.</Text>
      )}
      {user?.accessToken && (
        <View style={styles.leaderboardBanner}>
          <Text style={styles.leaderboardTitle}>Top players this week</Text>
          {isLoadingLeaderboard && <ActivityIndicator size="small" />}
          {!isLoadingLeaderboard && leaderboardError && (
            <Text style={styles.leaderboardText}>
              Could not load weekly rankings.
            </Text>
          )}
          {!isLoadingLeaderboard &&
            !leaderboardError &&
            topWeeklyEntries.length === 0 && (
              <Text style={styles.leaderboardText}>
                No rankings yet for this week.
              </Text>
            )}
          {!isLoadingLeaderboard &&
            !leaderboardError &&
            topWeeklyEntries.length > 0 &&
            topWeeklyEntries.map((entry, index) => (
              <Text key={entry.user_id} style={styles.leaderboardText}>
                {index + 1}. {entry.username || "Player"} —{" "}
                {entry.lifetime_earned_coins.toLocaleString()} coins
              </Text>
            ))}
          {typeof weeklyRank === "number" && (
            <Text style={styles.leaderboardText}>
              Your rank: #{weeklyRank} this week
            </Text>
          )}
        </View>
      )}
      {user?.accessToken && isLoading && <ActivityIndicator />}
      {user?.accessToken && error && (
        <Text style={styles.message}>{error}</Text>
      )}
      {user?.accessToken && !isLoading && !error && (
        <FlatList<QuizListItem>
          data={quizzes}
          keyExtractor={(item: QuizListItem) => item.id}
          renderItem={({ item }: { item: QuizListItem }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() =>
                navigation.navigate("QuizDetails", { quizId: item.id })
              }
            >
              <Text style={styles.itemTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.itemText}>{item.description}</Text>
              ) : null}
              <Text style={styles.itemText}>
                Difficulty: {item.difficulty} • Questions:{" "}
                {item.total_questions}
              </Text>
              <Text style={styles.itemText}>
                Reward: {item.reward_coins} coins {item.reward_type}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  message: {
    textAlign: "center",
    marginBottom: 16
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
    padding: 16
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: "center"
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "500"
  },
  itemText: {
    fontSize: 14,
    marginBottom: 8
  },
  leaderboardBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9ff",
    marginBottom: 16
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8
  },
  leaderboardText: {
    fontSize: 14,
    marginBottom: 4
  }
});
