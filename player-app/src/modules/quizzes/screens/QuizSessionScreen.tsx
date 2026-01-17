import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../../navigation/HomeStack";
import { useAuth } from "../../auth/hooks";
import { get, post } from "../../api/client";
import { AdService } from "../../ads/AdService";
import { VoiceService } from "../../voice/VoiceService";
import { useFriends } from "../../friends/hooks";
import {
  useQuickChatMessages,
  useQuickChatSession
} from "../../quickchat/hooks";
import { useCommunication } from "../../communication/CommunicationProvider";

type Props = NativeStackScreenProps<HomeStackParamList, "QuizSession">;

const maxQuestions = 10;

export function QuizSessionScreen({ navigation, route }: Props) {
  const { quizId } = route.params;
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [questions, setQuestions] = useState<
    {
      id: string;
      question_text: string;
      options: string[];
    }[]
  >([]);

  type QuizDetailResponse = {
    id: string;
    title: string;
    description: string | null;
    difficulty: string;
    total_questions: number;
    questions: {
      id: string;
      question_text: string;
      options: unknown;
      difficulty: string;
      category: string;
    }[];
  };

  type StartSessionResponse = {
    session_id: string;
    quiz_id: string;
    total_questions: number;
  };

  type AnswerResponse = {
    correct: boolean;
  };

  type CompleteSessionResponse = {
    final_score: number;
    coins_earned: number;
    coins_balance: number;
    lifetime_earned_coins: number;
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

  type QuickChatStage = "PRESET_ONLY" | "CUSTOM_TEXT" | "VOICE_ENABLED";

  const { friends } = useFriends();

  const [isQuickChatOpen, setIsQuickChatOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const {
    status: communicationStatus,
    isLoading: isLoadingCommunication,
    canUseQuickChat,
    canUseVoiceChat
  } = useCommunication();

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
        const [quizData, sessionData] = await Promise.all([
          get<QuizDetailResponse>(`/quizzes/${quizId}`, user.accessToken),
          post<StartSessionResponse, {}>(
            `/quizzes/${quizId}/start-session`,
            {},
            user.accessToken
          )
        ]);

        if (!isMounted) {
          return;
        }

        const normalizedQuestions =
          quizData.questions?.map((q) => {
            let options: string[] = [];
            if (Array.isArray(q.options)) {
              options = q.options.map((opt) => {
                if (typeof opt === "string") {
                  return opt;
                }
                return JSON.stringify(opt);
              });
            }
            return {
              id: q.id,
              question_text: q.question_text,
              options
            };
          }) ?? [];

        const limit = Math.min(
          maxQuestions,
          sessionData.total_questions,
          normalizedQuestions.length
        );

        setQuestions(normalizedQuestions.slice(0, limit));
        setSessionId(sessionData.session_id);
        setTotalQuestions(limit);
        setQuestionIndex(1);
        setCorrectAnswers(0);
        setIsCompleted(false);
      } catch (e) {
        if (isMounted) {
          setError("Failed to start quiz session");
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
  }, [user?.accessToken, quizId]);

  const [voiceRoomId, setVoiceRoomId] = useState<string | null>(null);
  const [isJoiningVoice, setIsJoiningVoice] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceParticipantsCount, setVoiceParticipantsCount] = useState(0);

  useEffect(() => {
    if (!selectedFriendId && friends.length > 0) {
      setSelectedFriendId(friends[0].user_id);
    }
  }, [friends, selectedFriendId]);

  const communicationStage: QuickChatStage | null = useMemo(() => {
    if (!communicationStatus) {
      return null;
    }
    return communicationStatus.communication_stage;
  }, [communicationStatus]);

  const {
    messages: quickChatMessages,
    isLoading: isLoadingQuickChatMessages,
    error: quickChatMessagesError
  } = useQuickChatMessages();

  const {
    events: quickChatEvents,
    isSending: isSendingQuickChat,
    sendError: quickChatSendError,
    sendQuickChat
  } = useQuickChatSession({
    quizId,
    sessionId,
    enabled: Boolean(user?.accessToken)
  });

  const quickChatMessagesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of quickChatMessages) {
      map.set(m.id, m.text);
    }
    return map;
  }, [quickChatMessages]);

  useEffect(() => {
    VoiceService.setParticipantChangeListener((payload) => {
      setVoiceParticipantsCount(payload.participantsCount);
    });

    return () => {
      VoiceService.setParticipantChangeListener(null);
    };
  }, []);

  const handleJoinVoice = async () => {
    if (!user?.accessToken || isJoiningVoice || isInVoice) {
      return;
    }

    if (!canUseVoiceChat || isLoadingCommunication) {
      return;
    }

    setIsJoiningVoice(true);
    setVoiceError(null);

    try {
      let currentVoiceRoomId = voiceRoomId;

      if (!currentVoiceRoomId) {
        const created = await post<CreateVoiceRoomResponse, {
          quiz_id: string;
        }>(
          "/voice/create-room",
          {
            quiz_id: quizId
          },
          user.accessToken
        );
        currentVoiceRoomId = created.voice_room_id;
        setVoiceRoomId(created.voice_room_id);
      }

      const joined = await post<JoinVoiceRoomResponse, {
        voice_room_id: string;
      }>(
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
      setIsMuted(false);
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
      setIsMuted(false);
      setVoiceParticipantsCount(0);
    } catch (e) {
      setVoiceError("Failed to leave voice room");
    } finally {
      setIsJoiningVoice(false);
    }
  };

  const handleToggleMute = async () => {
    if (!isInVoice) {
      return;
    }

    const nextMuted = !isMuted;
    try {
      await VoiceService.muteLocalAudio(nextMuted);
      setIsMuted(nextMuted);
    } catch (e) {
      setVoiceError("Failed to update mute state");
    }
  };

  const handleSendQuickChat = async (quickChatMessageId: string) => {
    if (!selectedFriendId || isSendingQuickChat) {
      return;
    }
    try {
      await sendQuickChat({
        quickChatMessageId,
        toUserId: selectedFriendId,
        context: "quiz_session"
      });
    } catch {
    }
  };

  const handleAnswer = async (selectedIndex: number) => {
    if (
      isCompleted ||
      isSubmitting ||
      !user?.accessToken ||
      !sessionId ||
      questions.length === 0
    ) {
      return;
    }

    const current = questions[questionIndex - 1];

    if (!current) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const answer = await post<AnswerResponse, {
        question_id: string;
        selected_option_index: number;
        question_index: number;
      }>(
        `/quizzes/${quizId}/session/${sessionId}/answer`,
        {
          question_id: current.id,
          selected_option_index: selectedIndex,
          question_index: questionIndex
        },
        user.accessToken
      );

      if (answer.correct) {
        setCorrectAnswers((prev) => prev + 1);
        setFeedback("Correct answer");
      } else {
        setFeedback("Incorrect answer");
      }

      setIsQuickChatOpen(false);

      await AdService.showQuizInterstitial(questionIndex, {
        quizId,
        sessionId,
        userId: user.id,
        accessToken: user.accessToken
      });

      if (questionIndex >= totalQuestions) {
        setIsCompleted(true);
      } else {
        setQuestionIndex(questionIndex + 1);
      }
    } catch (e) {
      setError("Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    if (!user?.accessToken || !sessionId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await post<CompleteSessionResponse, {
        correct_answers: number;
        total_questions: number;
      }>(
        `/quizzes/${quizId}/session/${sessionId}/complete`,
        {
          correct_answers: correctAnswers,
          total_questions: totalQuestions
        },
        user.accessToken
      );

      navigation.replace("QuizResult", {
        sessionId,
        quizId,
        finalScore: result.final_score,
        coinsEarned: result.coins_earned,
        coinsBalance: result.coins_balance,
        lifetimeEarnedCoins: result.lifetime_earned_coins
      });
    } catch (e) {
      setError("Failed to complete quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {!user?.accessToken && (
        <Text style={styles.body}>Sign in to play this quiz.</Text>
      )}
      {user?.accessToken && isLoading && (
        <ActivityIndicator size="large" />
      )}
      {user?.accessToken && !isLoading && error && (
        <Text style={styles.body}>{error}</Text>
      )}
      {user?.accessToken &&
        !isLoading &&
        !error &&
        questions.length > 0 &&
        !isCompleted && (
          <>
            <Text style={styles.title}>Quiz Session</Text>
            <Text style={styles.body}>
              Question {questionIndex} of {totalQuestions}
            </Text>
            <Text style={styles.questionText}>
              {questions[questionIndex - 1]?.question_text}
            </Text>
            {questions[questionIndex - 1]?.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                disabled={isSubmitting}
                onPress={() => handleAnswer(index)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
            {feedback && <Text style={styles.feedback}>{feedback}</Text>}
            {canUseQuickChat && (
              <View style={styles.quickChatBar}>
                <TouchableOpacity
                  style={styles.quickChatButton}
                  onPress={() => setIsQuickChatOpen((prev) => !prev)}
                  disabled={isLoadingQuickChatMessages}
                >
                  <Text style={styles.quickChatButtonText}>
                    {isQuickChatOpen ? "Close quick chat" : "Quick chat"}
                  </Text>
                </TouchableOpacity>
                {communicationStage === "VOICE_ENABLED" && (
                  <Text style={styles.quickChatStageLabel}>Voice unlocked</Text>
                )}
                {communicationStage === "CUSTOM_TEXT" && (
                  <Text style={styles.quickChatStageLabel}>Custom text stage</Text>
                )}
              </View>
            )}
            {isQuickChatOpen && (
              <View style={styles.quickChatPanel}>
                {isLoadingQuickChatMessages && (
                  <Text style={styles.body}>Loading quick chat messages...</Text>
                )}
                {quickChatMessagesError && (
                  <Text style={styles.body}>{quickChatMessagesError}</Text>
                )}
                {!isLoadingQuickChatMessages &&
                  !quickChatMessagesError &&
                  friends.length === 0 && (
                    <Text style={styles.body}>
                      Add friends to use quick chat.
                    </Text>
                  )}
                {!isLoadingQuickChatMessages &&
                  !quickChatMessagesError &&
                  friends.length > 0 && (
                    <>
                      <Text style={styles.body}>Choose friend</Text>
                      <View style={styles.quickChatFriendRow}>
                        {friends.map((friend) => (
                          <TouchableOpacity
                            key={friend.user_id}
                            style={[
                              styles.quickChatFriendButton,
                              selectedFriendId === friend.user_id &&
                                styles.quickChatFriendButtonSelected
                            ]}
                            onPress={() => setSelectedFriendId(friend.user_id)}
                          >
                            <Text style={styles.quickChatFriendButtonText}>
                              {friend.username || "Friend"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.quickChatMessagesRow}>
                        {quickChatMessages.map((message) => (
                          <TouchableOpacity
                            key={message.id}
                            style={styles.quickChatMessageButton}
                            disabled={
                              isSendingQuickChat || !selectedFriendId
                            }
                            onPress={() => handleSendQuickChat(message.id)}
                          >
                            <Text style={styles.quickChatMessageText}>
                              {message.text}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {isSendingQuickChat && (
                        <Text style={styles.body}>Sending...</Text>
                      )}
                      {quickChatSendError && (
                        <Text style={styles.body}>{quickChatSendError}</Text>
                      )}
                    </>
                  )}
              </View>
            )}
            {quickChatEvents.length > 0 && (
              <View style={styles.quickChatEventsContainer}>
                {quickChatEvents.map((event) => (
                  <View key={event.id} style={styles.quickChatEventBubble}>
                    <Text style={styles.quickChatEventText}>
                      {quickChatMessagesById.get(
                        event.quick_chat_message_id
                      ) || "Message"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.voiceBar}>
              {isLoadingCommunication && (
                <Text style={styles.body}>Checking voice chat status...</Text>
              )}
              {!isLoadingCommunication &&
                communicationStatus &&
                !communicationStatus.can_use_voice_chat && (
                  <Text style={styles.body}>
                    Voice chat locked. Watch{" "}
                    {communicationStatus.ads_needed_for_voice_chat} more ads to
                    unlock.
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
                      onPress={handleToggleMute}
                    >
                      <Text style={styles.voiceButtonText}>
                        {isMuted ? "Unmute" : "Mute"}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.body}>
                      Participants: {voiceParticipantsCount}
                    </Text>
                  </View>
                )}
              {voiceError && <Text style={styles.body}>{voiceError}</Text>}
            </View>
          </>
        )}
      {user?.accessToken && !isLoading && !error && isCompleted && (
        <>
          <Text style={styles.title}>Quiz Completed</Text>
          <Text style={styles.body}>
            Correct answers: {correctAnswers} of {totalQuestions}
          </Text>
          <Button
            title={isSubmitting ? "Finishing..." : "Finish quiz"}
            onPress={handleFinish}
            disabled={isSubmitting}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12
  },
  body: {
    fontSize: 16,
    marginBottom: 8
  },
  questionText: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: "center"
  },
  optionButton: {
    alignSelf: "stretch",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    marginBottom: 8
  },
  optionText: {
    fontSize: 16
  },
  feedback: {
    marginTop: 12,
    fontSize: 16,
    textAlign: "center"
  },
  voiceBar: {
    marginTop: 16,
    alignSelf: "stretch",
    alignItems: "center"
  },
  voiceControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginTop: 8
  },
  voiceButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: "#007bff",
    marginRight: 8
  },
  voiceButtonDisabled: {
    backgroundColor: "#999999"
  },
  voiceButtonText: {
    color: "#ffffff",
    fontSize: 14
  },
  quickChatBar: {
    marginTop: 12,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  quickChatButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: "#28a745"
  },
  quickChatButtonText: {
    color: "#ffffff",
    fontSize: 14
  },
  quickChatStageLabel: {
    fontSize: 12
  },
  quickChatPanel: {
    marginTop: 12,
    alignSelf: "stretch",
    padding: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc"
  },
  quickChatFriendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 8
  },
  quickChatFriendButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#007bff",
    marginRight: 8,
    marginBottom: 8
  },
  quickChatFriendButtonSelected: {
    backgroundColor: "#007bff"
  },
  quickChatFriendButtonText: {
    fontSize: 14,
    color: "#007bff"
  },
  quickChatMessagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4
  },
  quickChatMessageButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#f1f1f1",
    marginRight: 8,
    marginBottom: 8
  },
  quickChatMessageText: {
    fontSize: 14
  },
  quickChatEventsContainer: {
    marginTop: 12,
    alignSelf: "stretch",
    maxHeight: 150
  },
  quickChatEventBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#e0f7fa",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4
  },
  quickChatEventText: {
    fontSize: 14
  }
});
