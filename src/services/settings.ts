import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AppSettings,
  GridVariant,
  TimerDuration,
  ImageQualityPreset,
  FocusPeakingSensitivity,
} from '../types';

const STORAGE_KEY = '@photo_advisor_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  voiceEnabled: false,
  theme: 'dark',
  timerDuration: 3,
  defaultGridVariant: 'thirds',
  showHistogram: false,
  showLevel: true,
  showFocusPeaking: false,
  showSunPosition: false,
  showFocusGuide: true,
  showBubbleChat: true,
  showShakeDetector: false,
  showKeypoints: false,
  showRawMode: false,
  showEV: false,
  showPinchToZoom: true,
  imageQualityPreset: 'balanced',
  focusPeakingColor: '#FF4444',
  focusPeakingSensitivity: 'medium',
};

export function validateSettings(raw: unknown): AppSettings {
  if (raw == null || typeof raw !== 'object') {
    return DEFAULT_SETTINGS;
  }

  // Reject arrays — they are objects but not plain dicts we want
  if (Array.isArray(raw)) {
    return DEFAULT_SETTINGS;
  }

  const obj = raw as Record<string, unknown>;

  const themeValues: Array<'dark' | 'light'> = ['dark', 'light'];
  const timerValues: TimerDuration[] = [3, 5, 10];
  const gridValues: GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral', 'none'];
  const sensitivityValues: FocusPeakingSensitivity[] = ['low', 'medium', 'high'];
  const qualityValues: ImageQualityPreset[] = ['size', 'balanced', 'quality'];

  const coerceBoolean = (v: unknown, defaultVal: boolean): boolean => {
    if (typeof v === 'boolean') return v;
    if (v == null) return defaultVal;
    return Boolean(v);
  };

  const isValidHex = (c: string): boolean =>
    /^#[0-9A-Fa-f]{6}$/.test(c);

  return {
    voiceEnabled: typeof obj.voiceEnabled === 'boolean' ? obj.voiceEnabled : DEFAULT_SETTINGS.voiceEnabled,
    theme: themeValues.includes(obj.theme as 'dark' | 'light') ? (obj.theme as 'dark' | 'light') : DEFAULT_SETTINGS.theme,
    timerDuration: timerValues.includes(obj.timerDuration as TimerDuration)
      ? (obj.timerDuration as TimerDuration)
      : DEFAULT_SETTINGS.timerDuration,
    defaultGridVariant: gridValues.includes(obj.defaultGridVariant as GridVariant)
      ? (obj.defaultGridVariant as GridVariant)
      : DEFAULT_SETTINGS.defaultGridVariant,
    showHistogram: coerceBoolean(obj.showHistogram, DEFAULT_SETTINGS.showHistogram),
    showLevel: coerceBoolean(obj.showLevel, DEFAULT_SETTINGS.showLevel),
    showFocusPeaking: coerceBoolean(obj.showFocusPeaking, DEFAULT_SETTINGS.showFocusPeaking),
    showSunPosition: coerceBoolean(obj.showSunPosition, DEFAULT_SETTINGS.showSunPosition),
    showFocusGuide: coerceBoolean(obj.showFocusGuide, DEFAULT_SETTINGS.showFocusGuide),
    showBubbleChat: coerceBoolean(obj.showBubbleChat, DEFAULT_SETTINGS.showBubbleChat),
    showShakeDetector: coerceBoolean(obj.showShakeDetector, DEFAULT_SETTINGS.showShakeDetector),
    showKeypoints: coerceBoolean(obj.showKeypoints, DEFAULT_SETTINGS.showKeypoints),
    showRawMode: coerceBoolean(obj.showRawMode, DEFAULT_SETTINGS.showRawMode),
    showEV: coerceBoolean(obj.showEV, DEFAULT_SETTINGS.showEV),
    showPinchToZoom: coerceBoolean(obj.showPinchToZoom, DEFAULT_SETTINGS.showPinchToZoom),
    imageQualityPreset: qualityValues.includes(obj.imageQualityPreset as ImageQualityPreset)
      ? (obj.imageQualityPreset as ImageQualityPreset)
      : DEFAULT_SETTINGS.imageQualityPreset,
    focusPeakingColor: isValidHex(obj.focusPeakingColor as string)
      ? (obj.focusPeakingColor as string)
      : DEFAULT_SETTINGS.focusPeakingColor,
    focusPeakingSensitivity: sensitivityValues.includes(obj.focusPeakingSensitivity as FocusPeakingSensitivity)
      ? (obj.focusPeakingSensitivity as FocusPeakingSensitivity)
      : DEFAULT_SETTINGS.focusPeakingSensitivity,
  };
}

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return validateSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await loadAppSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}