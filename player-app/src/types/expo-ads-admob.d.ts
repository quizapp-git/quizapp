declare module "expo-ads-admob" {
  export const AdMobInterstitial: {
    setAdUnitID(adUnitId: string): void;
    requestAdAsync(options?: { servePersonalizedAds?: boolean }): Promise<void>;
    showAdAsync(): Promise<void>;
  };
}

