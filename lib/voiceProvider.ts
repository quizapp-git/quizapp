export type VoiceTokenResult = {
  provider: string;
  channelName: string;
  token: string;
  expiresAt: string;
};

function getProvider(): string {
  const value = process.env.VOICE_PROVIDER;
  if (!value || value.trim().length === 0) {
    return "stub";
  }
  return value.trim();
}

function createRandomToken(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

type CreateVoiceTokenParams = {
  roomId: string;
  roomCode: string;
  userId: string;
};

export async function createVoiceTokenForRoom(
  params: CreateVoiceTokenParams
): Promise<VoiceTokenResult> {
  const provider = getProvider();
  const appId = process.env.VOICE_APP_ID ?? "";
  const apiKey = process.env.VOICE_API_KEY ?? "";
  const apiSecret = process.env.VOICE_API_SECRET ?? "";
  const channelName = params.roomCode || params.roomId;
  const now = Date.now();
  const baseLength = provider === "stub" ? 32 : 64;
  const hasConfiguredProvider =
    appId.length > 0 || apiKey.length > 0 || apiSecret.length > 0;
  const tokenLength = hasConfiguredProvider ? baseLength : 32;
  const token = createRandomToken(tokenLength);
  const expiresAt = new Date(now + 60 * 60 * 1000).toISOString();
  return {
    provider,
    channelName,
    token,
    expiresAt
  };
}
