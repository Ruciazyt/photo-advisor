import React from 'react';
import { Text, View } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import { SettingsProvider, useSettings } from '../SettingsContext';
import type { AppSettings } from '../../types';

// Mock the settings service
jest.mock('../../services/settings', () => ({
  loadAppSettings: jest.fn(),
  saveAppSettings: jest.fn(),
}));

import { loadAppSettings, saveAppSettings } from '../../services/settings';

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

function SettingsSpy() {
  const ctx = useSettings();
  return (
    <View>
      <Text testID="voiceEnabled">{String(ctx.voiceEnabled)}</Text>
      <Text testID="theme">{ctx.theme}</Text>
      <Text testID="timerDuration">{ctx.timerDuration}</Text>
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
      <Text testID="imageQualityPreset">{ctx.imageQualityPreset}</Text>
      <Text testID="focusPeakingColor">{ctx.focusPeakingColor}</Text>
      <Text testID="focusPeakingSensitivity">{ctx.focusPeakingSensitivity}</Text>
      <Text testID="has-setters">
        {typeof ctx.setVoiceEnabled === 'function' &&
        typeof ctx.setTimerDuration === 'function' &&
        typeof ctx.setShowShakeDetector === 'function'
          ? 'yes'
          : 'no'}
      </Text>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (loadAppSettings as jest.Mock).mockResolvedValue(defaultSettings);
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

  it('initializes with default values while settings are loading', async () => {
    const { getByTestId } = render(<SettingsSpy />, { wrapper: SettingsProvider });
    expect(getByTestId('voiceEnabled').props.children).toBe('false');
    expect(getByTestId('showLevel').props.children).toBe('true');
    expect(getByTestId('showShakeDetector').props.children).toBe('false');
  });

  it('loads settings from storage after mount', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      ...defaultSettings,
      showShakeDetector: true,
      voiceEnabled: true,
      showBubbleChat: false,
    });

    const { getByTestId } = render(<SettingsSpy />, { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(getByTestId('showShakeDetector').props.children).toBe('true');
      expect(getByTestId('voiceEnabled').props.children).toBe('true');
      expect(getByTestId('showBubbleChat').props.children).toBe('false');
    });

    expect(loadAppSettings).toHaveBeenCalled();
  });

  it('provides setters that update context state optimistically and persist to storage', async () => {
    function ToggleSpy() {
      const ctx = useSettings();
      return (
        <View>
          <Text testID="showShakeDetector">{String(ctx.showShakeDetector)}</Text>
          <Text testID="toggle-btn" onPress={() => ctx.setShowShakeDetector(true)}>
            toggle
          </Text>
        </View>
      );
    }
    const { getByTestId } = render(<ToggleSpy />, { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(getByTestId('showShakeDetector').props.children).toBe('false');
    });

    await act(async () => {
      await (getByTestId('toggle-btn') as unknown as { props: { onPress: () => void } }).props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('showShakeDetector').props.children).toBe('true');
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ showShakeDetector: true });
  });

  it('provides setVoiceEnabled that persists to storage', async () => {
    let captured: ReturnType<typeof useSettings>;
    function Capture() {
      captured = useSettings();
      return null;
    }
    render(<Capture />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!.setVoiceEnabled(true);
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ voiceEnabled: true });
  });

  it('provides setTimerDuration that persists to storage', async () => {
    let captured: ReturnType<typeof useSettings>;
    function Capture() {
      captured = useSettings();
      return null;
    }
    render(<Capture />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!.setTimerDuration(5);
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ timerDuration: 5 });
  });

  it('provides setDefaultGridVariant that persists to storage', async () => {
    let captured: ReturnType<typeof useSettings>;
    function Capture() {
      captured = useSettings();
      return null;
    }
    render(<Capture />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!.setDefaultGridVariant('golden');
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'golden' });
  });

  it('provides setFocusPeakingColor that persists to storage', async () => {
    let captured: ReturnType<typeof useSettings>;
    function Capture() {
      captured = useSettings();
      return null;
    }
    render(<Capture />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!.setFocusPeakingColor('#44FF44');
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ focusPeakingColor: '#44FF44' });
  });

  it('provides setImageQualityPreset that persists to storage', async () => {
    let captured: ReturnType<typeof useSettings>;
    function Capture() {
      captured = useSettings();
      return null;
    }
    render(<Capture />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!.setImageQualityPreset('quality');
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ imageQualityPreset: 'quality' });
  });

  it('provides setShowBubbleChat that persists to storage', async () => {
    let captured: ReturnType<typeof useSettings>;
    function Capture() {
      captured = useSettings();
      return null;
    }
    render(<Capture />, { wrapper: SettingsProvider });

    await act(async () => {
      await captured!.setShowBubbleChat(false);
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ showBubbleChat: false });
  });

  it('shares state across multiple consumers simultaneously', async () => {
    function ConsumerA() {
      const ctx = useSettings();
      return <Text testID="a-voice">{String(ctx.voiceEnabled)}</Text>;
    }
    function ConsumerB() {
      const ctx = useSettings();
      return <Text testID="b-voice">{String(ctx.voiceEnabled)}</Text>;
    }
    function ToggleCapture() {
      const ctx = useSettings();
      return (
        <View>
          <Text testID="toggle-btn" onPress={() => ctx.setVoiceEnabled(true)}>
            toggle
          </Text>
        </View>
      );
    }

    // All three components share the same SettingsProvider instance
    const { getByTestId } = render(
      <SettingsProvider>
        <ConsumerA />
        <ConsumerB />
        <ToggleCapture />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('a-voice').props.children).toBe('false');
      expect(getByTestId('b-voice').props.children).toBe('false');
    });

    await act(async () => {
      await (getByTestId('toggle-btn') as unknown as { props: { onPress: () => void } }).props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('a-voice').props.children).toBe('true');
      expect(getByTestId('b-voice').props.children).toBe('true');
    });
  });
});

describe('useSettings', () => {
  it('returns default setters that persist when called outside a provider', async () => {
    let captured: ReturnType<typeof useSettings>;
    function Capture() {
      captured = useSettings();
      return null;
    }
    render(<Capture />);

    expect(captured!.voiceEnabled).toBe(false);
    expect(captured!.showShakeDetector).toBe(false);
    expect(typeof captured!.setVoiceEnabled).toBe('function');
    expect(typeof captured!.setShowShakeDetector).toBe('function');

    await act(async () => {
      await captured!.setShowShakeDetector(true);
    });
    expect(saveAppSettings).toHaveBeenCalledWith({ showShakeDetector: true });
  });

  it('returns the real provider value when called inside SettingsProvider', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      ...defaultSettings,
      voiceEnabled: true,
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
  });
});
