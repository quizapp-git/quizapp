import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileScreen } from "../modules/profile/screens/ProfileScreen";
import { SettingsScreen } from "../modules/profile/screens/SettingsScreen";
import { HelpScreen } from "../modules/profile/screens/HelpScreen";
import { PayoutMethodsScreen } from "../modules/profile/screens/PayoutMethodsScreen";

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Help: undefined;
  PayoutMethods: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="PayoutMethods" component={PayoutMethodsScreen} />
    </Stack.Navigator>
  );
}
