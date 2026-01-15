import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export function HelpScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View>
        <Text style={styles.title}>Help</Text>
        <Text style={styles.sectionTitle}>Quizzes</Text>
        <Text style={styles.body}>
          Quizzes contain up to ten questions per session.
        </Text>
        <Text style={styles.sectionTitle}>Ads and revenue sharing</Text>
        <Text style={styles.body}>
          One ad is shown after every question, up to ten ads per session.
        </Text>
        <Text style={styles.sectionTitle}>Coins and withdrawals</Text>
        <Text style={styles.body}>
          Coins can be converted to PKR and withdrawn when thresholds are met.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 12,
    marginBottom: 4
  },
  body: {
    fontSize: 14,
    lineHeight: 20
  }
});

