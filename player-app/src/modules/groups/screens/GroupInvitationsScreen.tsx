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
import { useGroupInvitations, type GroupInvitation } from "../hooks";

type Props = NativeStackScreenProps<FriendsStackParamList, "GroupInvitations">;

export function GroupInvitationsScreen({}: Props) {
  const {
    incoming,
    outgoing,
    isLoading,
    error,
    acceptInvitation,
    rejectInvitation
  } = useGroupInvitations();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Group invitations</Text>
      {isLoading && <ActivityIndicator />}
      {error && <Text style={styles.message}>{error}</Text>}
      {!isLoading && !error && incoming.length === 0 && outgoing.length === 0 && (
        <Text style={styles.message}>You have no group invitations.</Text>
      )}
      {!isLoading && !error && incoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incoming</Text>
          <FlatList<GroupInvitation>
            data={incoming}
            keyExtractor={(item: GroupInvitation) => item.id}
            renderItem={({ item }: { item: GroupInvitation }) => (
              <View style={styles.inviteItem}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteGroup}>{item.group_name}</Text>
                  <Text style={styles.inviteStatus}>{item.status}</Text>
                </View>
                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => acceptInvitation.mutate(item.id)}
                    disabled={acceptInvitation.isPending}
                  >
                    <Text style={styles.primaryButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => rejectInvitation.mutate(item.id)}
                    disabled={rejectInvitation.isPending}
                  >
                    <Text style={styles.secondaryButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}
      {!isLoading && !error && outgoing.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outgoing</Text>
          <FlatList<GroupInvitation>
            data={outgoing}
            keyExtractor={(item: GroupInvitation) => item.id}
            renderItem={({ item }: { item: GroupInvitation }) => (
              <View style={styles.inviteItem}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteGroup}>{item.group_name}</Text>
                  <Text style={styles.inviteStatus}>{item.status}</Text>
                </View>
                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => rejectInvitation.mutate(item.id)}
                    disabled={rejectInvitation.isPending}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
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
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 8
  },
  inviteItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc"
  },
  inviteInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  inviteGroup: {
    fontSize: 16
  },
  inviteStatus: {
    fontSize: 12,
    color: "#777"
  },
  inviteActions: {
    flexDirection: "row"
  },
  primaryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: "#007bff",
    marginRight: 8
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14
  },
  secondaryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#007bff"
  },
  secondaryButtonText: {
    color: "#007bff",
    fontSize: 14
  }
});
