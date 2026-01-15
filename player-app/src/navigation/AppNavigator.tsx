import React from "react";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
import { useAuth } from "../modules/auth/hooks";
import { SplashScreen } from "../modules/auth/screens/SplashScreen";

export function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthStack />;
  }

  return <MainTabs />;
}

