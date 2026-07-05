import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  border: string;
  borderLight: string;
  card: string;
  cardElevated: string;
  error: string;
  errorLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
  inputBackground: string;
  placeholder: string;
  shadow: string;
  overlay: string;
  gradientStart: string;
  gradientEnd: string;
  divider: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const lightColors: ThemeColors = {
  background: '#F2F4F7',
  surface: '#FFFFFF',
  text: '#1D2129',
  textSecondary: '#7D8490',
  textTertiary: '#9CA3AF',
  primary: '#4F60E8',
  primaryLight: '#EDEFFD',
  primaryDark: '#3B49D0',
  border: '#DEE0E6',
  borderLight: '#EEF0F4',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  error: '#F53F3F',
  errorLight: '#FFF0F0',
  success: '#00B42A',
  successLight: '#E8FFEA',
  warning: '#FF7D00',
  warningLight: '#FFF7E8',
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#4F60E8',
  tabBarInactive: '#9CA3AF',
  inputBackground: '#F2F4F7',
  placeholder: '#9CA3AF',
  shadow: 'rgba(0, 0, 0, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.45)',
  gradientStart: '#4F60E8',
  gradientEnd: '#6C52E8',
  divider: '#E8EAF0',
};

const darkColors: ThemeColors = {
  background: '#0D0D0F',
  surface: '#1A1A1F',
  text: '#F0F1F3',
  textSecondary: '#8A8F9A',
  textTertiary: '#5A5F6A',
  primary: '#7C8AFF',
  primaryLight: '#1E2040',
  primaryDark: '#9DA6FF',
  border: '#2A2A32',
  borderLight: '#1F1F27',
  card: '#1A1A1F',
  cardElevated: '#222228',
  error: '#F76965',
  errorLight: '#2D1A1A',
  success: '#3CC474',
  successLight: '#1A2D1F',
  warning: '#FF9A4D',
  warningLight: '#2D241A',
  tabBarBackground: '#1A1A1F',
  tabBarActive: '#7C8AFF',
  tabBarInactive: '#5A5F6A',
  inputBackground: '#141418',
  placeholder: '#5A5F6A',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  gradientStart: '#7C8AFF',
  gradientEnd: '#A78BFA',
  divider: '#22222B',
};

const THEME_STORAGE_KEY = '@keep_accounts_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      } else if (systemColorScheme) {
        setThemeState(systemColorScheme);
      }
    } catch {
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'dark' ? darkColors : lightColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { lightColors, darkColors };
export type { ThemeColors, ThemeMode };
