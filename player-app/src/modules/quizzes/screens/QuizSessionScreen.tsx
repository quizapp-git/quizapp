import React, { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../../navigation/HomeStack";
import { AdService } from "../../ads/AdService";

type Props = NativeStackScreenProps<HomeStackParamList, "QuizSession">;

const maxQuestions = 10;

export function QuizSessionScreen({ navigation, route }: Props) {
  const { quizId } = route.params;
  const [questionIndex, setQuestionIndex] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleAnswer = async () => {
    if (isCompleted) {
      return;
    }

    await AdService.showQuizInterstitial(questionIndex);

    if (questionIndex >= maxQuestions) {
      setIsCompleted(true);
      return;
    }

    setQuestionIndex(questionIndex + 1);
  };

  const handleFinish = () => {
    navigation.replace("QuizResult", { sessionId: quizId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz Session</Text>
      <Text style={styles.body}>Quiz id: {quizId}</Text>
      <Text style={styles.body}>
        Question {questionIndex} of {maxQuestions}
      </Text>
      {!isCompleted ? (
        <Button title="Answer question" onPress={handleAnswer} />
      ) : (
        <Button title="Finish quiz" onPress={handleFinish} />
      )}
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
    fontSize: 16,
    marginBottom: 8
  }
});

