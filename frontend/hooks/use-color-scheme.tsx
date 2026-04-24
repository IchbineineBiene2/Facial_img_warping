import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useNativeColorScheme, type ColorSchemeName } from 'react-native';

type StudioThemeContextValue = {
  colorScheme: NonNullable<ColorSchemeName>;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: NonNullable<ColorSchemeName>) => void;
};

const StudioThemeContext = createContext<StudioThemeContextValue | null>(null);

export function StudioThemeProvider({ children }: { children: ReactNode }) {
  const nativeColorScheme = useNativeColorScheme();
  const [colorScheme, setColorScheme] = useState<NonNullable<ColorSchemeName>>(nativeColorScheme ?? 'dark');

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
  return useContext(StudioThemeContext)?.colorScheme ?? useNativeColorScheme();
}

export function useStudioThemeControls() {
  const context = useContext(StudioThemeContext);
  if (!context) {
    return {
      colorScheme: useNativeColorScheme() ?? 'dark',
      toggleColorScheme: () => {},
      setColorScheme: () => {},
    };
  }

  return context;
}
