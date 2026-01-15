import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../modules/quizzes/screens/HomeScreen";
import { QuizDetailsScreen } from "../modules/quizzes/screens/QuizDetailsScreen";
import { QuizSessionScreen } from "../modules/quizzes/screens/QuizSessionScreen";
import { QuizResultScreen } from "../modules/quizzes/screens/QuizResultScreen";

export type HomeStackParamList = {
  Home: undefined;
  QuizDetails: {
    quizId: string;
  };
  QuizSession: {
    quizId: string;
  };
  QuizResult: {
    sessionId: string;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="QuizDetails" component={QuizDetailsScreen} />
      <Stack.Screen name="QuizSession" component={QuizSessionScreen} />
      <Stack.Screen name="QuizResult" component={QuizResultScreen} />
    </Stack.Navigator>
  );
}
