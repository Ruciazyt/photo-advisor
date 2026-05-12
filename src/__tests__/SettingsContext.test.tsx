/**
 * Unit tests for src/contexts/SettingsContext.tsx
 * Covers: default value shape, SettingsProvider mount/load, makeSetter persistence
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext';
import { defaultSettings } from '../contexts/SettingsContext';
import type { GridVariant, TimerDuration, ImageQualityPreset, FocusPeakingSensitivity } from '../types';

jest.mock('../services/settings', () => ({
  loadAppSettings: jest.fn(),
  saveAppSettings: jest.fn(),
}));

const { loadAppSettings, saveAppSettings } = require('../services/settings');

describe('SettingsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadAppSettings.mockResolvedValue({ ...defaultSettings });
    saveAppSettings.mockResolvedValue(undefined);
  });

  // ─── Default value ──────────────────────────────────────────────────────────

  describe('default value (no provider)', () => {
    it('exposes all AppSettings keys with correct defaults via useSettings', () => {
      // Without a provider, useSettings returns the module-level defaultValue.
      // We test it by rendering a consumer (no provider) and checking the output.
      const { getByText } = render(<DefaultShapeConsumer />);
      // voiceEnabled: false, theme: dark, timerDuration: 3, etc.
      expect(getByText(/voice:false/)).toBeTruthy();
      expect(getByText(/theme:dark/)).toBeTruthy();
      expect(getByText(/timer:3/)).toBeTruthy();
      expect(getByText(/grid:thirds/)).toBeTruthy();
      expect(getByText(/showHistogram:false/)).toBeTruthy();
      expect(getByText(/showLevel:true/)).toBeTruthy();
      expect(getByText(/showFocusPeaking:false/)).toBeTruthy();
      expect(getByText(/showSunPosition:false/)).toBeTruthy();
      expect(getByText(/showFocusGuide:true/)).toBeTruthy();
      expect(getByText(/showBubbleChat:true/)).toBeTruthy();
      expect(getByText(/showShakeDetector:false/)).toBeTruthy();
      expect(getByText(/showKeypoints:false/)).toBeTruthy();
      expect(getByText(/showRawMode:false/)).toBeTruthy();
      expect(getByText(/showEV:false/)).toBeTruthy();
      expect(getByText(/showPinchToZoom:true/)).toBeTruthy();
      expect(getByText(/imageQualityPreset:balanced/)).toBeTruthy();
      expect(getByText(/focusPeakingColor:#FF4444/)).toBeTruthy();
      expect(getByText(/focusPeakingSensitivity:medium/)).toBeTruthy();
    });

    it('all setters are present and are functions', () => {
      const { getByText } = render(<AllSettersConsumer />);
      expect(getByText('setVoiceEnabled:function')).toBeTruthy();
      expect(getByText('setDefaultGridVariant:function')).toBeTruthy();
      expect(getByText('setShowHistogram:function')).toBeTruthy();
      expect(getByText('setShowLevel:function')).toBeTruthy();
      expect(getByText('setShowFocusPeaking:function')).toBeTruthy();
      expect(getByText('setShowSunPosition:function')).toBeTruthy();
      expect(getByText('setShowFocusGuide:function')).toBeTruthy();
      expect(getByText('setShowBubbleChat:function')).toBeTruthy();
      expect(getByText('setShowShakeDetector:function')).toBeTruthy();
      expect(getByText('setShowKeypoints:function')).toBeTruthy();
      expect(getByText('setShowRawMode:function')).toBeTruthy();
      expect(getByText('setShowEV:function')).toBeTruthy();
      expect(getByText('setShowPinchToZoom:function')).toBeTruthy();
      expect(getByText('setTimerDuration:function')).toBeTruthy();
      expect(getByText('setImageQualityPreset:function')).toBeTruthy();
      expect(getByText('setFocusPeakingColor:function')).toBeTruthy();
      expect(getByText('setFocusPeakingSensitivity:function')).toBeTruthy();
    });

    it('default setter calls saveAppSettings directly (no provider needed)', async () => {
      // Without a provider, the setter backed by saveAppSettings should still work
      const { getByText } = render(<DirectSetterConsumer />);
      fireEvent.press(getByText('trigger'));
      await waitFor(() => {
        expect(saveAppSettings).toHaveBeenCalledWith({ voiceEnabled: true });
      });
    });
  });

  // ─── SettingsProvider mount ──────────────────────────────────────────────────

  describe('SettingsProvider mount', () => {
    it('loads settings from AsyncStorage on mount', async () => {
      render(
        <SettingsProvider>
          <Consumer />
        </SettingsProvider>
      );
      await waitFor(() => {
        expect(loadAppSettings).toHaveBeenCalledTimes(1);
      });
    });

    it('initializes state with loaded settings (dark theme)', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, theme: 'dark' });
      const { getByText } = render(
        <SettingsProvider>
          <ThemeConsumer />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByText('dark')).toBeTruthy());
    });

    it('initializes state with loaded settings (light theme)', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, theme: 'light' });
      const { getByText } = render(
        <SettingsProvider>
          <ThemeConsumer />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByText('light')).toBeTruthy());
    });

    it('uses default settings when AsyncStorage returns empty', async () => {
      loadAppSettings.mockResolvedValue({});
      const { getByText } = render(
        <SettingsProvider>
          <Consumer />
        </SettingsProvider>
      );
      await waitFor(() => {
        expect(getByText('voice:false')).toBeTruthy();
        expect(getByText('grid:thirds')).toBeTruthy();
        expect(getByText('timer:3')).toBeTruthy();
      });
    });
  });

  // ─── makeSetter ─────────────────────────────────────────────────────────────

  describe('makeSetter (provider-backed setters)', () => {
    it('setVoiceEnabled updates local state immediately', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, voiceEnabled: false });
      const { getByText, getByTestId } = render(
        <SettingsProvider>
          <SetterConsumer fieldName="voiceEnabled" setterKey="setVoiceEnabled" initialValue={false} targetValue={true} />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByTestId('current-setVoiceEnabled')).toBeTruthy());
      expect(getByText('false')).toBeTruthy();
      fireEvent.press(getByText('set'));
      await waitFor(() => expect(getByText('true')).toBeTruthy());
    });

    it('setVoiceEnabled persists via saveAppSettings', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, voiceEnabled: false });
      const { getByText, getByTestId } = render(
        <SettingsProvider>
          <SetterConsumer fieldName="voiceEnabled" setterKey="setVoiceEnabled" initialValue={false} targetValue={true} />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByTestId('current-setVoiceEnabled')).toBeTruthy());
      fireEvent.press(getByText('set'));
      await waitFor(() => {
        expect(saveAppSettings).toHaveBeenCalledWith({ voiceEnabled: true });
      });
    });

    it('setDefaultGridVariant updates state and persists', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, defaultGridVariant: 'thirds' });
      const { getByText, getByTestId } = render(
        <SettingsProvider>
          <SetterConsumer fieldName="defaultGridVariant" setterKey="setDefaultGridVariant" initialValue="thirds" targetValue="golden" />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByTestId('current-setDefaultGridVariant')).toBeTruthy());
      expect(getByText('thirds')).toBeTruthy();
      fireEvent.press(getByText('set'));
      await waitFor(() => {
        expect(getByText('golden')).toBeTruthy();
        expect(saveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'golden' });
      });
    });

    it('setShowHistogram toggles boolean state and persists', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, showHistogram: false });
      const { getByText, getByTestId } = render(
        <SettingsProvider>
          <SetterConsumer fieldName="showHistogram" setterKey="setShowHistogram" initialValue={false} targetValue={true} />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByTestId('current-setShowHistogram')).toBeTruthy());
      expect(getByText('false')).toBeTruthy();
      fireEvent.press(getByText('set'));
      await waitFor(() => {
        expect(saveAppSettings).toHaveBeenCalledWith({ showHistogram: true });
      });
    });

    it('setTimerDuration updates numeric state and persists', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, timerDuration: 3 });
      const { getByText, getByTestId } = render(
        <SettingsProvider>
          <SetterConsumer fieldName="timerDuration" setterKey="setTimerDuration" initialValue={3} targetValue={10} />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByTestId('current-setTimerDuration')).toBeTruthy());
      expect(getByText('3')).toBeTruthy();
      fireEvent.press(getByText('set'));
      await waitFor(() => {
        expect(getByText('10')).toBeTruthy();
        expect(saveAppSettings).toHaveBeenCalledWith({ timerDuration: 10 });
      });
    });

    it('setImageQualityPreset persists preset string', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, imageQualityPreset: 'balanced' });
      const { getByText, getByTestId } = render(
        <SettingsProvider>
          <SetterConsumer fieldName="imageQualityPreset" setterKey="setImageQualityPreset" initialValue="balanced" targetValue="quality" />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByTestId('current-setImageQualityPreset')).toBeTruthy());
      expect(getByText('balanced')).toBeTruthy();
      fireEvent.press(getByText('set'));
      await waitFor(() => {
        expect(saveAppSettings).toHaveBeenCalledWith({ imageQualityPreset: 'quality' });
      });
    });

    it('setFocusPeakingColor persists hex color string', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, focusPeakingColor: '#FF4444' });
      const { getByText, getByTestId } = render(
        <SettingsProvider>
          <SetterConsumer fieldName="focusPeakingColor" setterKey="setFocusPeakingColor" initialValue="#FF4444" targetValue="#00FF00" />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByTestId('current-setFocusPeakingColor')).toBeTruthy());
      expect(getByText('#FF4444')).toBeTruthy();
      fireEvent.press(getByText('set'));
      await waitFor(() => {
        expect(saveAppSettings).toHaveBeenCalledWith({ focusPeakingColor: '#00FF00' });
      });
    });

    it('setFocusPeakingSensitivity persists sensitivity enum', async () => {
      loadAppSettings.mockResolvedValue({ ...defaultSettings, focusPeakingSensitivity: 'medium' });
      const { getByText, getByTestId } = render(
        <SettingsProvider>
          <SetterConsumer fieldName="focusPeakingSensitivity" setterKey="setFocusPeakingSensitivity" initialValue="medium" targetValue="high" />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByTestId('current-setFocusPeakingSensitivity')).toBeTruthy());
      expect(getByText('medium')).toBeTruthy();
      fireEvent.press(getByText('set'));
      await waitFor(() => {
        expect(saveAppSettings).toHaveBeenCalledWith({ focusPeakingSensitivity: 'high' });
      });
    });

    it('multiple setters can be called in sequence', async () => {
      loadAppSettings.mockResolvedValue({
        ...defaultSettings,
        voiceEnabled: false,
        showHistogram: false,
      });
      const { getByText } = render(
        <SettingsProvider>
          <MultiSetterConsumer />
        </SettingsProvider>
      );
      await waitFor(() => expect(getByText('false')).toBeTruthy());

      fireEvent.press(getByText('setVoice'));
      await waitFor(() => {
        expect(saveAppSettings).toHaveBeenLastCalledWith({ voiceEnabled: true });
      });

      fireEvent.press(getByText('setHistogram'));
      await waitFor(() => {
        expect(saveAppSettings).toHaveBeenLastCalledWith({ showHistogram: true });
      });
    });
  });

  // ─── SettingsProvider children ─────────────────────────────────────────────

  describe('SettingsProvider renders children', () => {
    it('renders nested children correctly', async () => {
      const { getByText } = render(
        <SettingsProvider>
          <View>
            <Text>outer</Text>
            <View>
              <Text>inner</Text>
            </View>
          </View>
        </SettingsProvider>
      );
      await waitFor(() => {
        expect(getByText('outer')).toBeTruthy();
        expect(getByText('inner')).toBeTruthy();
      });
    });

    it('useSettings returns expected shape with provider', async () => {
      loadAppSettings.mockResolvedValue({
        ...defaultSettings,
        voiceEnabled: true,
        theme: 'dark',
        defaultGridVariant: 'golden',
      });
      const { getByText } = render(
        <SettingsProvider>
          <FullShapeConsumer />
        </SettingsProvider>
      );
      await waitFor(() => {
        expect(getByText('voice:true')).toBeTruthy();
        expect(getByText('theme:dark')).toBeTruthy();
        expect(getByText('grid:golden')).toBeTruthy();
      });
    });
  });
});

// ─── Test helper components ─────────────────────────────────────────────────

function Consumer() {
  const s = useSettings();
  return (
    <View>
      <Text>voice:{String(s.voiceEnabled)}</Text>
      <Text>grid:{s.defaultGridVariant}</Text>
      <Text>timer:{s.timerDuration}</Text>
    </View>
  );
}

function DefaultShapeConsumer() {
  // No SettingsProvider — useSettings returns the module-level defaultValue
  const s = useSettings();
  return (
    <View>
      <Text>voice:{String(s.voiceEnabled)}</Text>
      <Text>theme:{s.theme}</Text>
      <Text>timer:{s.timerDuration}</Text>
      <Text>grid:{s.defaultGridVariant}</Text>
      <Text>showHistogram:{String(s.showHistogram)}</Text>
      <Text>showLevel:{String(s.showLevel)}</Text>
      <Text>showFocusPeaking:{String(s.showFocusPeaking)}</Text>
      <Text>showSunPosition:{String(s.showSunPosition)}</Text>
      <Text>showFocusGuide:{String(s.showFocusGuide)}</Text>
      <Text>showBubbleChat:{String(s.showBubbleChat)}</Text>
      <Text>showShakeDetector:{String(s.showShakeDetector)}</Text>
      <Text>showKeypoints:{String(s.showKeypoints)}</Text>
      <Text>showRawMode:{String(s.showRawMode)}</Text>
      <Text>showEV:{String(s.showEV)}</Text>
      <Text>showPinchToZoom:{String(s.showPinchToZoom)}</Text>
      <Text>imageQualityPreset:{s.imageQualityPreset}</Text>
      <Text>focusPeakingColor:{s.focusPeakingColor}</Text>
      <Text>focusPeakingSensitivity:{s.focusPeakingSensitivity}</Text>
    </View>
  );
}

function AllSettersConsumer() {
  // No SettingsProvider — shows all setters are functions on defaultValue
  const s = useSettings() as Record<string, unknown>;
  const setterNames = [
    'setVoiceEnabled', 'setDefaultGridVariant', 'setShowHistogram',
    'setShowLevel', 'setShowFocusPeaking', 'setShowSunPosition',
    'setShowFocusGuide', 'setShowBubbleChat', 'setShowShakeDetector',
    'setShowKeypoints', 'setShowRawMode', 'setShowEV',
    'setShowPinchToZoom', 'setTimerDuration', 'setImageQualityPreset',
    'setFocusPeakingColor', 'setFocusPeakingSensitivity',
  ];
  return (
    <View>
      {setterNames.map((name) => (
        <Text key={name}>{name}:{typeof s[name]}</Text>
      ))}
    </View>
  );
}

function DirectSetterConsumer() {
  // No SettingsProvider — calls the default setter (backed by saveAppSettings)
  const s = useSettings();
  return (
    <View>
      <TouchableOpacity onPress={() => s.setVoiceEnabled(true)}>
        <Text>trigger</Text>
      </TouchableOpacity>
    </View>
  );
}

function ThemeConsumer() {
  const { theme } = useSettings();
  return <Text>{theme}</Text>;
}

function SetterConsumer({ fieldName, setterKey, initialValue, targetValue }: { fieldName: string; setterKey: string; initialValue: unknown; targetValue: unknown }) {
  const s = useSettings() as Record<string, unknown>;
  const setter = s[setterKey] as (...args: unknown[]) => unknown;
  // fieldName is the settings key (e.g. 'voiceEnabled'), setterKey is the method (e.g. 'setVoiceEnabled')
  const currentValue = s[fieldName] as unknown;
  const currentDisplay = currentValue !== undefined ? String(currentValue) : String(initialValue);
  return (
    <View>
      <Text testID={`current-${setterKey}`}>{currentDisplay}</Text>
      <TouchableOpacity onPress={() => setter(targetValue)}>
        <Text>set</Text>
      </TouchableOpacity>
    </View>
  );
}

function MultiSetterConsumer() {
  const s = useSettings();
  return (
    <View>
      <Text>{String(s.voiceEnabled)}</Text>
      <TouchableOpacity onPress={() => s.setVoiceEnabled(true)}>
        <Text>setVoice</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => s.setShowHistogram(true)}>
        <Text>setHistogram</Text>
      </TouchableOpacity>
    </View>
  );
}

function FullShapeConsumer() {
  const s = useSettings();
  return (
    <View>
      <Text>voice:{String(s.voiceEnabled)}</Text>
      <Text>theme:{s.theme}</Text>
      <Text>grid:{s.defaultGridVariant}</Text>
    </View>
  );
}