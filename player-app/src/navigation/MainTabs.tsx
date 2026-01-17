import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeStack } from "./HomeStack";
import { WalletStack } from "./WalletStack";
import { LeaderboardStack } from "./LeaderboardStack";
import { ProfileStack } from "./ProfileStack";
import { FriendsStack } from "./FriendsStack";

export type MainTabParamList = {
  HomeTab: undefined;
  WalletTab: undefined;
  LeaderboardTab: undefined;
  FriendsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletStack}
        options={{ title: "Wallet" }}
      />
      <Tab.Screen
        name="LeaderboardTab"
        component={LeaderboardStack}
        options={{ title: "Leaderboard" }}
      />
      <Tab.Screen
        name="FriendsTab"
        component={FriendsStack}
        options={{ title: "Friends" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
