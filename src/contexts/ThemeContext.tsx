import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadAppSettings, saveAppSettings } from '../services/settings';
import { DarkColors, LightColors, ColorPalette } from '../theme/colors';

interface ThemeContextValue {
  theme: 'dark' | 'light';
  colors: ColorPalette;
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  toggleTheme: () => Promise<void>;
}

// Default context value — used when no ThemeProvider is present (e.g. in tests)
const defaultValue: ThemeContextValue = {
  theme: 'dark',
  colors: DarkColors,
  setTheme: async () => {},
  toggleTheme: async () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    loadAppSettings().then((settings) => {
      setThemeState(settings.theme);
    });
  }, []);

  const setTheme = useCallback(async (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    await saveAppSettings({ theme: newTheme });
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    await setTheme(next);
  }, [theme, setTheme]);

  const colors = theme === 'dark' ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
