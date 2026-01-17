import React, { useState } from "react";
import {
  Button,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FriendsStackParamList } from "../../../navigation/FriendsStack";
import { useCreateGroup } from "../hooks";

type Props = NativeStackScreenProps<FriendsStackParamList, "CreateGroup">;

export function CreateGroupScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [maxMembers, setMaxMembers] = useState("50");
  const [localError, setLocalError] = useState<string | null>(null);

  const createGroup = useCreateGroup();

  const handleSubmit = () => {
    if (!name.trim()) {
      setLocalError("Group name is required.");
      return;
    }

    const parsedMax = Number(maxMembers);
    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      setLocalError("Max members must be a positive number.");
      return;
    }

    setLocalError(null);

    createGroup.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        max_members: parsedMax
      },
      {
        onSuccess: (group) => {
          navigation.replace("GroupDetail", { groupId: group.id });
        }
      }
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Group</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Group name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter group name"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          multiline
        />
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.label}>Public group</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Max members</Text>
        <TextInput
          style={styles.input}
          value={maxMembers}
          onChangeText={setMaxMembers}
          keyboardType="number-pad"
          placeholder="Max members"
        />
      </View>
      {localError && <Text style={styles.error}>{localError}</Text>}
      {createGroup.error && (
        <Text style={styles.error}>{createGroup.error.message}</Text>
      )}
      <Button
        title={createGroup.isPending ? "Creating..." : "Create"}
        onPress={handleSubmit}
        disabled={createGroup.isPending}
      />
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
    marginBottom: 16,
    textAlign: "center"
  },
  field: {
    marginBottom: 16
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    marginBottom: 4
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  error: {
    color: "#cc0000",
    marginBottom: 12,
    textAlign: "center"
  }
});

