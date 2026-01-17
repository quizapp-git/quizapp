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
import { useFriends, type FriendItem } from "../../friends/hooks";
import { useGroup } from "../hooks";

type Props = NativeStackScreenProps<
  FriendsStackParamList,
  "GroupInviteFriends"
>;

export function GroupInviteFriendsScreen({ route }: Props) {
  const { groupId } = route.params;
  const { friends, isLoadingFriends, friendsError } = useFriends();
  const { inviteFriend } = useGroup(groupId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite friends to group</Text>
      {isLoadingFriends && <ActivityIndicator />}
      {friendsError && <Text style={styles.message}>{friendsError}</Text>}
      {!isLoadingFriends && !friendsError && friends.length === 0 && (
        <Text style={styles.message}>You have no friends to invite.</Text>
      )}
      {!isLoadingFriends && !friendsError && friends.length > 0 && (
        <FlatList<FriendItem>
          data={friends}
          keyExtractor={(item: FriendItem) => item.user_id}
          renderItem={({ item }: { item: FriendItem }) => (
            <View style={styles.friendItem}>
              <Text style={styles.friendName}>
                {item.username || "Friend"}
              </Text>
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => inviteFriend.mutate(item.user_id)}
                disabled={inviteFriend.isPending}
              >
                <Text style={styles.inviteButtonText}>
                  {inviteFriend.isPending ? "Inviting..." : "Invite"}
                </Text>
              </TouchableOpacity>
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
  friendItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  friendName: {
    fontSize: 16
  },
  inviteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: "#007bff"
  },
  inviteButtonText: {
    color: "#ffffff",
    fontSize: 14
  }
});
