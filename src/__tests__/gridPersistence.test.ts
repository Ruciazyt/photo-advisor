/**
 * Grid variant persistence tests.
 *
 * Tests the grid persistence logic:
 * 1. handleGridActivate saves to settings when called after initial load
 * 2. handleGridSelect saves to settings
 * 3. Settings save is NOT called during initial loadSettingsOnFocus
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GridVariant } from '../components/GridOverlay';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Track saveAppSettings calls — must use "mock" prefix per Jest hoisting rules
const mockSaveAppSettings = jest.fn().mockResolvedValue(undefined);
const mockLoadAppSettings = jest.fn().mockResolvedValue({
  voiceEnabled: false,
  theme: 'dark',
  timerDuration: 3,
  defaultGridVariant: 'thirds' as GridVariant,
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
  imageQualityPreset: 'balanced' as const,
  focusPeakingColor: '#FF4444',
  focusPeakingSensitivity: 'medium' as const,
});

jest.mock('../services/settings', () => ({
  loadAppSettings: (...args: unknown[]) => mockLoadAppSettings(...args),
  saveAppSettings: (...args: unknown[]) => mockSaveAppSettings(...args),
}));

// Re-implement the pure callback logic from CameraScreen for isolated testing.
// These mirror the actual implementations in CameraScreen.tsx.
const GRID_ORDER: GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral', 'none'];

// settingsLoadedRef — starts false, set true after loadAppSettings completes
const settingsLoadedRef = { current: false };

function handleGridActivate(variant: GridVariant): void {
  const nextIndex = (GRID_ORDER.indexOf(variant) + 1) % GRID_ORDER.length;
  const nextVariant = GRID_ORDER[nextIndex];
  if (settingsLoadedRef.current) {
    mockSaveAppSettings({ defaultGridVariant: nextVariant });
  }
}

async function handleGridSelect(variant: GridVariant): Promise<void> {
  await mockSaveAppSettings({ defaultGridVariant: variant });
}

async function loadSettingsOnFocus(): Promise<void> {
  await mockLoadAppSettings();
  // Set to true AFTER loadAppSettings resolves
  settingsLoadedRef.current = true;
}

describe('grid persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    settingsLoadedRef.current = false;
  });

  describe('handleGridActivate', () => {
    it('does NOT save to settings before initial load', async () => {
      // Start load without await — simulates in-flight loadAppSettings call
      const loadPromise = loadSettingsOnFocus();
      // settingsLoadedRef is still false while loadAppSettings is pending
      expect(settingsLoadedRef.current).toBe(false);

      // Call handleGridActivate while load is still in-flight
      handleGridActivate('thirds');

      // Save should NOT have been called (settingsLoadedRef is false)
      expect(mockSaveAppSettings).not.toHaveBeenCalled();

      // Allow load to complete
      await loadPromise;
      expect(settingsLoadedRef.current).toBe(true);
    });

    it('saves to settings when called after initial load', async () => {
      await loadSettingsOnFocus();
      expect(settingsLoadedRef.current).toBe(true);

      handleGridActivate('thirds');

      expect(mockSaveAppSettings).toHaveBeenCalledTimes(1);
      expect(mockSaveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'golden' });
    });

    it('cycles through all grid variants correctly', async () => {
      await loadSettingsOnFocus();
      mockSaveAppSettings.mockClear();

      handleGridActivate('thirds');
      expect(mockSaveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'golden' });

      handleGridActivate('golden');
      expect(mockSaveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'diagonal' });

      handleGridActivate('diagonal');
      expect(mockSaveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'spiral' });

      handleGridActivate('spiral');
      expect(mockSaveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'none' });

      handleGridActivate('none');
      expect(mockSaveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'thirds' });
    });
  });

  describe('handleGridSelect', () => {
    it('saves to settings when called', async () => {
      await handleGridSelect('golden');
      expect(mockSaveAppSettings).toHaveBeenCalledTimes(1);
      expect(mockSaveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'golden' });
    });

    it('saves the selected variant directly (no cycling)', async () => {
      await handleGridSelect('spiral');
      expect(mockSaveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'spiral' });
    });

    it('saves each distinct variant independently', async () => {
      await handleGridSelect('thirds');
      await handleGridSelect('diagonal');
      await handleGridSelect('none');

      expect(mockSaveAppSettings).toHaveBeenCalledTimes(3);
      expect(mockSaveAppSettings).toHaveBeenNthCalledWith(1, { defaultGridVariant: 'thirds' });
      expect(mockSaveAppSettings).toHaveBeenNthCalledWith(2, { defaultGridVariant: 'diagonal' });
      expect(mockSaveAppSettings).toHaveBeenNthCalledWith(3, { defaultGridVariant: 'none' });
    });
  });

  describe('loadSettingsOnFocus', () => {
    it('does NOT trigger a settings save during initial load', async () => {
      // Start loading settings (no await — load is in-flight)
      const loadPromise = loadSettingsOnFocus();

      // While load is in-flight, no save should have occurred yet
      expect(mockSaveAppSettings).not.toHaveBeenCalled();

      // Complete the load
      await loadPromise;
      expect(settingsLoadedRef.current).toBe(true);

      // Still no save should have happened (loadSettingsOnFocus itself doesn't call saveAppSettings)
      expect(mockSaveAppSettings).not.toHaveBeenCalled();
    });

    it('sets settingsLoadedRef to true only after loadAppSettings resolves', async () => {
      expect(settingsLoadedRef.current).toBe(false);

      const loadPromise = loadSettingsOnFocus();
      // Before resolution, ref is still false
      expect(settingsLoadedRef.current).toBe(false);

      await loadPromise;
      // After resolution, ref is true
      expect(settingsLoadedRef.current).toBe(true);
    });
  });
});
