import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadAppSettings, saveAppSettings } from '../services/settings';
import type {
  AppSettings,
  GridVariant,
  TimerDuration,
  ImageQualityPreset,
  FocusPeakingSensitivity,
} from '../types';

interface SettingsContextValue extends AppSettings {
  // Setters — each persists to AsyncStorage
  setVoiceEnabled: (v: boolean) => Promise<void>;
  setDefaultGridVariant: (v: GridVariant) => Promise<void>;
  setShowHistogram: (v: boolean) => Promise<void>;
  setShowLevel: (v: boolean) => Promise<void>;
  setShowFocusPeaking: (v: boolean) => Promise<void>;
  setShowSunPosition: (v: boolean) => Promise<void>;
  setShowFocusGuide: (v: boolean) => Promise<void>;
  setShowBubbleChat: (v: boolean) => Promise<void>;
  setShowShakeDetector: (v: boolean) => Promise<void>;
  setShowKeypoints: (v: boolean) => Promise<void>;
  setShowRawMode: (v: boolean) => Promise<void>;
  setShowEV: (v: boolean) => Promise<void>;
  setShowPinchToZoom: (v: boolean) => Promise<void>;
  setTimerDuration: (v: TimerDuration) => Promise<void>;
  setImageQualityPreset: (v: ImageQualityPreset) => Promise<void>;
  setFocusPeakingColor: (v: string) => Promise<void>;
  setFocusPeakingSensitivity: (v: FocusPeakingSensitivity) => Promise<void>;
}

// Default context value — used when no SettingsProvider is present (e.g. in tests)
const defaultSettings: AppSettings = {
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

// Default setters — call saveAppSettings directly so components work even without a provider (e.g. in tests).
// When SettingsProvider is present, its makeSetter takes precedence and also updates context state.
const defaultValue: SettingsContextValue = {
  ...defaultSettings,
  setVoiceEnabled: (v) => saveAppSettings({ voiceEnabled: v }),
  setDefaultGridVariant: (v) => saveAppSettings({ defaultGridVariant: v }),
  setShowHistogram: (v) => saveAppSettings({ showHistogram: v }),
  setShowLevel: (v) => saveAppSettings({ showLevel: v }),
  setShowFocusPeaking: (v) => saveAppSettings({ showFocusPeaking: v }),
  setShowSunPosition: (v) => saveAppSettings({ showSunPosition: v }),
  setShowFocusGuide: (v) => saveAppSettings({ showFocusGuide: v }),
  setShowBubbleChat: (v) => saveAppSettings({ showBubbleChat: v }),
  setShowShakeDetector: (v) => saveAppSettings({ showShakeDetector: v }),
  setShowKeypoints: (v) => saveAppSettings({ showKeypoints: v }),
  setShowRawMode: (v) => saveAppSettings({ showRawMode: v }),
  setShowEV: (v) => saveAppSettings({ showEV: v }),
  setShowPinchToZoom: (v) => saveAppSettings({ showPinchToZoom: v }),
  setTimerDuration: (v) => saveAppSettings({ timerDuration: v }),
  setImageQualityPreset: (v) => saveAppSettings({ imageQualityPreset: v }),
  setFocusPeakingColor: (v) => saveAppSettings({ focusPeakingColor: v }),
  setFocusPeakingSensitivity: (v) => saveAppSettings({ focusPeakingSensitivity: v }),
};

const SettingsContext = createContext<SettingsContextValue>(defaultValue);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    loadAppSettings().then((loaded) => {
      setSettings(loaded);
    });
  }, []);

  const makeSetter = useCallback(
    <K extends keyof AppSettings>(key: K) =>
      async (value: AppSettings[K]) => {
        // Optimistic update
        setSettings((prev) => ({ ...prev, [key]: value }));
        await saveAppSettings({ [key]: value });
      },
    []
  );

  const value: SettingsContextValue = {
    ...settings,
    setVoiceEnabled: makeSetter('voiceEnabled'),
    setDefaultGridVariant: makeSetter('defaultGridVariant'),
    setShowHistogram: makeSetter('showHistogram'),
    setShowLevel: makeSetter('showLevel'),
    setShowFocusPeaking: makeSetter('showFocusPeaking'),
    setShowSunPosition: makeSetter('showSunPosition'),
    setShowFocusGuide: makeSetter('showFocusGuide'),
    setShowBubbleChat: makeSetter('showBubbleChat'),
    setShowShakeDetector: makeSetter('showShakeDetector'),
    setShowKeypoints: makeSetter('showKeypoints'),
    setShowRawMode: makeSetter('showRawMode'),
    setShowEV: makeSetter('showEV'),
    setShowPinchToZoom: makeSetter('showPinchToZoom'),
    setTimerDuration: makeSetter('timerDuration'),
    setImageQualityPreset: makeSetter('imageQualityPreset'),
    setFocusPeakingColor: makeSetter('focusPeakingColor'),
    setFocusPeakingSensitivity: makeSetter('focusPeakingSensitivity'),
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
