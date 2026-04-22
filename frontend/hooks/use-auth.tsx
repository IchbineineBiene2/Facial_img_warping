import { createContext, useContext, useMemo, useState } from 'react';

type AuthContextValue = {
  userName: string | null;
  signIn: (name: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [userName, setUserName] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      userName,
      signIn: (name: string) => setUserName(name.trim()),
      signOut: () => setUserName(null),
    }),
    [userName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
