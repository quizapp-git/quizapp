import type { SupabaseClient } from "@supabase/supabase-js";

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

function getThreshold(envValue: string | undefined, fallback: number): number {
  if (!envValue) {
    return fallback;
  }
  const parsed = Number.parseInt(envValue, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function getThresholdFromConfig(
  configValue: unknown,
  envValue: string | undefined,
  fallback: number
): number {
  if (typeof configValue === "number") {
    if (Number.isFinite(configValue) && configValue >= 0) {
      return configValue;
    }
  } else if (typeof configValue === "string" && configValue.length > 0) {
    const parsed = Number.parseInt(configValue, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return getThreshold(envValue, fallback);
}

export async function getCommunicationStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<CommunicationStatus> {
  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "communication_policy")
    .maybeSingle();

  const config =
    settingsRow && settingsRow.value && typeof settingsRow.value === "object"
      ? (settingsRow.value as Record<string, unknown>)
      : null;

  const textPresetOnlyMaxAds = getThresholdFromConfig(
    config?.text_preset_only_max_ads,
    process.env.TEXT_PRESET_ONLY_MAX_ADS,
    99
  );
  const textCustomMinAds = getThresholdFromConfig(
    config?.text_custom_min_ads,
    process.env.TEXT_CUSTOM_MIN_ADS,
    100
  );
  const voiceChatMinAds = getThresholdFromConfig(
    config?.voice_chat_min_ads,
    process.env.VOICE_CHAT_MIN_ADS,
    500
  );

  const { count, error } = await supabase
    .from("ad_impressions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const totalAdsViewed =
    error || typeof count !== "number" || count < 0 ? 0 : count;

  let stage: CommunicationStage = "PRESET_ONLY";

  if (totalAdsViewed >= voiceChatMinAds) {
    stage = "VOICE_ENABLED";
  } else if (totalAdsViewed >= textCustomMinAds) {
    stage = "CUSTOM_TEXT";
  }

  const { data: overrideRow } = await supabase
    .from("user_communication_overrides")
    .select("forced_stage,expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (overrideRow) {
    const rawStage = (overrideRow as any).forced_stage;
    const forcedStage =
      rawStage === "PRESET_ONLY" ||
      rawStage === "CUSTOM_TEXT" ||
      rawStage === "VOICE_ENABLED"
        ? (rawStage as CommunicationStage)
        : null;

    let isActive = true;
    const rawExpiresAt = (overrideRow as any).expires_at as string | null;
    if (rawExpiresAt) {
      const expiresAt = new Date(rawExpiresAt);
      if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) {
        isActive = false;
      }
    }

    if (forcedStage && isActive) {
      stage = forcedStage;
    }
  }

  const canUsePresetQuickChat = true;
  const canUseCustomTextChat =
    stage === "CUSTOM_TEXT" || stage === "VOICE_ENABLED";
  const canUseVoiceChat = stage === "VOICE_ENABLED";

  const adsNeededForCustomText =
    canUseCustomTextChat || textCustomMinAds <= 0
      ? 0
      : Math.max(textCustomMinAds - totalAdsViewed, 0);

  const adsNeededForVoiceChat =
    canUseVoiceChat || voiceChatMinAds <= 0
      ? 0
      : Math.max(voiceChatMinAds - totalAdsViewed, 0);

  return {
    total_ads_viewed: totalAdsViewed,
    communication_stage: stage,
    can_use_preset_quick_chat: canUsePresetQuickChat,
    can_use_custom_text_chat: canUseCustomTextChat,
    can_use_voice_chat: canUseVoiceChat,
    text_preset_only_max_ads: textPresetOnlyMaxAds,
    text_custom_min_ads: textCustomMinAds,
    voice_chat_min_ads: voiceChatMinAds,
    ads_needed_for_custom_text: adsNeededForCustomText,
    ads_needed_for_voice_chat: adsNeededForVoiceChat
  };
}
