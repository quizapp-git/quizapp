import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LeaderboardStackParamList } from "../../../navigation/LeaderboardStack";

type Props = NativeStackScreenProps<LeaderboardStackParamList, "PlayerStats">;

export function PlayerStatsScreen({ route }: Props) {
  const { entry } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Player stats</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{entry.username || "Player"}</Text>

        <Text style={styles.label}>Rank</Text>
        <Text style={styles.value}>#{entry.rank}</Text>

        <Text style={styles.label}>Quizzes played</Text>
        <Text style={styles.value}>
          {entry.total_quizzes_played.toLocaleString()}
        </Text>

        <Text style={styles.label}>Coins earned</Text>
        <Text style={styles.value}>
          {entry.lifetime_earned_coins.toLocaleString()}
        </Text>

        <Text style={styles.label}>Lifetime income (PKR)</Text>
        <Text style={styles.value}>
          {entry.lifetime_income_pkr.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16
  },
  card: {
    width: "100%",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff"
  },
  label: {
    fontSize: 14,
    color: "#555",
    marginTop: 8
  },
  value: {
    fontSize: 16,
    fontWeight: "500"
  }
});

