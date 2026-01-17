import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FriendsStackParamList } from "../../../navigation/FriendsStack";
import { useAuth } from "../../auth/hooks";
import { post } from "../../api/client";
import { useQuickChatMessages } from "../../quickchat/hooks";
import {
  useGroup,
  useGroupChat,
  type GroupMember,
  type GroupChatMessage
} from "../hooks";
import { VoiceService } from "../../voice/VoiceService";
import { useCommunication } from "../../communication/CommunicationProvider";

type Props = NativeStackScreenProps<FriendsStackParamList, "GroupDetail">;

export function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const {
    group,
    members,
    isGroupFull,
    isMuted,
    isLoading,
    error,
    leaveGroup,
    kickMember,
    muteMember,
    unmuteMember,
    makeAdmin
  } = useGroup(groupId);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"members" | "chat">("members");

  const currentUserId = user?.id;

  const canManageMembers = useMemo(
    () => Boolean(group?.is_owner || group?.is_admin),
    [group?.is_owner, group?.is_admin]
  );

  const handleLeaveGroup = () => {
    leaveGroup.mutate(undefined, {
      onSuccess: () => {
        navigation.navigate("Groups");
      }
    });
  };

  if (isLoading && !group) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && !group) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{error}</Text>
        <Button title="Back to groups" onPress={() => navigation.navigate("Groups")} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Group not found.</Text>
        <Button title="Back to groups" onPress={() => navigation.navigate("Groups")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description ? (
            <Text style={styles.groupDescription}>{group.description}</Text>
          ) : null}
          <Text style={styles.groupMeta}>
            {group.members_count} members
            {isGroupFull ? " (Full)" : ""}
          </Text>
        </View>
        <Button
          title={leaveGroup.isPending ? "Leaving..." : "Leave group"}
          onPress={handleLeaveGroup}
          disabled={leaveGroup.isPending}
        />
      </View>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "members" && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab("members")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "members" && styles.tabButtonTextActive
            ]}
          >
            Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "chat" && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab("chat")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "chat" && styles.tabButtonTextActive
            ]}
          >
            Chat
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === "members" ? (
        <View style={styles.membersContainer}>
          <View style={styles.membersHeaderRow}>
            <Text style={styles.sectionTitle}>Members</Text>
            <Button
              title="Invite friend"
              onPress={() =>
                navigation.navigate("GroupInviteFriends", { groupId })
              }
            />
          </View>
          <FlatList<GroupMember>
            data={members}
            keyExtractor={(item: GroupMember) => item.id}
            renderItem={({ item }: { item: GroupMember }) => {
              const isCurrentUser = item.user_id === currentUserId;
              const canModify =
                canManageMembers && !isCurrentUser && item.role !== "owner";

              return (
                <View style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {item.username || "Player"}
                    </Text>
                    <View style={styles.memberMetaRow}>
                      <Text style={styles.memberRole}>{item.role}</Text>
                      {item.is_muted && (
                        <Text style={styles.mutedBadge}>Muted</Text>
                      )}
                    </View>
                  </View>
                  {canModify && (
                    <View style={styles.memberActions}>
                      {item.role === "member" && (
                        <TouchableOpacity
                          style={styles.memberButton}
                          onPress={() => makeAdmin.mutate(item.id)}
                          disabled={makeAdmin.isPending}
                        >
                          <Text style={styles.memberButtonText}>Make admin</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.memberButton}
                        onPress={() => kickMember.mutate(item.id)}
                        disabled={kickMember.isPending}
                      >
                        <Text style={styles.memberButtonText}>Remove</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.memberButton}
                        onPress={() =>
                          item.is_muted
                            ? unmuteMember.mutate(item.id)
                            : muteMember.mutate(item.id)
                        }
                        disabled={muteMember.isPending || unmuteMember.isPending}
                      >
                        <Text style={styles.memberButtonText}>
                          {item.is_muted ? "Unmute" : "Mute"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        </View>
      ) : (
        <GroupChatPanel groupId={groupId} isMuted={isMuted} />
      )}
    </View>
  );
}

type GroupChatPanelProps = {
  groupId: string;
  isMuted: boolean;
};

type CreateVoiceRoomResponse = {
  voice_room_id: string;
  room_code: string;
};

type JoinVoiceRoomResponse = {
  voice_room_id: string;
  provider: string;
  channel_name: string;
  token: string;
  expires_at: string;
};

function GroupChatPanel({ groupId, isMuted }: GroupChatPanelProps) {
  const { user } = useAuth();
  const {
    status: communicationStatus,
    isLoading: isLoadingCommunication,
    error: communicationError,
    canUseQuickChat,
    canUseCustomTextChat,
    canUseVoiceChat
  } = useCommunication();
  const {
    messages,
    isLoading,
    historyError,
    isSending,
    sendError,
    sendQuickMessage,
    sendEmoticon,
    sendTextMessage
  } = useGroupChat(groupId);
  const { messages: quickMessages } = useQuickChatMessages();
  const [text, setText] = useState("");
  const [voiceRoomId, setVoiceRoomId] = useState<string | null>(null);
  const [isJoiningVoice, setIsJoiningVoice] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceParticipantsCount, setVoiceParticipantsCount] = useState(0);

  const quickTextMessages = useMemo(
    () => quickMessages.filter((item) => item.category !== "emoticon"),
    [quickMessages]
  );

  const emoticonMessages = useMemo(
    () => quickMessages.filter((item) => item.category === "emoticon"),
    [quickMessages]
  );

  const canUseQuickAndEmoticon = canUseQuickChat;

  const canUseVoiceChatNow = canUseVoiceChat && !isLoadingCommunication;

  useEffect(() => {
    const state = VoiceService.getState();
    setIsInVoice(state.isJoined);
    setIsVoiceMuted(state.isMuted);
    setVoiceParticipantsCount(state.participantsCount);

    VoiceService.setParticipantChangeListener((payload) => {
      setVoiceParticipantsCount(payload.participantsCount);
    });

    return () => {
      VoiceService.setParticipantChangeListener(null);
    };
  }, []);

  const handleSendText = () => {
    if (!text.trim()) {
      return;
    }
    sendTextMessage(text).then(() => {
      setText("");
    });
  };

  const handleSendQuick = (quickChatMessageId: string) => {
    sendQuickMessage(quickChatMessageId);
  };

  const handleSendEmoticon = (quickChatMessageId: string) => {
    sendEmoticon(quickChatMessageId);
  };

  const handleJoinVoice = async () => {
    if (
      !user?.accessToken ||
      isJoiningVoice ||
      isInVoice ||
      !canUseVoiceChatNow
    ) {
      return;
    }

    setIsJoiningVoice(true);
    setVoiceError(null);

    try {
      let currentVoiceRoomId = voiceRoomId;

      if (!currentVoiceRoomId) {
        const created = await post<CreateVoiceRoomResponse, {}>(
          "/voice/create-room",
          {},
          user.accessToken
        );
        currentVoiceRoomId = created.voice_room_id;
        setVoiceRoomId(created.voice_room_id);
      }

      const joined = await post<JoinVoiceRoomResponse, { voice_room_id: string }>(
        "/voice/join-room",
        {
          voice_room_id: currentVoiceRoomId as string
        },
        user.accessToken
      );

      await VoiceService.joinChannel({
        provider: joined.provider,
        channelName: joined.channel_name,
        token: joined.token,
        userId: user.id
      });

      setIsInVoice(true);
      setIsVoiceMuted(false);
    } catch (e) {
      setVoiceError("Failed to join voice room");
    } finally {
      setIsJoiningVoice(false);
    }
  };

  const handleLeaveVoice = async () => {
    if (!user?.accessToken || !isInVoice || !voiceRoomId) {
      return;
    }

    setIsJoiningVoice(true);
    setVoiceError(null);

    try {
      await post<{ success: boolean }, { voice_room_id: string }>(
        "/voice/leave-room",
        {
          voice_room_id: voiceRoomId
        },
        user.accessToken
      );

      await VoiceService.leaveChannel();
      setIsInVoice(false);
      setIsVoiceMuted(false);
      setVoiceParticipantsCount(0);
    } catch (e) {
      setVoiceError("Failed to leave voice room");
    } finally {
      setIsJoiningVoice(false);
    }
  };

  const handleToggleVoiceMute = async () => {
    if (!isInVoice) {
      return;
    }

    const nextMuted = !isVoiceMuted;
    try {
      await VoiceService.muteLocalAudio(nextMuted);
      setIsVoiceMuted(nextMuted);
    } catch (e) {
      setVoiceError("Failed to update mute state");
    }
  };

  return (
    <View style={styles.chatContainer}>
      {isLoading && <ActivityIndicator />}
      {historyError && <Text style={styles.message}>{historyError}</Text>}
      {sendError && <Text style={styles.message}>{sendError}</Text>}
      {isLoadingCommunication && (
        <Text style={styles.message}>Checking communication status...</Text>
      )}
      {communicationError && (
        <Text style={styles.message}>{communicationError}</Text>
      )}
      {isMuted && (
        <Text style={styles.mutedNotice}>
          You have been muted by a group admin.
        </Text>
      )}
      <FlatList<GroupChatMessage>
        data={messages}
        keyExtractor={(item: GroupChatMessage) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }: { item: GroupChatMessage }) => {
          const isOwn = item.sender_id === user?.id;
          const containerStyle = [
            styles.messageBubble,
            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther
          ];
          const textStyle = [
            styles.messageText,
            item.type === "emoticon" && styles.messageTextEmoticon
          ];

          return (
            <View style={styles.messageRow}>
              <View style={containerStyle}>
                <Text style={styles.messageSender}>
                  {isOwn ? "You" : item.sender_name || "Player"}
                </Text>
                <Text style={textStyle}>{item.content}</Text>
                <Text style={styles.messageTime}>
                  {new Date(item.created_at).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          );
        }}
      />
      {quickTextMessages.length > 0 && (
        <View style={styles.quickBar}>
          {quickTextMessages.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.quickButton}
              onPress={() => handleSendQuick(item.id)}
              disabled={isMuted || isSending || !canUseQuickAndEmoticon}
            >
              <Text style={styles.quickButtonText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {emoticonMessages.length > 0 && (
        <View style={styles.emoticonBar}>
          {emoticonMessages.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.emoticonButton}
              onPress={() => handleSendEmoticon(item.id)}
              disabled={isMuted || isSending || !canUseQuickAndEmoticon}
            >
              <Text style={styles.emoticonButtonText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {communicationStatus && !canUseCustomTextChat && (
        <Text style={styles.mutedNotice}>
          Custom text chat is locked. Watch{" "}
          {communicationStatus.ads_needed_for_custom_text} more ads to unlock.
        </Text>
      )}
      <View style={styles.voiceBar}>
        {isLoadingCommunication && (
          <Text style={styles.message}>Checking voice chat status...</Text>
        )}
        {!isLoadingCommunication &&
          communicationStatus &&
          !communicationStatus.can_use_voice_chat && (
            <Text style={styles.message}>
              Voice chat locked. Watch{" "}
              {communicationStatus.ads_needed_for_voice_chat} more ads to unlock.
            </Text>
          )}
        {!isLoadingCommunication &&
          communicationStatus &&
          communicationStatus.can_use_voice_chat && (
            <View style={styles.voiceControlsRow}>
              <TouchableOpacity
                style={styles.voiceButton}
                disabled={isJoiningVoice}
                onPress={isInVoice ? handleLeaveVoice : handleJoinVoice}
              >
                <Text style={styles.voiceButtonText}>
                  {isInVoice
                    ? isJoiningVoice
                      ? "Leaving voice..."
                      : "Leave voice"
                    : isJoiningVoice
                      ? "Joining voice..."
                      : "Join voice"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  !isInVoice && styles.voiceButtonDisabled
                ]}
                disabled={!isInVoice}
                onPress={handleToggleVoiceMute}
              >
                <Text style={styles.voiceButtonText}>
                  {isVoiceMuted ? "Unmute" : "Mute"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.message}>
                Participants: {voiceParticipantsCount}
              </Text>
            </View>
          )}
        {voiceError && <Text style={styles.message}>{voiceError}</Text>}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          maxLength={120}
          editable={!isMuted && !isSending && canUseCustomTextChat}
        />
        <Button
          title={isSending ? "Sending..." : "Send"}
          onPress={handleSendText}
          disabled={isMuted || isSending || !canUseCustomTextChat}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  message: {
    textAlign: "center",
    marginBottom: 16
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  headerText: {
    flex: 1,
    marginRight: 12
  },
  groupName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4
  },
  groupDescription: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4
  },
  groupMeta: {
    fontSize: 12,
    color: "#777"
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc"
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center"
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#007bff"
  },
  tabButtonText: {
    fontSize: 14,
    color: "#555"
  },
  tabButtonTextActive: {
    color: "#007bff",
    fontWeight: "500"
  },
  membersContainer: {
    flex: 1
  },
  membersHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "500"
  },
  memberItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc"
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  memberName: {
    fontSize: 16
  },
  memberMetaRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  memberRole: {
    fontSize: 12,
    color: "#555",
    marginRight: 8
  },
  mutedBadge: {
    fontSize: 12,
    color: "#cc0000"
  },
  memberActions: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  memberButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: "#007bff",
    marginRight: 8,
    marginBottom: 4
  },
  memberButtonText: {
    color: "#ffffff",
    fontSize: 12
  },
  chatContainer: {
    flex: 1
  },
  messagesList: {
    paddingVertical: 8
  },
  messageRow: {
    paddingHorizontal: 4,
    marginBottom: 4
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12
  },
  messageBubbleOwn: {
    alignSelf: "flex-end",
    backgroundColor: "#007bff"
  },
  messageBubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e5ea"
  },
  messageSender: {
    fontSize: 11,
    marginBottom: 2,
    color: "#222"
  },
  messageText: {
    fontSize: 14,
    color: "#000"
  },
  messageTextEmoticon: {
    fontSize: 24
  },
  messageTime: {
    fontSize: 10,
    color: "#555",
    marginTop: 2
  },
  quickBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc"
  },
  quickButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#f1f1f1",
    marginRight: 8,
    marginBottom: 8
  },
  quickButtonText: {
    fontSize: 12
  },
  emoticonBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc"
  },
  emoticonButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: "#ffe599",
    marginRight: 8,
    marginBottom: 8
  },
  emoticonButtonText: {
    fontSize: 24
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc"
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8
  },
  mutedNotice: {
    textAlign: "center",
    color: "#cc0000",
    marginBottom: 8
  }
});

