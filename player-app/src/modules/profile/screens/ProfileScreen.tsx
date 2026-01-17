import React, { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../../navigation/ProfileStack";
import { useAuth } from "../../auth/hooks";
import { get } from "../../api/client";
import { useLeaderboard } from "../../leaderboard/hooks";

type Props = NativeStackScreenProps<ProfileStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    profile: {
      email: string;
      display_name: string | null;
      full_name: string | null;
      city: string | null;
      country: string | null;
    };
    stats: {
      total_quizzes_played: number;
      total_quizzes_won: number;
      total_gold_won: number;
      lifetime_income_pkr: number;
      current_balance_coins: number;
      current_balance_pkr: number;
    } | null;
    badges: {
      count: number;
    };
    ratings: {
      average: number;
      count: number;
    };
    communication?: {
      total_ads_viewed: number;
      communication_stage: "PRESET_ONLY" | "CUSTOM_TEXT" | "VOICE_ENABLED";
      can_use_preset_quick_chat: boolean;
      can_use_custom_text_chat: boolean;
      can_use_voice_chat: boolean;
      text_preset_only_max_ads: number;
      text_custom_min_ads: number;
      voice_chat_min_ads: number;
      ads_needed_for_custom_text: number;
      ads_needed_for_voice_chat: number;
    };
  } | null>(null);

  const {
    currentUserRank: allTimeRank,
    isLoading: isLoadingAllTime
  } = useLeaderboard({ period: "all_time", limit: 100 });

  const {
    currentUserRank: weeklyRank,
    isLoading: isLoadingWeekly
  } = useLeaderboard({ period: "weekly", limit: 100 });

  useEffect(() => {
    if (!user?.accessToken) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await get<{
          profile: {
            email: string;
            display_name: string | null;
            full_name: string | null;
            city: string | null;
            country: string | null;
          };
          stats: {
            total_quizzes_played: number;
            total_quizzes_won: number;
            total_gold_won: number;
            lifetime_income_pkr: number;
            current_balance_coins: number;
            current_balance_pkr: number;
          } | null;
          badges: {
            count: number;
          };
          ratings: {
            average: number;
            count: number;
          };
        }>("/profile/me", user.accessToken);
        if (isMounted) {
          setProfile(data);
        }
      } catch (e) {
        if (isMounted) {
          setError("Failed to load profile");
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
  }, [user?.accessToken]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {!user?.accessToken && (
        <Text style={styles.body}>Sign in to view your profile.</Text>
      )}
      {user?.accessToken && isLoading && (
        <Text style={styles.body}>Loading profile...</Text>
      )}
      {user?.accessToken && error && (
        <Text style={styles.body}>{error}</Text>
      )}
      {user?.accessToken && profile && !isLoading && !error && (
        <View style={styles.card}>
          <Text style={styles.body}>
            {profile.profile.display_name || profile.profile.full_name || "Player"}
          </Text>
          <Text style={styles.body}>{profile.profile.email}</Text>
          {profile.profile.city && profile.profile.country && (
            <Text style={styles.body}>
              {profile.profile.city}, {profile.profile.country}
            </Text>
          )}
          {profile.ratings.count > 0 && (
            <Text style={styles.body}>
              Rating: {profile.ratings.average.toFixed(1)} ({profile.ratings.count})
            </Text>
          )}
          {profile.stats && (
            <>
              <Text style={styles.body}>
                Coins: {profile.stats.current_balance_coins.toLocaleString()}
              </Text>
              <Text style={styles.body}>
                PKR: {profile.stats.current_balance_pkr.toLocaleString()}
              </Text>
              <Text style={styles.body}>
                Quizzes: {profile.stats.total_quizzes_played} • Wins:{" "}
                {profile.stats.total_quizzes_won}
              </Text>
            </>
          )}
          {profile.communication && (
            <>
              <Text style={styles.body}>
                Communication stage:{" "}
                {profile.communication.communication_stage === "PRESET_ONLY"
                  ? "Stage 1: Quick chat only"
                  : profile.communication.communication_stage === "CUSTOM_TEXT"
                    ? "Stage 2: Custom text chat"
                    : "Stage 3: Voice chat enabled"}
              </Text>
              <Text style={styles.body}>
                Total ads viewed:{" "}
                {profile.communication.total_ads_viewed.toLocaleString()}
              </Text>
              <Text style={styles.body}>
                Ads needed for custom text chat:{" "}
                {profile.communication.ads_needed_for_custom_text}
              </Text>
              <Text style={styles.body}>
                Ads needed for voice chat:{" "}
                {profile.communication.ads_needed_for_voice_chat}
              </Text>
            </>
          )}
        </View>
      )}
      {user?.accessToken && !isLoading && !error && (
        <View style={styles.card}>
          <Text style={styles.body}>Leaderboard</Text>
          {isLoadingAllTime || isLoadingWeekly ? (
            <Text style={styles.body}>Loading ranks...</Text>
          ) : (
            <>
              <Text style={styles.body}>
                All-time rank:{" "}
                {typeof allTimeRank === "number"
                  ? `#${allTimeRank}`
                  : "Not ranked yet"}
              </Text>
              <Text style={styles.body}>
                Weekly rank:{" "}
                {typeof weeklyRank === "number"
                  ? `#${weeklyRank}`
                  : "Keep playing to appear this week"}
              </Text>
            </>
          )}
        </View>
      )}
      <Button
        title="Settings"
        onPress={() => navigation.navigate("Settings")}
      />
      <Button
        title="View leaderboard"
        onPress={() => {
          const parent = (navigation as any).getParent?.();
          parent?.navigate("LeaderboardTab");
        }}
      />
      <Button
        title="Manage Payout Methods"
        onPress={() => navigation.navigate("PayoutMethods")}
      />
      <Button title="Help" onPress={() => navigation.navigate("Help")} />
      <Button title="Sign out" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16
  },
  body: {
    fontSize: 16,
    marginBottom: 4
  },
  card: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 16,
    width: "100%"
  }
});
