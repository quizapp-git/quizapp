import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LeaderboardScreen } from "../modules/leaderboard/screens/LeaderboardScreen";

export type LeaderboardStackParamList = {
  Leaderboard: undefined;
};

const Stack = createNativeStackNavigator<LeaderboardStackParamList>();

export function LeaderboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
    </Stack.Navigator>
  );
}

