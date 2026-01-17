import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../../auth/hooks";
import { get, post } from "../../api/client";

type PayoutSettingsResponse = {
  pkr_per_coin: number;
  min_pkr: number;
  methods: string[];
};

type CreatePayoutResponse = {
  request: {
    id: string;
    coins_requested: number;
    pkr_amount: number;
    status: string;
    method: string;
    requested_at: string;
  };
  coins_balance: number;
  coins_balance_pkr: number;
};

type MethodType = "bank_transfer" | "easypaisa" | "jazzcash";

type BankDetails = {
  account_title: string;
  account_number: string;
  bank_name: string;
};

type WalletDetails = {
  account_name: string;
  mobile_number: string;
};

export function PayoutRequestScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PayoutSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [amountMode, setAmountMode] = useState<"coins" | "pkr">("coins");
  const [coinsInput, setCoinsInput] = useState("");
  const [pkrInput, setPkrInput] = useState("");
  const [method, setMethod] = useState<MethodType>("bank_transfer");
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    account_title: "",
    account_number: "",
    bank_name: ""
  });
  const [walletDetails, setWalletDetails] = useState<WalletDetails>({
    account_name: "",
    mobile_number: ""
  });

  useEffect(() => {
    if (!user?.accessToken) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await get<PayoutSettingsResponse>(
          "/payout/settings",
          user.accessToken
        );
        if (!isMounted) {
          return;
        }
        setSettings(data);
      } catch (e) {
        if (isMounted) {
          setError("Failed to load payout settings");
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

  const parsedCoins = useMemo(() => {
    const n = Number(coinsInput.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      return 0;
    }
    return Math.floor(n);
  }, [coinsInput]);

  const parsedPkr = useMemo(() => {
    const n = Number(pkrInput.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      return 0;
    }
    return n;
  }, [pkrInput]);

  const computedPkrFromCoins = useMemo(() => {
    if (!settings) {
      return 0;
    }
    return parsedCoins * settings.pkr_per_coin;
  }, [parsedCoins, settings]);

  const computedCoinsFromPkr = useMemo(() => {
    if (!settings || settings.pkr_per_coin <= 0) {
      return 0;
    }
    return Math.ceil(parsedPkr / settings.pkr_per_coin);
  }, [parsedPkr, settings]);

  const amountError = useMemo(() => {
    if (!settings) {
      return null;
    }

    const pkrAmount =
      amountMode === "coins" ? computedPkrFromCoins : parsedPkr;

    if (pkrAmount <= 0) {
      return "Enter an amount to withdraw";
    }

    if (pkrAmount < settings.min_pkr) {
      return `Minimum withdrawal is ${settings.min_pkr} PKR`;
    }

    return null;
  }, [settings, amountMode, computedPkrFromCoins, parsedPkr]);

  const handleSubmit = async () => {
    if (!user?.accessToken || !settings || isSubmitting) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (amountError) {
      setError(amountError);
      return;
    }

    let body:
      | {
          coins_requested: number;
          method: MethodType;
          method_details: BankDetails | WalletDetails;
        }
      | {
          pkr_amount: number;
          method: MethodType;
          method_details: BankDetails | WalletDetails;
        };

    if (amountMode === "coins") {
      body = {
        coins_requested: parsedCoins,
        method,
        method_details:
          method === "bank_transfer" ? bankDetails : walletDetails
      };
    } else {
      body = {
        pkr_amount: parsedPkr,
        method,
        method_details:
          method === "bank_transfer" ? bankDetails : walletDetails
      };
    }

    const detailsValid =
      method === "bank_transfer"
        ? bankDetails.account_title.trim().length > 0 &&
          bankDetails.account_number.trim().length > 0 &&
          bankDetails.bank_name.trim().length > 0
        : walletDetails.account_name.trim().length > 0 &&
          walletDetails.mobile_number.trim().length > 0;

    if (!detailsValid) {
      setError("Fill in all payout method details");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await post<CreatePayoutResponse, typeof body>(
        "/payout/requests",
        body,
        user.accessToken
      );

      setSuccess(
        `Payout request submitted. New balance: ${result.coins_balance.toLocaleString()} coins`
      );
      setCoinsInput("");
      setPkrInput("");
    } catch (e: any) {
      setError("Failed to submit payout request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLabel = useMemo(() => {
    if (method === "bank_transfer") {
      return "Bank transfer";
    }
    if (method === "easypaisa") {
      return "Easypaisa";
    }
    return "JazzCash";
  }, [method]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!user?.accessToken && (
        <Text style={styles.message}>Sign in to request a payout.</Text>
      )}
      {user?.accessToken && isLoading && (
        <Text style={styles.message}>Loading payout settings...</Text>
      )}
      {user?.accessToken && !isLoading && settings && (
        <View>
          <Text style={styles.title}>Request Payout</Text>
          <Text style={styles.text}>
            Rate: {settings.pkr_per_coin} PKR per coin
          </Text>
          <Text style={styles.text}>
            Minimum withdrawal: {settings.min_pkr} PKR
          </Text>

          <Text style={styles.sectionTitle}>Amount</Text>
          <View style={styles.row}>
            <Button
              title="By coins"
              onPress={() => setAmountMode("coins")}
              disabled={amountMode === "coins"}
            />
            <Button
              title="By PKR"
              onPress={() => setAmountMode("pkr")}
              disabled={amountMode === "pkr"}
            />
          </View>
          {amountMode === "coins" ? (
            <>
              <Text style={styles.label}>Coins to withdraw</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={coinsInput}
                onChangeText={setCoinsInput}
              />
              <Text style={styles.text}>
                Approx PKR: {computedPkrFromCoins.toFixed(0)}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>PKR amount</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={pkrInput}
                onChangeText={setPkrInput}
              />
              <Text style={styles.text}>
                Approx coins: {computedCoinsFromPkr}
              </Text>
            </>
          )}

          <Text style={styles.sectionTitle}>Payout method</Text>
          <View style={styles.row}>
            <Button
              title="Bank"
              onPress={() => setMethod("bank_transfer")}
              disabled={method === "bank_transfer"}
            />
            <Button
              title="Easypaisa"
              onPress={() => setMethod("easypaisa")}
              disabled={method === "easypaisa"}
            />
            <Button
              title="JazzCash"
              onPress={() => setMethod("jazzcash")}
              disabled={method === "jazzcash"}
            />
          </View>
          <Text style={styles.text}>Selected: {selectedLabel}</Text>

          {method === "bank_transfer" ? (
            <View>
              <Text style={styles.label}>Account title</Text>
              <TextInput
                style={styles.input}
                value={bankDetails.account_title}
                onChangeText={(text: string) =>
                  setBankDetails({ ...bankDetails, account_title: text })
                }
              />
              <Text style={styles.label}>Account number</Text>
              <TextInput
                style={styles.input}
                value={bankDetails.account_number}
                onChangeText={(text: string) =>
                  setBankDetails({ ...bankDetails, account_number: text })
                }
              />
              <Text style={styles.label}>Bank name</Text>
              <TextInput
                style={styles.input}
                value={bankDetails.bank_name}
                onChangeText={(text: string) =>
                  setBankDetails({ ...bankDetails, bank_name: text })
                }
              />
            </View>
          ) : (
            <View>
              <Text style={styles.label}>Account name</Text>
              <TextInput
                style={styles.input}
                value={walletDetails.account_name}
                onChangeText={(text: string) =>
                  setWalletDetails({ ...walletDetails, account_name: text })
                }
              />
              <Text style={styles.label}>Mobile number</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={walletDetails.mobile_number}
                onChangeText={(text: string) =>
                  setWalletDetails({ ...walletDetails, mobile_number: text })
                }
              />
            </View>
          )}

          {amountError && <Text style={styles.error}>{amountError}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
          {success && <Text style={styles.success}>{success}</Text>}

          <Button
            title={isSubmitting ? "Submitting..." : "Submit payout request"}
            onPress={handleSubmit}
            disabled={isSubmitting}
          />
        </View>
      )}
    </ScrollView>
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
    marginBottom: 8
  },
  message: {
    textAlign: "center",
    marginBottom: 16
  },
  text: {
    fontSize: 16,
    marginBottom: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 8
  },
  label: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8
  },
  error: {
    color: "red",
    marginTop: 8,
    marginBottom: 4
  },
  success: {
    color: "green",
    marginTop: 8,
    marginBottom: 4
  }
});
