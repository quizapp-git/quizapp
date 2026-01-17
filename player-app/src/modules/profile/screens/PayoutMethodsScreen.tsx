import React, { useEffect, useState } from "react";
import { Alert, Button, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../../navigation/ProfileStack";
import { useAuth } from "../../auth/hooks";
import { get, post } from "../../api/client";

type Props = NativeStackScreenProps<ProfileStackParamList, "PayoutMethods">;

type Account = {
  id: string;
  type: "BANK" | "EASYPAISA" | "JAZZCASH";
  account_title: string;
  account_number: string;
  bank_name: string | null;
  is_default: boolean;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "DISABLED";
};

export function PayoutMethodsScreen({}: Props) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newType, setNewType] = useState<Account["type"]>("EASYPAISA");
  const [newTitle, setNewTitle] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [isDefault, setIsDefault] = useState(true);

  const load = async () => {
    if (!user?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await get<{ accounts: Account[] }>(
        "/profile/payment-accounts",
        user.accessToken
      );
      setAccounts(
        data.accounts.map(a => ({
          id: a.id,
          type: a.type,
          account_title: a.account_title,
          account_number: a.account_number,
          bank_name: a.bank_name,
          is_default: a.is_default,
          status: a.status
        }))
      );
    } catch (e) {
      setError("Failed to load payout methods");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.accessToken]);

  const addAccount = async () => {
    if (!user?.accessToken) return;
    if (!newTitle || !newNumber) {
      Alert.alert("Missing info", "Please fill all fields");
      return;
    }
    try {
      await post("/profile/payment-accounts", {
        type: newType,
        account_title: newTitle,
        account_number: newNumber,
        bank_name: newType === "BANK" ? newBankName : null,
        is_default: isDefault
      }, user.accessToken);
      setModalVisible(false);
      setNewTitle("");
      setNewNumber("");
      setNewBankName("");
      setIsDefault(true);
      load();
    } catch (e) {
      Alert.alert("Error", "Failed to add payout method");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payout Methods</Text>
      {isLoading && <Text style={styles.body}>Loading...</Text>}
      {error && <Text style={styles.body}>{error}</Text>}
      <FlatList<Account>
        data={accounts}
        keyExtractor={(item: Account) => item.id}
        renderItem={({ item }: { item: Account }) => (
          <View style={styles.item}>
            <Text style={styles.body}>{item.type}</Text>
            <Text style={styles.body}>{item.account_title}</Text>
            <Text style={styles.body}>{item.account_number}</Text>
            {item.bank_name && <Text style={styles.body}>{item.bank_name}</Text>}
            <Text style={styles.body}>
              {item.is_default ? "Default" : "Secondary"} • {item.status}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.body}>No payout methods</Text> : null
        }
      />
      <Button title="Add Method" onPress={() => setModalVisible(true)} />
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.title}>Add Payout Method</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => setNewType("EASYPAISA")}>
              <Text style={[styles.chip, newType === "EASYPAISA" && styles.chipActive]}>Easypaisa</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setNewType("JAZZCASH")}>
              <Text style={[styles.chip, newType === "JAZZCASH" && styles.chipActive]}>JazzCash</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setNewType("BANK")}>
              <Text style={[styles.chip, newType === "BANK" && styles.chipActive]}>Bank</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Account title"
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Account number"
            value={newNumber}
            onChangeText={setNewNumber}
            keyboardType="number-pad"
          />
          {newType === "BANK" && (
            <TextInput
              style={styles.input}
              placeholder="Bank name"
              value={newBankName}
              onChangeText={setNewBankName}
            />
          )}
          <TouchableOpacity onPress={() => setIsDefault(!isDefault)}>
            <Text style={styles.body}>Set as default: {isDefault ? "Yes" : "No"}</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <Button title="Cancel" onPress={() => setModalVisible(false)} />
            <Button title="Save" onPress={addAccount} />
          </View>
        </View>
      </Modal>
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
    marginBottom: 16
  },
  body: {
    fontSize: 16,
    marginBottom: 4
  },
  item: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 12
  },
  modal: {
    flex: 1,
    padding: 16,
    justifyContent: "center"
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "center"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  chip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8
  },
  chipActive: {
    backgroundColor: "#eef"
  }
});
