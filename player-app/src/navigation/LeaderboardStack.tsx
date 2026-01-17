import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LeaderboardScreen } from "../modules/leaderboard/screens/LeaderboardScreen";
import { PlayerStatsScreen } from "../modules/leaderboard/screens/PlayerStatsScreen";
import type { LeaderboardEntry } from "../modules/leaderboard/hooks";

export type LeaderboardStackParamList = {
  Leaderboard: undefined;
  PlayerStats: {
    entry: LeaderboardEntry;
  };
};

const Stack = createNativeStackNavigator<LeaderboardStackParamList>();

export function LeaderboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen
        name="PlayerStats"
        component={PlayerStatsScreen}
        options={{ title: "Player stats" }}
      />
    </Stack.Navigator>
  );
}
