import { Platform } from "react-native";
import { get, post } from "../api/client";

export type AdProviderName = "ADMOB" | "META" | "UNITY" | "APPLOVIN";

export type AdPlacement = "QUIZ_AFTER_QUESTION" | "HOME_BANNER" | "BONUS_REWARD";

export type AdType = "INTERSTITIAL" | "REWARDED" | "BANNER";

export type AdResult = {
  shown: boolean;
  provider: AdProviderName | null;
  adType: AdType;
  placement: AdPlacement;
  error?: string | null;
};

type AdsConfigProvider = {
  provider: AdProviderName;
  is_enabled: boolean;
  weight: number;
  platform: "android" | "ios" | "both";
  environment: "dev" | "staging" | "prod";
  ad_unit_interstitial: string | null;
  ad_unit_rewarded: string | null;
  ad_unit_banner: string | null;
};

type AdsConfigResponse = {
  ads_enabled: boolean;
  max_ads_per_quiz_session: number;
  show_ad_after_every_question: boolean;
  providers: AdsConfigProvider[];
};

type ShowQuizInterstitialContext = {
  quizId: string;
  sessionId: string | null;
  userId?: string;
  accessToken?: string;
};

type AdsImpressionBody = {
  provider: AdProviderName;
  ad_type: AdType;
  placement: AdPlacement;
  quiz_id: string;
  session_id: string;
  question_index: number;
};

type AdsImpressionResponse = {
  recorded: boolean;
};

type AdProvider = {
  name: AdProviderName;
  initialize(configs: AdsConfigProvider[]): Promise<void>;
  preloadInterstitial(
    placement: AdPlacement,
    adUnitId: string
  ): Promise<void>;
  showInterstitial(
    placement: AdPlacement,
    adUnitId: string
  ): Promise<AdResult>;
};

class AdMobProvider implements AdProvider {
  name: AdProviderName = "ADMOB";

  private isInitialized = false;

  private hasPreloadedInterstitial = false;

  private isNativeModuleAvailable = false;

  private nativeModule: any = null;

  private async ensureNativeModule(adUnitId: string) {
    if (this.nativeModule) {
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("expo-ads-admob");
      const interstitial = mod?.AdMobInterstitial;
      if (interstitial && typeof interstitial.setAdUnitID === "function") {
        interstitial.setAdUnitID(adUnitId);
      }
      this.nativeModule = mod;
      this.isNativeModuleAvailable = true;
    } catch {
      this.nativeModule = null;
      this.isNativeModuleAvailable = false;
    }
  }

  async initialize(configs: AdsConfigProvider[]): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
  }

  async preloadInterstitial(
    placement: AdPlacement,
    adUnitId: string
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize([]);
    }
    if (this.hasPreloadedInterstitial) {
      return;
    }
    await this.ensureNativeModule(adUnitId);
    if (!this.isNativeModuleAvailable) {
      return;
    }
    try {
      const interstitial = this.nativeModule.AdMobInterstitial;
      if (
        interstitial &&
        typeof interstitial.requestAdAsync === "function"
      ) {
        await interstitial.requestAdAsync({
          servePersonalizedAds: true
        });
      }
      this.hasPreloadedInterstitial = true;
    } catch {
      this.hasPreloadedInterstitial = false;
    }
  }

  async showInterstitial(
    placement: AdPlacement,
    adUnitId: string
  ): Promise<AdResult> {
    if (!this.isInitialized) {
      await this.initialize([]);
    }
    await this.ensureNativeModule(adUnitId);
    const result: AdResult = {
      shown: false,
      provider: this.name,
      adType: "INTERSTITIAL",
      placement,
      error: null
    };
    if (!this.isNativeModuleAvailable || !this.nativeModule) {
      result.error = "AdMob module not available";
      return result;
    }
    try {
      const interstitial = this.nativeModule.AdMobInterstitial;
      if (
        interstitial &&
        typeof interstitial.showAdAsync === "function"
      ) {
        await interstitial.showAdAsync();
        result.shown = true;
        return result;
      }
      result.error = "AdMob interstitial not available";
      return result;
    } catch (error: any) {
      result.error = error?.message || "Failed to show AdMob interstitial";
      return result;
    }
  }
}

class AdServiceClass {
  private config: AdsConfigResponse | null = null;

  private configPromise: Promise<AdsConfigResponse | null> | null = null;

  private provider: AdProvider | null = null;

  private async loadConfig(
    accessToken?: string
  ): Promise<AdsConfigResponse | null> {
    if (this.config) {
      return this.config;
    }
    if (!this.configPromise) {
      this.configPromise = this.fetchConfig(accessToken).catch(() => null);
    }
    const value = await this.configPromise;
    this.config = value;
    return value;
  }

  private async fetchConfig(
    accessToken?: string
  ): Promise<AdsConfigResponse> {
    try {
      const config = await get<AdsConfigResponse>("/ads/config", accessToken);
      return config;
    } catch {
      const provider: AdsConfigProvider = {
        provider: "ADMOB",
        is_enabled: true,
        weight: 100,
        platform: "both",
        environment:
          process.env.APP_ENV === "production" ||
          process.env.NODE_ENV === "production"
            ? "prod"
            : "dev",
        ad_unit_interstitial: null,
        ad_unit_rewarded: null,
        ad_unit_banner: null
      };
      return {
        ads_enabled: true,
        max_ads_per_quiz_session: 10,
        show_ad_after_every_question: true,
        providers: [provider]
      };
    }
  }

  private selectProvider(config: AdsConfigResponse): AdsConfigProvider | null {
    const platform: "android" | "ios" =
      Platform.OS === "ios" ? "ios" : "android";
    const enabled = config.providers.filter((provider) => {
      if (!provider.is_enabled) {
        return false;
      }
      if (
        provider.platform !== "both" &&
        provider.platform !== platform
      ) {
        return false;
      }
      if (!provider.ad_unit_interstitial) {
        return false;
      }
      return true;
    });
    if (!enabled.length) {
      return null;
    }
    return enabled[0];
  }

  private ensureProvider(): AdProvider {
    if (this.provider) {
      return this.provider;
    }
    this.provider = new AdMobProvider();
    return this.provider;
  }

  async showQuizInterstitial(
    questionIndex: number,
    context?: ShowQuizInterstitialContext
  ): Promise<AdResult> {
    const defaultResult: AdResult = {
      shown: false,
      provider: null,
      adType: "INTERSTITIAL",
      placement: "QUIZ_AFTER_QUESTION",
      error: null
    };
    const config = await this.loadConfig(context?.accessToken);
    if (!config || !config.ads_enabled) {
      return defaultResult;
    }
    if (!config.show_ad_after_every_question) {
      return defaultResult;
    }
    if (
      questionIndex < 1 ||
      questionIndex > config.max_ads_per_quiz_session
    ) {
      return defaultResult;
    }
    const providerConfig = this.selectProvider(config);
    if (!providerConfig || !providerConfig.ad_unit_interstitial) {
      return defaultResult;
    }
    const provider = this.ensureProvider();
    await provider.initialize(config.providers);
    await provider.preloadInterstitial(
      "QUIZ_AFTER_QUESTION",
      providerConfig.ad_unit_interstitial
    );
    const result = await provider.showInterstitial(
      "QUIZ_AFTER_QUESTION",
      providerConfig.ad_unit_interstitial
    );
    if (
      result.shown &&
      context &&
      context.quizId &&
      context.sessionId &&
      context.accessToken
    ) {
      const body: AdsImpressionBody = {
        provider: providerConfig.provider,
        ad_type: "INTERSTITIAL",
        placement: "QUIZ_AFTER_QUESTION",
        quiz_id: context.quizId,
        session_id: context.sessionId,
        question_index: questionIndex
      };
      try {
        await post<AdsImpressionResponse, AdsImpressionBody>(
          "/ads/impression",
          body,
          context.accessToken
        );
      } catch {
      }
    }
    return result;
  }
}

export const AdService = new AdServiceClass();

