import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { WalletScreen } from "../modules/wallet/screens/WalletScreen";
import { PayoutRequestScreen } from "../modules/wallet/screens/PayoutRequestScreen";
import { PayoutHistoryScreen } from "../modules/wallet/screens/PayoutHistoryScreen";

export type WalletStackParamList = {
  Wallet: undefined;
  PayoutRequest: undefined;
  PayoutHistory: undefined;
};

const Stack = createNativeStackNavigator<WalletStackParamList>();

export function WalletStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen
        name="PayoutRequest"
        component={PayoutRequestScreen}
        options={{ title: "Request Payout" }}
      />
      <Stack.Screen
        name="PayoutHistory"
        component={PayoutHistoryScreen}
        options={{ title: "Payout History" }}
      />
    </Stack.Navigator>
  );
}
