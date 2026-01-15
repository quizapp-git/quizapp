import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function PayoutRequestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request Payout</Text>
      <Text>Form for requesting withdrawals will be implemented here.</Text>
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
    marginBottom: 8
  }
});

