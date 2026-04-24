import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useRNColorScheme, type ColorSchemeName } from 'react-native';

type StudioThemeContextValue = {
  colorScheme: NonNullable<ColorSchemeName>;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: NonNullable<ColorSchemeName>) => void;
};

const StudioThemeContext = createContext<StudioThemeContextValue | null>(null);

export function StudioThemeProvider({ children }: { children: ReactNode }) {
  const nativeColorScheme = useRNColorScheme();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [colorScheme, setColorScheme] = useState<NonNullable<ColorSchemeName>>('dark');

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (hasHydrated && nativeColorScheme) {
      setColorScheme(nativeColorScheme);
    }
  }, [hasHydrated, nativeColorScheme]);

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
      toggleColorScheme: () => setColorScheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [colorScheme],
  );

  return <StudioThemeContext.Provider value={value}>{children}</StudioThemeContext.Provider>;
}

export function useColorScheme() {
  return useContext(StudioThemeContext)?.colorScheme ?? 'dark';
}

export function useStudioThemeControls() {
  const context = useContext(StudioThemeContext);
  if (!context) {
    return {
      colorScheme: 'dark' as const,
      toggleColorScheme: () => {},
      setColorScheme: () => {},
    };
  }

  return context;
}
