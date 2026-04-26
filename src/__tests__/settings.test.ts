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
  imageQualityPreset: 'balanced',
  focusPeakingColor: '#FF4444',
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
  });
});
