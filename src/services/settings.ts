import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@photo_advisor_settings';

export interface AppSettings {
  voiceEnabled: boolean;
  theme: 'dark' | 'light';
}

const DEFAULT_SETTINGS: AppSettings = {
  voiceEnabled: false,
  theme: 'dark',
};

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await loadAppSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
