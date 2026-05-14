import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for Jest environment
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { loadAppSettings, saveAppSettings } from '../services/settings';

const STORAGE_KEY = '@photo_advisor_settings';

const DEFAULT_SETTINGS = {
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

describe('settings service', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('loadAppSettings', () => {
    it('returns default settings when storage is empty', async () => {
      const settings = await loadAppSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('returns stored voiceEnabled when present', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.voiceEnabled).toBe(true);
    });

    it('merges partial storage with defaults', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));
      const settings = await loadAppSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('returns defaults on invalid JSON', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, 'not json');
      const settings = await loadAppSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('returns default timerDuration when not set', async () => {
      const settings = await loadAppSettings();
      expect(settings.timerDuration).toBe(3);
    });

    it('defaults focusPeakingColor to #FF4444', async () => {
      const settings = await loadAppSettings();
      expect(settings.focusPeakingColor).toBe('#FF4444');
    });
  });

  describe('saveAppSettings', () => {
    it('saves voiceEnabled=true to storage', async () => {
      await saveAppSettings({ voiceEnabled: true });
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw ?? '{}');
      expect(parsed.voiceEnabled).toBe(true);
    });

    it('saves voiceEnabled=false to storage', async () => {
      await saveAppSettings({ voiceEnabled: false });
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw ?? '{}');
      expect(parsed.voiceEnabled).toBe(false);
    });

    it('preserves existing settings when saving partial update', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      await saveAppSettings({ voiceEnabled: false });
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw ?? '{}');
      expect(parsed.voiceEnabled).toBe(false);
    });

    it('saves and loads timerDuration', async () => {
      await saveAppSettings({ timerDuration: 10 });
      const settings = await loadAppSettings();
      expect(settings.timerDuration).toBe(10);
    });
  });

  describe('camera overlay settings', () => {
    beforeEach(async () => {
      await AsyncStorage.clear();
    });

    it('defaults showHistogram to false', async () => {
      const settings = await loadAppSettings();
      expect(settings.showHistogram).toBe(false);
    });

    it('defaults showLevel to true', async () => {
      const settings = await loadAppSettings();
      expect(settings.showLevel).toBe(true);
    });

    it('defaults showFocusPeaking to false', async () => {
      const settings = await loadAppSettings();
      expect(settings.showFocusPeaking).toBe(false);
    });

    it('defaults showSunPosition to false', async () => {
      const settings = await loadAppSettings();
      expect(settings.showSunPosition).toBe(false);
    });

    it('defaults showFocusGuide to true', async () => {
      const settings = await loadAppSettings();
      expect(settings.showFocusGuide).toBe(true);
    });

    it('defaults defaultGridVariant to thirds', async () => {
      const settings = await loadAppSettings();
      expect(settings.defaultGridVariant).toBe('thirds');
    });

    it('saves and loads showHistogram', async () => {
      await saveAppSettings({ showHistogram: true });
      const settings = await loadAppSettings();
      expect(settings.showHistogram).toBe(true);
    });

    it('saves and loads showLevel', async () => {
      await saveAppSettings({ showLevel: false });
      const settings = await loadAppSettings();
      expect(settings.showLevel).toBe(false);
    });

    it('saves and loads showFocusPeaking', async () => {
      await saveAppSettings({ showFocusPeaking: true });
      const settings = await loadAppSettings();
      expect(settings.showFocusPeaking).toBe(true);
    });

    it('saves and loads showSunPosition', async () => {
      await saveAppSettings({ showSunPosition: true });
      const settings = await loadAppSettings();
      expect(settings.showSunPosition).toBe(true);
    });

    it('saves and loads showFocusGuide', async () => {
      await saveAppSettings({ showFocusGuide: false });
      const settings = await loadAppSettings();
      expect(settings.showFocusGuide).toBe(false);
    });

    it('saves and loads defaultGridVariant', async () => {
      await saveAppSettings({ defaultGridVariant: 'golden' });
      const settings = await loadAppSettings();
      expect(settings.defaultGridVariant).toBe('golden');
    });

    it('persists all camera overlay settings across multiple saves', async () => {
      await saveAppSettings({ showHistogram: true, showLevel: false });
      await saveAppSettings({ showFocusPeaking: true, defaultGridVariant: 'diagonal' });
      const settings = await loadAppSettings();
      expect(settings.showHistogram).toBe(true);
      expect(settings.showLevel).toBe(false);
      expect(settings.showFocusPeaking).toBe(true);
      expect(settings.defaultGridVariant).toBe('diagonal');
    });

    it('saves and loads focusPeakingColor', async () => {
      await saveAppSettings({ focusPeakingColor: '#44FF44' });
      const settings = await loadAppSettings();
      expect(settings.focusPeakingColor).toBe('#44FF44');
    });

    it('defaults focusPeakingColor when stored settings lack it (backwards compat)', async () => {
      // Simulate old settings without focusPeakingColor
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.focusPeakingColor).toBe('#FF4444');
    });

    it('defaults focusPeakingSensitivity to medium', async () => {
      const settings = await loadAppSettings();
      expect(settings.focusPeakingSensitivity).toBe('medium');
    });

    it('saves and loads focusPeakingSensitivity', async () => {
      await saveAppSettings({ focusPeakingSensitivity: 'high' });
      const settings = await loadAppSettings();
      expect(settings.focusPeakingSensitivity).toBe('high');
    });

    it('saves and loads focusPeakingSensitivity=low', async () => {
      await saveAppSettings({ focusPeakingSensitivity: 'low' });
      const settings = await loadAppSettings();
      expect(settings.focusPeakingSensitivity).toBe('low');
    });

    it('defaults focusPeakingSensitivity when stored settings lack it (backwards compat)', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.focusPeakingSensitivity).toBe('medium');
    });

    // --- showShakeDetector ---
    it('defaults showShakeDetector to false', async () => {
      const settings = await loadAppSettings();
      expect(settings.showShakeDetector).toBe(false);
    });

    it('saves and loads showShakeDetector', async () => {
      await saveAppSettings({ showShakeDetector: true });
      const settings = await loadAppSettings();
      expect(settings.showShakeDetector).toBe(true);
    });

    it('defaults showShakeDetector when stored settings lack it (backwards compat)', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.showShakeDetector).toBe(false);
    });

    // --- showKeypoints ---
    it('defaults showKeypoints to false', async () => {
      const settings = await loadAppSettings();
      expect(settings.showKeypoints).toBe(false);
    });

    it('saves and loads showKeypoints', async () => {
      await saveAppSettings({ showKeypoints: true });
      const settings = await loadAppSettings();
      expect(settings.showKeypoints).toBe(true);
    });

    it('defaults showKeypoints when stored settings lack it (backwards compat)', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.showKeypoints).toBe(false);
    });

    // --- showEV ---
    it('defaults showEV to false', async () => {
      const settings = await loadAppSettings();
      expect(settings.showEV).toBe(false);
    });

    it('saves and loads showEV', async () => {
      await saveAppSettings({ showEV: true });
      const settings = await loadAppSettings();
      expect(settings.showEV).toBe(true);
    });

    it('defaults showEV when stored settings lack it (backwards compat)', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.showEV).toBe(false);
    });

    // --- showPinchToZoom ---
    it('defaults showPinchToZoom to true', async () => {
      const settings = await loadAppSettings();
      expect(settings.showPinchToZoom).toBe(true);
    });

    it('saves and loads showPinchToZoom', async () => {
      await saveAppSettings({ showPinchToZoom: false });
      const settings = await loadAppSettings();
      expect(settings.showPinchToZoom).toBe(false);
    });

    it('defaults showPinchToZoom when stored settings lack it (backwards compat)', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.showPinchToZoom).toBe(true);
    });

    // --- showBubbleChat ---
    it('defaults showBubbleChat to true', async () => {
      const settings = await loadAppSettings();
      expect(settings.showBubbleChat).toBe(true);
    });

    it('saves and loads showBubbleChat', async () => {
      await saveAppSettings({ showBubbleChat: false });
      const settings = await loadAppSettings();
      expect(settings.showBubbleChat).toBe(false);
    });

    it('defaults showBubbleChat when stored settings lack it (backwards compat)', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.showBubbleChat).toBe(true);
    });

    // --- showRawMode ---
    it('defaults showRawMode to false', async () => {
      const settings = await loadAppSettings();
      expect(settings.showRawMode).toBe(false);
    });

    it('saves and loads showRawMode', async () => {
      await saveAppSettings({ showRawMode: true });
      const settings = await loadAppSettings();
      expect(settings.showRawMode).toBe(true);
    });

    it('defaults showRawMode when stored settings lack it (backwards compat)', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.showRawMode).toBe(false);
    });

    // --- imageQualityPreset ---
    it('defaults imageQualityPreset to balanced', async () => {
      const settings = await loadAppSettings();
      expect(settings.imageQualityPreset).toBe('balanced');
    });

    it('saves and loads imageQualityPreset=balanced', async () => {
      await saveAppSettings({ imageQualityPreset: 'balanced' });
      const settings = await loadAppSettings();
      expect(settings.imageQualityPreset).toBe('balanced');
    });

    it('saves and loads imageQualityPreset=size', async () => {
      await saveAppSettings({ imageQualityPreset: 'size' });
      const settings = await loadAppSettings();
      expect(settings.imageQualityPreset).toBe('size');
    });

    it('saves and loads imageQualityPreset=quality', async () => {
      await saveAppSettings({ imageQualityPreset: 'quality' });
      const settings = await loadAppSettings();
      expect(settings.imageQualityPreset).toBe('quality');
    });

    it('defaults imageQualityPreset when stored settings lack it (backwards compat)', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.imageQualityPreset).toBe('balanced');
    });

    // --- theme ---
    it('defaults theme to dark', async () => {
      const settings = await loadAppSettings();
      expect(settings.theme).toBe('dark');
    });

    it('saves and loads theme=dark', async () => {
      await saveAppSettings({ theme: 'dark' });
      const settings = await loadAppSettings();
      expect(settings.theme).toBe('dark');
    });

    it('saves and loads theme=light', async () => {
      await saveAppSettings({ theme: 'light' });
      const settings = await loadAppSettings();
      expect(settings.theme).toBe('light');
    });

    it('defaults theme when stored settings lack it (backwards compat)', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.theme).toBe('dark');
    });
  });
});
