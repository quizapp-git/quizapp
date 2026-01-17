export type VoiceJoinParams = {
  provider: string;
  channelName: string;
  token: string;
  userId: string;
};

type ParticipantChangePayload = {
  participantsCount: number;
};

type ParticipantChangeListener = (payload: ParticipantChangePayload) => void;

class VoiceServiceClass {
  private isJoined = false;

  private isMuted = false;

  private participantsCount = 0;

  private listener: ParticipantChangeListener | null = null;

  setParticipantChangeListener(listener: ParticipantChangeListener | null) {
    this.listener = listener;
    if (listener) {
      listener({ participantsCount: this.participantsCount });
    }
  }

  async joinChannel(params: VoiceJoinParams): Promise<void> {
    if (this.isJoined) {
      return;
    }
    this.isJoined = true;
    this.isMuted = false;
    this.participantsCount = Math.max(this.participantsCount, 1);
    if (this.listener) {
      this.listener({ participantsCount: this.participantsCount });
    }
  }

  async leaveChannel(): Promise<void> {
    if (!this.isJoined) {
      return;
    }
    this.isJoined = false;
    this.isMuted = false;
    this.participantsCount = 0;
    if (this.listener) {
      this.listener({ participantsCount: this.participantsCount });
    }
  }

  async muteLocalAudio(muted: boolean): Promise<void> {
    this.isMuted = muted;
  }

  getState() {
    return {
      isJoined: this.isJoined,
      isMuted: this.isMuted,
      participantsCount: this.participantsCount
    };
  }
}

export const VoiceService = new VoiceServiceClass();

