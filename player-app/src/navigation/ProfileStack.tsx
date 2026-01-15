import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileScreen } from "../modules/profile/screens/ProfileScreen";
import { SettingsScreen } from "../modules/profile/screens/SettingsScreen";
import { HelpScreen } from "../modules/profile/screens/HelpScreen";

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Help: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
    </Stack.Navigator>
  );
}

