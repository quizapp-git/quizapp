import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/modules/auth/AuthProvider";
import { CommunicationProvider } from "./src/modules/communication/CommunicationProvider";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CommunicationProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </CommunicationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
