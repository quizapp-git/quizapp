import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { WalletStackParamList } from "../../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "Wallet">;

export function WalletScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      <Text>Coins, PKR equivalent, and payouts will be shown here.</Text>
      <Button
        title="Request payout"
        onPress={() => navigation.navigate("PayoutRequest")}
      />
      <Button
        title="View payout history"
        onPress={() => navigation.navigate("PayoutHistory")}
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
    marginBottom: 8
  }
});
