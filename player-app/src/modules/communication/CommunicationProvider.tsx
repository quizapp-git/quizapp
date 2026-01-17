import React, { useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/hooks";
import { get } from "../api/client";

export type CommunicationStage = "PRESET_ONLY" | "CUSTOM_TEXT" | "VOICE_ENABLED";

export type CommunicationStatus = {
  total_ads_viewed: number;
  communication_stage: CommunicationStage;
  can_use_preset_quick_chat: boolean;
  can_use_custom_text_chat: boolean;
  can_use_voice_chat: boolean;
  text_preset_only_max_ads: number;
  text_custom_min_ads: number;
  voice_chat_min_ads: number;
  ads_needed_for_custom_text: number;
  ads_needed_for_voice_chat: number;
};

type CommunicationContextValue = {
  status: CommunicationStatus | null;
  isLoading: boolean;
  error: string | null;
  canUseQuickChat: boolean;
  canUseCustomTextChat: boolean;
  canUseVoiceChat: boolean;
  refetch: () => void;
};

const CommunicationContext =
  React.createContext<CommunicationContextValue | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export function CommunicationProvider({ children }: Props) {
  const { user } = useAuth();
  const accessToken = user?.accessToken;

  const query = useQuery<CommunicationStatus | null, Error>({
    queryKey: ["communicationStatus", user?.id],
    queryFn: async () => {
      if (!accessToken) {
        return null;
      }
      return get<CommunicationStatus>("/communication/status", accessToken);
    },
    enabled: Boolean(user)
  });

  const value = useMemo<CommunicationContextValue>(() => {
    const status = query.data ?? null;
    const canUseQuickChat =
      !status || status.can_use_preset_quick_chat;
    const canUseCustomTextChat =
      status?.can_use_custom_text_chat ?? false;
    const canUseVoiceChat = status?.can_use_voice_chat ?? false;

    return {
      status,
      isLoading: query.isLoading,
      error: query.error ? query.error.message : null,
      canUseQuickChat,
      canUseCustomTextChat,
      canUseVoiceChat,
      refetch: query.refetch
    };
  }, [query.data, query.isLoading, query.error, query.refetch]);

  return (
    <CommunicationContext.Provider value={value}>
      {children}
    </CommunicationContext.Provider>
  );
}

export function useCommunication() {
  const ctx = useContext(CommunicationContext);
  if (!ctx) {
    throw new Error("useCommunication must be used within CommunicationProvider");
  }
  return ctx;
}

