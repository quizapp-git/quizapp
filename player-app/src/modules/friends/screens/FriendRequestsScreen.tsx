import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FriendsStackParamList } from "../../../navigation/FriendsStack";
import {
  useFriends,
  useFriendActions,
  type FriendRequestItem
} from "../hooks";

type Props = NativeStackScreenProps<FriendsStackParamList, "FriendRequests">;

type FriendRequestListItem = FriendRequestItem & {
  listType: "incoming" | "outgoing";
};

export function FriendRequestsScreen(_: Props) {
  const {
    incomingRequests,
    outgoingRequests,
    isLoadingRequests,
    requestsError,
    refetchRequests
  } = useFriends();

  const { acceptFriendRequest, rejectFriendRequest } = useFriendActions();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friend Requests</Text>
      {isLoadingRequests && <ActivityIndicator />}
      {requestsError && <Text style={styles.message}>{requestsError}</Text>}
      {!isLoadingRequests &&
        !requestsError &&
        incomingRequests.length === 0 &&
        outgoingRequests.length === 0 && (
          <Text style={styles.message}>No pending friend requests.</Text>
        )}
      {!isLoadingRequests && !requestsError && (
        <FlatList<FriendRequestListItem>
          data={[
            ...incomingRequests.map((item) => ({
              ...item,
              listType: "incoming" as const
            })),
            ...outgoingRequests.map((item) => ({
              ...item,
              listType: "outgoing" as const
            }))
          ]}
          keyExtractor={(item: FriendRequestListItem) => item.id}
          refreshing={isLoadingRequests}
          onRefresh={refetchRequests}
          renderItem={({ item }: { item: FriendRequestListItem }) => (
            <View style={styles.requestItem}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestDirection}>
                  {item.listType === "incoming" ? "Incoming" : "Outgoing"}
                </Text>
                <Text style={styles.requestName}>
                  {item.other_user.username || "Player"}
                </Text>
              </View>
              {item.listType === "incoming" && (
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    disabled={acceptFriendRequest.isPending}
                    onPress={() => acceptFriendRequest.mutate(item.id)}
                  >
                    <Text style={styles.actionButtonText}>
                      {acceptFriendRequest.isPending ? "Accepting..." : "Accept"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    disabled={rejectFriendRequest.isPending}
                    onPress={() => rejectFriendRequest.mutate(item.id)}
                  >
                    <Text style={styles.actionButtonText}>
                      {rejectFriendRequest.isPending ? "Rejecting..." : "Reject"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {item.listType === "outgoing" && (
                <Text style={styles.statusText}>Waiting for response</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  requestItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc"
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  requestDirection: {
    fontSize: 12,
    color: "#555555"
  },
  requestName: {
    fontSize: 16
  },
  requestActions: {
    flexDirection: "row"
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: "#007bff",
    marginRight: 8
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 14
  },
  statusText: {
    fontSize: 14,
    color: "#555555"
  }
});
