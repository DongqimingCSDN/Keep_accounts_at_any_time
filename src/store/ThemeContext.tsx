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
}

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const lightColors: ThemeColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  text: '#1D2129',
  textSecondary: '#86909C',
  textTertiary: '#C9CDD4',
  primary: '#5B6CF7',
  primaryLight: '#F0F1FE',
  primaryDark: '#4250D4',
  border: '#E5E6EB',
  borderLight: '#F2F3F5',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  error: '#F53F3F',
  errorLight: '#FFF0F0',
  success: '#00B42A',
  successLight: '#E8FFEA',
  warning: '#FF7D00',
  warningLight: '#FFF7E8',
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#5B6CF7',
  tabBarInactive: '#C9CDD4',
  inputBackground: '#F7F8FA',
  placeholder: '#C9CDD4',
  shadow: 'rgba(0, 0, 0, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.45)',
  gradientStart: '#5B6CF7',
  gradientEnd: '#8B5CF6',
};

const darkColors: ThemeColors = {
  background: '#0D0D0F',
  surface: '#1A1A1F',
  text: '#F0F1F3',
  textSecondary: '#8A8F9A',
  textTertiary: '#4E5460',
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
  tabBarInactive: '#4E5460',
  inputBackground: '#141418',
  placeholder: '#4E5460',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  gradientStart: '#7C8AFF',
  gradientEnd: '#A78BFA',
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
