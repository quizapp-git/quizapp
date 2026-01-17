import React, { useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FriendsStackParamList } from "../../../navigation/FriendsStack";
import { useFriendActions } from "../hooks";

type Props = NativeStackScreenProps<FriendsStackParamList, "AddFriend">;

export function AddFriendScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { sendFriendRequest } = useFriendActions();

  const handleSend = async () => {
    if (!identifier.trim() || sendFriendRequest.isPending) {
      return;
    }

    setMessage(null);

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes("@");

    try {
      await sendFriendRequest.mutateAsync(
        isEmail ? { email: trimmed } : { username: trimmed }
      );
      setMessage("Friend request sent");
      setIdentifier("");
    } catch (e) {
      if (e instanceof Error) {
        setMessage(e.message);
      } else {
        setMessage("Failed to send friend request");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Friend</Text>
      <Text style={styles.label}>Username or email</Text>
      <TextInput
        style={styles.input}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Enter username or email"
      />
      {message && <Text style={styles.message}>{message}</Text>}
      <Button
        title={sendFriendRequest.isPending ? "Sending..." : "Send request"}
        onPress={handleSend}
      />
      <View style={styles.footer}>
        <Button title="Back to friends" onPress={() => navigation.goBack()} />
      </View>
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
  label: {
    fontSize: 16,
    marginBottom: 8
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12
  },
  message: {
    marginBottom: 12,
    textAlign: "center"
  },
  footer: {
    marginTop: 16
  }
});

