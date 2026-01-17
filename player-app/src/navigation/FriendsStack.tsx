import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FriendsScreen } from "../modules/friends/screens/FriendsScreen";
import { FriendRequestsScreen } from "../modules/friends/screens/FriendRequestsScreen";
import { AddFriendScreen } from "../modules/friends/screens/AddFriendScreen";
import { GroupsScreen } from "../modules/groups/screens/GroupsScreen";
import { CreateGroupScreen } from "../modules/groups/screens/CreateGroupScreen";
import { GroupInvitationsScreen } from "../modules/groups/screens/GroupInvitationsScreen";
import { GroupDetailScreen } from "../modules/groups/screens/GroupDetailScreen";
import { GroupInviteFriendsScreen } from "../modules/groups/screens/GroupInviteFriendsScreen";
import { VoiceRoomScreen } from "../modules/voice/screens/VoiceRoomScreen";

export type FriendsStackParamList = {
  Friends: undefined;
  FriendRequests: undefined;
  AddFriend: undefined;
  Groups: undefined;
  GroupInvitations: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string };
  GroupInviteFriends: { groupId: string };
  GroupVoiceRoom: {
    voiceRoomId: string;
    provider: string;
    channelName: string;
    token: string;
    expiresAt: string;
    groupId: string;
    groupName: string;
  };
};

const Stack = createNativeStackNavigator<FriendsStackParamList>();

export function FriendsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen
        name="FriendRequests"
        component={FriendRequestsScreen}
        options={{ title: "Friend Requests" }}
      />
      <Stack.Screen
        name="AddFriend"
        component={AddFriendScreen}
        options={{ title: "Add Friend" }}
      />
      <Stack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ title: "Groups" }}
      />
      <Stack.Screen
        name="GroupInvitations"
        component={GroupInvitationsScreen}
        options={{ title: "Group Invitations" }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ title: "Create Group" }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ title: "Group" }}
      />
      <Stack.Screen
        name="GroupInviteFriends"
        component={GroupInviteFriendsScreen}
        options={{ title: "Invite Friends" }}
      />
      <Stack.Screen
        name="GroupVoiceRoom"
        component={VoiceRoomScreen}
        options={{ title: "Group Voice" }}
      />
    </Stack.Navigator>
  );
}
