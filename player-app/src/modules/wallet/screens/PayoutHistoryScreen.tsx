import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useAuth } from "../../auth/hooks";
import { get } from "../../api/client";

type PayoutRequest = {
  id: string;
  coins_requested: number;
  pkr_amount: number;
  status: string;
  method: string;
  requested_at: string;
};

type PayoutRequestsResponse = {
  items: PayoutRequest[];
};

export function PayoutHistoryScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PayoutRequest[]>([]);

  useEffect(() => {
    if (!user?.accessToken) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await get<PayoutRequestsResponse>(
          "/payout/requests",
          user.accessToken
        );
        if (!isMounted) {
          return;
        }
        setItems(data.items);
      } catch (e) {
        if (isMounted) {
          setError("Failed to load payout history");
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

  const renderItem = ({ item }: { item: PayoutRequest }) => {
    const date = new Date(item.requested_at);
    const formattedDate = Number.isNaN(date.getTime())
      ? item.requested_at
      : date.toLocaleString();

    return (
      <View style={styles.item}>
        <Text style={styles.itemText}>
          {item.pkr_amount} PKR ({item.coins_requested} coins)
        </Text>
        <Text style={styles.itemText}>
          Status: {item.status} • Method: {item.method}
        </Text>
        <Text style={styles.itemDate}>{formattedDate}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payout History</Text>
      {!user?.accessToken && (
        <Text style={styles.message}>Sign in to view your payout history.</Text>
      )}
      {user?.accessToken && isLoading && <ActivityIndicator />}
      {user?.accessToken && error && (
        <Text style={styles.message}>{error}</Text>
      )}
      {user?.accessToken && !isLoading && !error && items.length === 0 && (
        <Text style={styles.message}>No payout requests yet.</Text>
      )}
      {user?.accessToken && !isLoading && !error && items.length > 0 && (
        <FlatList<PayoutRequest>
          data={items}
          keyExtractor={(item: PayoutRequest) => item.id}
          renderItem={renderItem}
        />
      )}
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
    marginBottom: 8
  },
  message: {
    textAlign: "center",
    marginTop: 8
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc"
  },
  itemText: {
    fontSize: 16
  },
  itemDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 4
  }
});
