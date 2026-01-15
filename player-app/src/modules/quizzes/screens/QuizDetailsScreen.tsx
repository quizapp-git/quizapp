import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../../navigation/HomeStack";

type Props = NativeStackScreenProps<HomeStackParamList, "QuizDetails">;

export function QuizDetailsScreen({ navigation, route }: Props) {
  const { quizId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz Details</Text>
      <Text style={styles.body}>Quiz id: {quizId}</Text>
      <Button
        title="Start quiz"
        onPress={() => navigation.navigate("QuizSession", { quizId })}
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

