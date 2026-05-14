import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, GridVariant, ShakeDetectorSensitivity } from '../types';

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
  shakeDetectorSensitivity: 'medium',
};

export function validateSettings(raw: unknown): AppSettings {
  // Handle non-object inputs (null, undefined, primitives, arrays)
  if (raw === null || raw === undefined) return { ...DEFAULT_SETTINGS };
  if (typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  // Arrays are invalid objects
  if (Array.isArray(raw)) return { ...DEFAULT_SETTINGS };

  const input = raw as Record<string, unknown>;

  const timerValues = [3, 5, 10];
  const themeValues = ['dark', 'light'];
  const gridValues: GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral', 'none'];
  const presetValues = ['size', 'balanced', 'quality'];
  const sensitivityValues = ['low', 'medium', 'high'];

  const isValidHex = (v: unknown): boolean =>
    typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);

  const hasKey = (key: string): boolean => key in input;
  const getBool = (key: string): boolean => hasKey(key) ? Boolean(input[key]) : DEFAULT_SETTINGS[key as keyof AppSettings] as boolean;

  return {
    voiceEnabled: getBool('voiceEnabled'),
    theme: hasKey('theme') && themeValues.includes(input.theme as string) ? (input.theme as 'dark' | 'light') : DEFAULT_SETTINGS.theme,
    timerDuration: hasKey('timerDuration') && timerValues.includes(input.timerDuration as number) ? (input.timerDuration as number) : DEFAULT_SETTINGS.timerDuration,
    defaultGridVariant: hasKey('defaultGridVariant') && gridValues.includes(input.defaultGridVariant as GridVariant) ? (input.defaultGridVariant as GridVariant) : DEFAULT_SETTINGS.defaultGridVariant,
    showHistogram: getBool('showHistogram'),
    showLevel: getBool('showLevel'),
    showFocusPeaking: getBool('showFocusPeaking'),
    showSunPosition: getBool('showSunPosition'),
    showFocusGuide: getBool('showFocusGuide'),
    showBubbleChat: getBool('showBubbleChat'),
    showShakeDetector: getBool('showShakeDetector'),
    showKeypoints: getBool('showKeypoints'),
    showRawMode: getBool('showRawMode'),
    showEV: getBool('showEV'),
    showPinchToZoom: getBool('showPinchToZoom'),
    imageQualityPreset: hasKey('imageQualityPreset') && presetValues.includes(input.imageQualityPreset as string) ? (input.imageQualityPreset as 'size' | 'balanced' | 'quality') : DEFAULT_SETTINGS.imageQualityPreset,
    focusPeakingColor: hasKey('focusPeakingColor') && isValidHex(input.focusPeakingColor) ? (input.focusPeakingColor as string) : DEFAULT_SETTINGS.focusPeakingColor,
    focusPeakingSensitivity: hasKey('focusPeakingSensitivity') && sensitivityValues.includes(input.focusPeakingSensitivity as string) ? (input.focusPeakingSensitivity as 'low' | 'medium' | 'high') : DEFAULT_SETTINGS.focusPeakingSensitivity,
    shakeDetectorSensitivity: hasKey('shakeDetectorSensitivity') && sensitivityValues.includes(input.shakeDetectorSensitivity as string) ? (input.shakeDetectorSensitivity as ShakeDetectorSensitivity) : DEFAULT_SETTINGS.shakeDetectorSensitivity,
  };
}

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
