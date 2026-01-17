import React, { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { WalletStackParamList } from "../../../navigation/WalletStack";
import { useAuth } from "../../auth/hooks";
import { get } from "../../api/client";

type Props = NativeStackScreenProps<WalletStackParamList, "Wallet">;

export function WalletScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    coins_balance: number;
    coins_balance_pkr: number;
    pkr_per_coin: number;
  } | null>(null);

  useEffect(() => {
    if (!user?.accessToken) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await get<{
          coins_balance: number;
          coins_balance_pkr: number;
          pkr_per_coin: number;
        }>("/wallet", user.accessToken);
        if (isMounted) {
          setSummary(data);
        }
      } catch (e) {
        if (isMounted) {
          setError("Failed to load wallet");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [user?.accessToken]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      {!user?.accessToken && (
        <Text style={styles.message}>Sign in to view your wallet.</Text>
      )}
      {user?.accessToken && isLoading && (
        <Text style={styles.message}>Loading wallet...</Text>
      )}
      {user?.accessToken && error && (
        <Text style={styles.message}>{error}</Text>
      )}
      {user?.accessToken && summary && !isLoading && !error && (
        <View style={styles.summary}>
          <Text style={styles.text}>
            Coins: {summary.coins_balance.toLocaleString()}
          </Text>
          <Text style={styles.text}>
            PKR: {summary.coins_balance_pkr.toLocaleString()}
          </Text>
          <Text style={styles.text}>
            Rate: {summary.pkr_per_coin} PKR per coin
          </Text>
        </View>
      )}
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
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center"
  },
  message: {
    textAlign: "center",
    marginBottom: 16
  },
  summary: {
    marginBottom: 24
  },
  text: {
    fontSize: 16
  }
});
