import React, { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { FriendsStackParamList } from "../../../navigation/FriendsStack";
import { VoiceService } from "../VoiceService";

type Props = NativeStackScreenProps<FriendsStackParamList, "GroupVoiceRoom">;

export function VoiceRoomScreen({ route, navigation }: Props) {
  const { provider, channelName, expiresAt, groupName } = route.params;

  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = VoiceService.getState();
    setIsJoined(state.isJoined);
    setIsMuted(state.isMuted);
    setParticipantsCount(state.participantsCount);

    VoiceService.setParticipantChangeListener((payload) => {
      setParticipantsCount(payload.participantsCount);
    });

    const unsubscribe = navigation.addListener("beforeRemove", () => {
      VoiceService.setParticipantChangeListener(null);
    });

    return () => {
      VoiceService.setParticipantChangeListener(null);
      unsubscribe();
    };
  }, [navigation]);

  const handleToggleMute = async () => {
    if (!isJoined) {
      return;
    }

    const nextMuted = !isMuted;
    try {
      await VoiceService.muteLocalAudio(nextMuted);
      setIsMuted(nextMuted);
    } catch {
      setError("Failed to update mute state");
    }
  };

  const handleLeave = async () => {
    if (!isJoined || isLeaving) {
      navigation.goBack();
      return;
    }

    setIsLeaving(true);
    setError(null);
    try {
      await VoiceService.leaveChannel();
      setIsJoined(false);
      setIsMuted(false);
      setParticipantsCount(0);
      navigation.goBack();
    } catch {
      setError("Failed to leave voice room");
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{groupName}</Text>
      <Text style={styles.subtitle}>Voice room</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Provider</Text>
        <Text style={styles.infoValue}>{provider}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Channel</Text>
        <Text style={styles.infoValue}>{channelName}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Expires at</Text>
        <Text style={styles.infoValue}>{expiresAt}</Text>
      </View>
      <View style={styles.participantsBox}>
        <Text style={styles.participantsLabel}>Participants</Text>
        <Text style={styles.participantsCount}>{participantsCount}</Text>
      </View>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            !isJoined && styles.controlButtonDisabled
          ]}
          disabled={!isJoined}
          onPress={handleToggleMute}
        >
          <Text style={styles.controlButtonText}>
            {isMuted ? "Unmute" : "Mute"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.leaveButton]}
          onPress={handleLeave}
          disabled={isLeaving}
        >
          <Text style={styles.controlButtonText}>
            {isLeaving ? "Leaving..." : "Leave voice"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          Voice conversations may be moderated and are not guaranteed to be
          private. Avoid sharing personal information.
        </Text>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 14,
    color: "#555"
  },
  infoValue: {
    fontSize: 14
  },
  participantsBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  participantsLabel: {
    fontSize: 16
  },
  participantsCount: {
    fontSize: 20,
    fontWeight: "600"
  },
  controlsRow: {
    flexDirection: "row",
    marginTop: 24,
    justifyContent: "space-between"
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: "#007bff",
    marginRight: 8,
    alignItems: "center"
  },
  controlButtonDisabled: {
    backgroundColor: "#999999"
  },
  leaveButton: {
    backgroundColor: "#cc0000",
    marginRight: 0
  },
  controlButtonText: {
    color: "#ffffff",
    fontSize: 14
  },
  noticeBox: {
    marginTop: 24
  },
  noticeText: {
    fontSize: 12,
    color: "#555"
  },
  errorText: {
    marginTop: 12,
    color: "#cc0000"
  }
});
