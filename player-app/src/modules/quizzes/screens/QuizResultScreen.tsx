import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../../navigation/HomeStack";

type Props = NativeStackScreenProps<HomeStackParamList, "QuizResult">;

export function QuizResultScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz Result</Text>
      <Text style={styles.body}>Session id: {sessionId}</Text>
      <Button
        title="Back to quizzes"
        onPress={() => navigation.popToTop()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12
  },
  body: {
    fontSize: 16
  }
});

