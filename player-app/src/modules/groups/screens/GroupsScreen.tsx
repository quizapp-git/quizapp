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
import { useGroups, type Group } from "../hooks";

type Props = NativeStackScreenProps<FriendsStackParamList, "Groups">;

export function GroupsScreen({ navigation }: Props) {
  const { groups, isLoading, error, refetch } = useGroups();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Groups</Text>
      <View style={styles.actionsRow}>
        <Button
          title="Create group"
          onPress={() => navigation.navigate("CreateGroup")}
        />
        <Button
          title="Invitations"
          onPress={() => navigation.navigate("GroupInvitations")}
        />
      </View>
      {isLoading && <ActivityIndicator />}
      {error && <Text style={styles.message}>{error}</Text>}
      {!isLoading && !error && groups.length === 0 && (
        <Text style={styles.message}>You have no groups yet.</Text>
      )}
      {!isLoading && !error && groups.length > 0 && (
        <FlatList<Group>
          data={groups}
          keyExtractor={(item: Group) => item.id}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }: { item: Group }) => {
            const role = item.is_owner
              ? "Owner"
              : item.is_admin
              ? "Admin"
              : item.is_member
              ? "Member"
              : "";
            return (
              <TouchableOpacity
                style={styles.groupItem}
                onPress={() =>
                  navigation.navigate("GroupDetail", { groupId: item.id })
                }
              >
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  {role ? <Text style={styles.groupRole}>{role}</Text> : null}
                </View>
                <Text style={styles.groupMeta}>
                  {item.members_count} members
                </Text>
              </TouchableOpacity>
            );
          }}
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
  groupItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc"
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  groupName: {
    fontSize: 16
  },
  groupRole: {
    fontSize: 12,
    color: "#555"
  },
  groupMeta: {
    fontSize: 12,
    color: "#777"
  }
});
