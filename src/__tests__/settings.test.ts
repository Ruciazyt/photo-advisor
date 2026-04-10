import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for Jest environment
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { loadAppSettings, saveAppSettings } from '../services/settings';

const STORAGE_KEY = '@photo_advisor_settings';

describe('settings service', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('loadAppSettings', () => {
    it('returns default settings when storage is empty', async () => {
      const settings = await loadAppSettings();
      expect(settings).toEqual({ voiceEnabled: false });
    });

    it('returns stored voiceEnabled when present', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceEnabled: true }));
      const settings = await loadAppSettings();
      expect(settings.voiceEnabled).toBe(true);
    });

    it('merges partial storage with defaults', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));
      const settings = await loadAppSettings();
      expect(settings).toEqual({ voiceEnabled: false });
    });

    it('returns defaults on invalid JSON', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, 'not json');
      const settings = await loadAppSettings();
      expect(settings).toEqual({ voiceEnabled: false });
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
  });
});
