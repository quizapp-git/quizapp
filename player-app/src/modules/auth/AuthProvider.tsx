import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

export type AuthUser = {
  id: string;
  email?: string;
  accessToken?: string;
} | null;

type AuthContextValue = {
  user: AuthUser;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      const session = data.session;
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
          accessToken: session.access_token
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    init();

    const {
      data: subscription
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
          accessToken: session.access_token
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        throw error;
      }
      const session = data.session;
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
          accessToken: session.access_token
        });
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
