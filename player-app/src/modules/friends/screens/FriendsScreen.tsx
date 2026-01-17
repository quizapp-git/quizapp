import React from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FriendsStackParamList } from "../../../navigation/FriendsStack";
import { useFriends, useFriendActions, type FriendItem } from "../hooks";

type Props = NativeStackScreenProps<FriendsStackParamList, "Friends">;

export function FriendsScreen({ navigation }: Props) {
  const {
    friends,
    isLoadingFriends,
    friendsError,
    refetchFriends
  } = useFriends();

  const { removeFriend, blockUser } = useFriendActions();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friends</Text>
      <View style={styles.actionsRow}>
        <Button
          title="Add friend"
          onPress={() => navigation.navigate("AddFriend")}
        />
        <Button
          title="Requests"
          onPress={() => navigation.navigate("FriendRequests")}
        />
        <Button
          title="Groups"
          onPress={() => navigation.navigate("Groups")}
        />
      </View>
      {isLoadingFriends && <ActivityIndicator />}
      {friendsError && <Text style={styles.message}>{friendsError}</Text>}
      {!isLoadingFriends && !friendsError && friends.length === 0 && (
        <Text style={styles.message}>You have no friends yet.</Text>
      )}
      {!isLoadingFriends && !friendsError && friends.length > 0 && (
        <FlatList<FriendItem>
          data={friends}
          keyExtractor={(item: FriendItem) => item.user_id}
          refreshing={isLoadingFriends}
          onRefresh={refetchFriends}
          renderItem={({ item }: { item: FriendItem }) => (
            <View style={styles.friendItem}>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>
                  {item.username || "Friend"}
                </Text>
                {item.is_blocked && (
                  <Text style={styles.blockedLabel}>Blocked</Text>
                )}
              </View>
              <View style={styles.friendActions}>
                <TouchableOpacity
                  style={styles.friendButton}
                  onPress={() => removeFriend.mutate(item.user_id)}
                  disabled={removeFriend.isPending}
                >
                  <Text style={styles.friendButtonText}>
                    {removeFriend.isPending ? "Removing..." : "Remove"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.friendButton}
                  onPress={() => blockUser.mutate(item.user_id)}
                  disabled={blockUser.isPending}
                >
                  <Text style={styles.friendButtonText}>
                    {blockUser.isPending ? "Blocking..." : "Block"}
                  </Text>
                </TouchableOpacity>
              </View>
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
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },
  message: {
    textAlign: "center",
    marginBottom: 16
  },
  friendItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc"
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  friendName: {
    fontSize: 16
  },
  blockedLabel: {
    fontSize: 12,
    color: "#cc0000"
  },
  friendActions: {
    flexDirection: "row"
  },
  friendButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: "#007bff",
    marginRight: 8
  },
  friendButtonText: {
    color: "#ffffff",
    fontSize: 14
  }
});
