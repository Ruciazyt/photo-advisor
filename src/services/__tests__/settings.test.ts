/**
 * Tests for settings service — app settings persistence via AsyncStorage.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAppSettings, saveAppSettings } from '../settings';
import type { AppSettings } from '../../types';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const DEFAULT_SETTINGS: AppSettings = {
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

describe('settings service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('loadAppSettings', () => {
    it('returns DEFAULT_SETTINGS when AsyncStorage has no data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadAppSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when AsyncStorage.getItem throws', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('read error'));
      const result = await loadAppSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it('merges stored partial settings with DEFAULT_SETTINGS', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        theme: 'light',
        voiceEnabled: true,
      }));
      const result = await loadAppSettings();
      expect(result.theme).toBe('light');
      expect(result.voiceEnabled).toBe(true);
      // Unset keys should fall back to defaults
      expect(result.timerDuration).toBe(DEFAULT_SETTINGS.timerDuration);
      expect(result.defaultGridVariant).toBe(DEFAULT_SETTINGS.defaultGridVariant);
    });

    it('returns full DEFAULT_SETTINGS when stored data is empty object', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));
      const result = await loadAppSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it('parses stored settings correctly', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        theme: 'light',
        showHistogram: true,
        imageQualityPreset: 'high' as any,
        showEV: true,
      }));
      const result = await loadAppSettings();
      expect(result.theme).toBe('light');
      expect(result.showHistogram).toBe(true);
      expect(result.imageQualityPreset).toBe('high');
      expect(result.showEV).toBe(true);
    });

    it('spreads all stored fields (including unknown) into result', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        theme: 'light',
        unknownField: 'preserved at runtime',
        anotherBadField: 999,
      }));
      const result = await loadAppSettings();
      expect(result.theme).toBe('light');
      expect((result as any).unknownField).toBe('preserved at runtime');
    });

    it('handles invalid JSON gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('not valid json {{{');
      const result = await loadAppSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('saveAppSettings', () => {
    it('merges partial settings with existing settings', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        theme: 'dark',
        voiceEnabled: false,
        timerDuration: 10,
      }));

      await saveAppSettings({ theme: 'light' });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@photo_advisor_settings',
        expect.stringContaining('"theme":"light"')
      );
    });

    it('preserves unspecified existing settings', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        theme: 'dark',
        voiceEnabled: true,
        timerDuration: 5,
      }));

      await saveAppSettings({ showHistogram: true });

      const setItemCall = mockAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(setItemCall);
      expect(parsed.theme).toBe('dark');
      expect(parsed.voiceEnabled).toBe(true);
      expect(parsed.timerDuration).toBe(5);
      expect(parsed.showHistogram).toBe(true);
    });

    it('overwrites existing value with new partial settings', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        theme: 'dark',
        timerDuration: 5,
      }));

      await saveAppSettings({ timerDuration: 10 });

      const setItemCall = mockAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(setItemCall);
      expect(parsed.timerDuration).toBe(10);
      expect(parsed.theme).toBe('dark'); // unchanged
    });

    it('stores merged result as JSON string', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(DEFAULT_SETTINGS));

      await saveAppSettings({ theme: 'light' });

      const setItemCall = mockAsyncStorage.setItem.mock.calls[0][1];
      expect(() => JSON.parse(setItemCall)).not.toThrow();
    });

    it('works when no existing settings (returns full defaults)', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await saveAppSettings({ theme: 'light' });

      const setItemCall = mockAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(setItemCall);
      expect(parsed.theme).toBe('light');
      expect(parsed.voiceEnabled).toBe(DEFAULT_SETTINGS.voiceEnabled);
    });

    it('each save starts fresh from current stored state', async () => {
      // Simulate: first save writes light theme
      // Second save should read what was saved, not DEFAULT_SETTINGS
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(null)            // first load: returns null → use defaults
        .mockResolvedValueOnce(JSON.stringify({ // second load: returns result of first save
          ...DEFAULT_SETTINGS,
          theme: 'light',
        }));

      await saveAppSettings({ theme: 'light' });
      await saveAppSettings({ voiceEnabled: true });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
      const secondCall = mockAsyncStorage.setItem.mock.calls[1][1];
      const parsed = JSON.parse(secondCall);
      expect(parsed.theme).toBe('light');       // from first save
      expect(parsed.voiceEnabled).toBe(true);   // from second save
    });
  });
});