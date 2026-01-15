import React, { useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  email?: string;
} | null;

type AuthContextValue = {
  user: AuthUser;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
};

export const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

type Props = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<AuthUser>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const signIn = () => {
    setUser({ id: "demo-user" });
  };

  const signOut = () => {
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signOut
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

