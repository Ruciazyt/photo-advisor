import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { DarkColors, LightColors } from '../../theme/colors';

// Mock the settings service
jest.mock('../../services/settings', () => ({
  loadAppSettings: jest.fn(),
  saveAppSettings: jest.fn(),
}));

import { loadAppSettings, saveAppSettings } from '../../services/settings';

// Helper: a child component that exposes theme state for assertions
function ThemeSpy() {
  const ctx = useTheme();
  return (
    <View>
      <Text testID="theme-value">{ctx.theme}</Text>
      <Text testID="has-setTheme">{typeof ctx.setTheme === 'function' ? 'yes' : 'no'}</Text>
      <Text testID="has-toggleTheme">{typeof ctx.toggleTheme === 'function' ? 'yes' : 'no'}</Text>
      <Text testID="colors-type">{typeof ctx.colors}</Text>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: loaded settings return dark theme
  (loadAppSettings as jest.Mock).mockResolvedValue({ theme: 'dark' });
  (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
});

describe('ThemeProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Text>Hello</Text>
      </ThemeProvider>
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('uses dark as the initial theme when no initialTheme prop is given', async () => {
    const { getByTestId } = render(<ThemeSpy />, { wrapper: ThemeProvider });

    await waitFor(() => {
      // After mount + useEffect resolves, theme should be loaded from settings
      expect(getByTestId('theme-value').props.children).toBe('dark');
    });
  });

  it('accepts initialTheme prop and overrides the default', async () => {
    const { getByTestId } = render(<ThemeSpy />, {
      wrapper: ({ children }) => (
        <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      ),
    });

    // initialTheme sets state before loadAppSettings resolves
    await waitFor(() => {
      expect(getByTestId('theme-value').props.children).toBe('light');
    });
  });

  it('loads theme from settings after mount', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({ theme: 'light' });

    const { getByTestId } = render(<ThemeSpy />, { wrapper: ThemeProvider });

    await waitFor(() => {
      expect(getByTestId('theme-value').props.children).toBe('light');
    });
    expect(loadAppSettings).toHaveBeenCalled();
  });

  it('provides setTheme that persists theme to settings storage', async () => {
    const { getByTestId } = render(<ThemeSpy />, { wrapper: ThemeProvider });

    await waitFor(() => {
      expect(getByTestId('theme-value').props.children).toBe('dark');
    });

    const { setTheme } = require('../../services/settings');
    // Re-access the context via a fresh spy that will read the new value
    let capturedSetTheme: (t: 'dark' | 'light') => Promise<void>;
    function CaptureSetTheme() {
      const ctx = useTheme();
      capturedSetTheme = ctx.setTheme;
      return null;
    }

    const { unmount } = render(<CaptureSetTheme />, { wrapper: ThemeProvider });

    await act(async () => {
      await capturedSetTheme!('light');
    });

    expect(saveAppSettings).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('provides toggleTheme that switches from dark to light', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({ theme: 'dark' });

    function ToggleSpy() {
      const ctx = useTheme();
      return (
        <View>
          <Text testID="theme-value">{ctx.theme}</Text>
          <Text testID="toggle-fn" onPress={ctx.toggleTheme}>
            toggle
          </Text>
        </View>
      );
    }

    const { getByTestId, getByText } = render(<ToggleSpy />, { wrapper: ThemeProvider });

    await waitFor(() => {
      expect(getByTestId('theme-value').props.children).toBe('dark');
    });

    await act(async () => {
      await (getByText('toggle') as unknown as { props: { onPress: () => void } }).props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('theme-value').props.children).toBe('light');
    });
  });

  it('provides toggleTheme that switches from light to dark', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({ theme: 'light' });

    function ToggleSpy() {
      const ctx = useTheme();
      return (
        <View>
          <Text testID="theme-value">{ctx.theme}</Text>
          <Text testID="toggle-btn" onPress={ctx.toggleTheme}>
            toggle
          </Text>
        </View>
      );
    }

    const { getByTestId, getByTestId: getByTestId2 } = render(<ToggleSpy />, { wrapper: ThemeProvider });

    await waitFor(() => {
      expect(getByTestId('theme-value').props.children).toBe('light');
    });

    await act(async () => {
      await (getByTestId('toggle-btn') as unknown as { props: { onPress: () => void } }).props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId2('theme-value').props.children).toBe('dark');
    });
  });
});

describe('useTheme', () => {
  it('returns default value (dark) when called outside any provider', () => {
    // The default value is baked into createContext — no provider needed
    let captured: ReturnType<typeof useTheme>;
    function Capture() {
      captured = useTheme();
      return null;
    }
    render(<Capture />);
    expect(captured!.theme).toBe('dark');
    expect(captured!.colors).toBe(DarkColors);
    expect(typeof captured!.setTheme).toBe('function');
    expect(typeof captured!.toggleTheme).toBe('function');
  });

  it('returns the real provider value when called inside ThemeProvider', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({ theme: 'light' });

    let captured: ReturnType<typeof useTheme>;
    function Capture() {
      captured = useTheme();
      return null;
    }

    render(<Capture />, { wrapper: ThemeProvider });

    await waitFor(() => {
      expect(captured!.theme).toBe('light');
    });
    expect(captured!.colors).toBe(LightColors);
  });
});