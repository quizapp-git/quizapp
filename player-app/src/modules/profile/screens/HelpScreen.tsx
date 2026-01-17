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
        <Text style={styles.sectionTitle}>Communication and chat stages</Text>
        <Text style={styles.body}>
          Communication features unlock in stages. New players start with quick
          chat only using predefined messages. After enough ads are viewed and
          quizzes are played, custom text chat unlocks. With more engagement and
          good behavior, voice chat unlocks for selected areas of the app.
        </Text>
        <Text style={styles.body}>
          This staging helps keep communication safe, reduces abuse, and rewards
          players who engage fairly with the app. Ad views that unlock
          communication features also power coins, payouts, and revenue sharing.
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
