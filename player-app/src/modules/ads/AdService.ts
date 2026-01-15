export type AdResult = {
  shown: boolean;
};

class AdServiceClass {
  async showQuizInterstitial(questionIndex: number): Promise<AdResult> {
    return {
      shown: false
    };
  }
}

export const AdService = new AdServiceClass();

