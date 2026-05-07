import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { SettingsProvider, useSettings } from '../SettingsContext';

// Mock the settings service
jest.mock('../../services/settings', () => ({
  loadAppSettings: jest.fn(),
  saveAppSettings: jest.fn(),
}));

import { loadAppSettings, saveAppSettings } from '../../services/settings';

// Helper: a child component that exposes settings state for assertions
function SettingsSpy() {
  const ctx = useSettings();
  return (
    <View>
      <Text testID="voiceEnabled">{String(ctx.voiceEnabled)}</Text>
      <Text testID="defaultGridVariant">{ctx.defaultGridVariant}</Text>
      <Text testID="showHistogram">{String(ctx.showHistogram)}</Text>
      <Text testID="showLevel">{String(ctx.showLevel)}</Text>
      <Text testID="showFocusPeaking">{String(ctx.showFocusPeaking)}</Text>
      <Text testID="showSunPosition">{String(ctx.showSunPosition)}</Text>
      <Text testID="showFocusGuide">{String(ctx.showFocusGuide)}</Text>
      <Text testID="showBubbleChat">{String(ctx.showBubbleChat)}</Text>
      <Text testID="showShakeDetector">{String(ctx.showShakeDetector)}</Text>
      <Text testID="showKeypoints">{String(ctx.showKeypoints)}</Text>
      <Text testID="showRawMode">{String(ctx.showRawMode)}</Text>
      <Text testID="showEV">{String(ctx.showEV)}</Text>
      <Text testID="showPinchToZoom">{String(ctx.showPinchToZoom)}</Text>
      <Text testID="timerDuration">{String(ctx.timerDuration)}</Text>
      <Text testID="imageQualityPreset">{ctx.imageQualityPreset}</Text>
      <Text testID="focusPeakingColor">{ctx.focusPeakingColor}</Text>
      <Text testID="focusPeakingSensitivity">{ctx.focusPeakingSensitivity}</Text>
      <Text testID="theme">{ctx.theme}</Text>
      <Text testID="has-setVoiceEnabled">{typeof ctx.setVoiceEnabled === 'function' ? 'yes' : 'no'}</Text>
      <Text testID="has-setDefaultGridVariant">{typeof ctx.setDefaultGridVariant === 'function' ? 'yes' : 'no'}</Text>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (loadAppSettings as jest.Mock).mockResolvedValue({});
  (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
});

describe('SettingsProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <SettingsProvider>
        <Text>Hello</Text>
      </SettingsProvider>
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('uses default values before settings are loaded', async () => {
    // Never resolve loadAppSettings so settings stay at defaults
    (loadAppSettings as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { getByTestId } = render(<SettingsSpy />, { wrapper: SettingsProvider });

    // Default values from SettingsContext defaultSettings
    expect(getByTestId('voiceEnabled').props.children).toBe('false');
    expect(getByTestId('defaultGridVariant').props.children).toBe('thirds');
    expect(getByTestId('showHistogram').props.children).toBe('false');
    expect(getByTestId('showLevel').props.children).toBe('true');
    expect(getByTestId('showFocusPeaking').props.children).toBe('false');
    expect(getByTestId('showSunPosition').props.children).toBe('false');
    expect(getByTestId('showFocusGuide').props.children).toBe('true');
    expect(getByTestId('showBubbleChat').props.children).toBe('true');
    expect(getByTestId('showShakeDetector').props.children).toBe('false');
    expect(getByTestId('showKeypoints').props.children).toBe('false');
    expect(getByTestId('showRawMode').props.children).toBe('false');
    expect(getByTestId('showEV').props.children).toBe('false');
    expect(getByTestId('showPinchToZoom').props.children).toBe('true');
    expect(getByTestId('timerDuration').props.children).toBe('3');
    expect(getByTestId('imageQualityPreset').props.children).toBe('balanced');
    expect(getByTestId('focusPeakingColor').props.children).toBe('#FF4444');
    expect(getByTestId('focusPeakingSensitivity').props.children).toBe('medium');
  });

  it('loads settings from storage after mount', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      voiceEnabled: true,
      defaultGridVariant: 'golden',
      showHistogram: true,
      showLevel: false,
      showFocusPeaking: true,
      showSunPosition: true,
      showFocusGuide: false,
      showBubbleChat: false,
      showShakeDetector: true,
      showKeypoints: true,
      showRawMode: true,
      showEV: true,
      showPinchToZoom: false,
      timerDuration: 5,
      imageQualityPreset: 'quality',
      focusPeakingColor: '#44FF44',
      focusPeakingSensitivity: 'high',
      theme: 'light',
    });

    const { getByTestId } = render(<SettingsSpy />, { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(getByTestId('voiceEnabled').props.children).toBe('true');
    });
    expect(getByTestId('defaultGridVariant').props.children).toBe('golden');
    expect(getByTestId('showHistogram').props.children).toBe('true');
    expect(getByTestId('showLevel').props.children).toBe('false');
    expect(getByTestId('showFocusPeaking').props.children).toBe('true');
    expect(getByTestId('showSunPosition').props.children).toBe('true');
    expect(getByTestId('showFocusGuide').props.children).toBe('false');
    expect(getByTestId('showBubbleChat').props.children).toBe('false');
    expect(getByTestId('showShakeDetector').props.children).toBe('true');
    expect(getByTestId('showKeypoints').props.children).toBe('true');
    expect(getByTestId('showRawMode').props.children).toBe('true');
    expect(getByTestId('showEV').props.children).toBe('true');
    expect(getByTestId('showPinchToZoom').props.children).toBe('false');
    expect(getByTestId('timerDuration').props.children).toBe('5');
    expect(getByTestId('imageQualityPreset').props.children).toBe('quality');
    expect(getByTestId('focusPeakingColor').props.children).toBe('#44FF44');
    expect(getByTestId('focusPeakingSensitivity').props.children).toBe('high');
    expect(getByTestId('theme').props.children).toBe('light');
  });

  it('setVoiceEnabled updates context state and calls saveAppSettings', async () => {
    const { getByTestId } = render(<SettingsSpy />, { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(getByTestId('voiceEnabled').props.children).toBe('false');
    });

    let capturedSetVoiceEnabled: (v: boolean) => Promise<void>;
    function CaptureSetter() {
      const ctx = useSettings();
      capturedSetVoiceEnabled = ctx.setVoiceEnabled;
      return null;
    }

    render(<CaptureSetter />, { wrapper: SettingsProvider });

    await act(async () => {
      await capturedSetVoiceEnabled!(true);
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ voiceEnabled: true });
  });

  it('setDefaultGridVariant updates context state and calls saveAppSettings', async () => {
    const { getByTestId } = render(<SettingsSpy />, { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(getByTestId('defaultGridVariant').props.children).toBe('thirds');
    });

    let captured: (v: 'thirds' | 'golden' | 'diagonal' | 'spiral' | 'none') => Promise<void>;
    function CaptureSetter() {
      const ctx = useSettings();
      captured = ctx.setDefaultGridVariant;
      return null;
    }

    render(<CaptureSetter />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!('golden');
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'golden' });
  });

  it('setShowLevel updates context state and calls saveAppSettings', async () => {
    let capturedSetShowLevel: (v: boolean) => Promise<void>;
    function CaptureSetter() {
      const ctx = useSettings();
      capturedSetShowLevel = ctx.setShowLevel;
      return null;
    }

    render(<CaptureSetter />, { wrapper: SettingsProvider });

    await act(async () => {
      await capturedSetShowLevel!(false);
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ showLevel: false });
  });

  it('setTimerDuration updates context state and calls saveAppSettings', async () => {
    let capturedSetTimerDuration: (v: 3 | 5 | 10) => Promise<void>;
    function CaptureSetter() {
      const ctx = useSettings();
      capturedSetTimerDuration = ctx.setTimerDuration;
      return null;
    }

    render(<CaptureSetter />, { wrapper: SettingsProvider });

    await act(async () => {
      await capturedSetTimerDuration!(10);
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ timerDuration: 10 });
  });

  it('setImageQualityPreset updates context state and calls saveAppSettings', async () => {
    let captured: (v: 'size' | 'balanced' | 'quality') => Promise<void>;
    function CaptureSetter() {
      const ctx = useSettings();
      captured = ctx.setImageQualityPreset;
      return null;
    }

    render(<CaptureSetter />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!('quality');
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ imageQualityPreset: 'quality' });
  });

  it('setFocusPeakingColor updates context state and calls saveAppSettings', async () => {
    let captured: (v: string) => Promise<void>;
    function CaptureSetter() {
      const ctx = useSettings();
      captured = ctx.setFocusPeakingColor;
      return null;
    }

    render(<CaptureSetter />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!('#44FF44');
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ focusPeakingColor: '#44FF44' });
  });

  it('setFocusPeakingSensitivity updates context state and calls saveAppSettings', async () => {
    let captured: (v: 'low' | 'medium' | 'high') => Promise<void>;
    function CaptureSetter() {
      const ctx = useSettings();
      captured = ctx.setFocusPeakingSensitivity;
      return null;
    }

    render(<CaptureSetter />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!('high');
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ focusPeakingSensitivity: 'high' });
  });

  it('setShowBubbleChat updates context state and calls saveAppSettings', async () => {
    let captured: (v: boolean) => Promise<void>;
    function CaptureSetter() {
      const ctx = useSettings();
      captured = ctx.setShowBubbleChat;
      return null;
    }

    render(<CaptureSetter />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!(false);
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ showBubbleChat: false });
  });

  it('setShowShakeDetector updates context state and calls saveAppSettings', async () => {
    let captured: (v: boolean) => Promise<void>;
    function CaptureSetter() {
      const ctx = useSettings();
      captured = ctx.setShowShakeDetector;
      return null;
    }

    render(<CaptureSetter />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!(true);
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ showShakeDetector: true });
  });
});

describe('useSettings', () => {
  it('returns default values when called outside any provider', () => {
    // The default value is baked into createContext — no provider needed
    let captured: ReturnType<typeof useSettings>;
    function Capture() {
      captured = useSettings();
      return null;
    }
    render(<Capture />);
    expect(captured!.voiceEnabled).toBe(false);
    expect(captured!.defaultGridVariant).toBe('thirds');
    expect(captured!.showHistogram).toBe(false);
    expect(captured!.showLevel).toBe(true);
    expect(captured!.showFocusPeaking).toBe(false);
    expect(captured!.showSunPosition).toBe(false);
    expect(captured!.showFocusGuide).toBe(true);
    expect(captured!.showBubbleChat).toBe(true);
    expect(captured!.showShakeDetector).toBe(false);
    expect(captured!.showKeypoints).toBe(false);
    expect(captured!.showRawMode).toBe(false);
    expect(captured!.showEV).toBe(false);
    expect(captured!.showPinchToZoom).toBe(true);
    expect(captured!.timerDuration).toBe(3);
    expect(captured!.imageQualityPreset).toBe('balanced');
    expect(captured!.focusPeakingColor).toBe('#FF4444');
    expect(captured!.focusPeakingSensitivity).toBe('medium');
    expect(typeof captured!.setVoiceEnabled).toBe('function');
    expect(typeof captured!.setDefaultGridVariant).toBe('function');
  });

  it('returns the real provider value when called inside SettingsProvider', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      voiceEnabled: true,
      defaultGridVariant: 'diagonal',
      timerDuration: 5,
    });

    let captured: ReturnType<typeof useSettings>;
    function Capture() {
      captured = useSettings();
      return null;
    }

    render(<Capture />, { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(captured!.voiceEnabled).toBe(true);
    });
    expect(captured!.defaultGridVariant).toBe('diagonal');
    expect(captured!.timerDuration).toBe(5);
  });
});
