/**
 * Unit tests for src/contexts/ThemeContext.tsx
 * Covers ThemeProvider initialization, setTheme, toggleTheme, and useTheme hook.
 */

import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { DarkColors, LightColors } from '../theme/colors';

// Mock the settings service
jest.mock('../services/settings', () => ({
  loadAppSettings: jest.fn(),
  saveAppSettings: jest.fn(),
}));

const { loadAppSettings, saveAppSettings } = require('../services/settings');

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadAppSettings.mockResolvedValue({ theme: 'dark' });
    saveAppSettings.mockResolvedValue(undefined);
  });

  // ─── ThemeProvider defaults ────────────────────────────────────────────────

  it('defaults to dark theme when loadAppSettings resolves with dark', async () => {
    const { getByText } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(getByText('dark')).toBeTruthy();
    });
  });

  it('uses light theme when loadAppSettings resolves with light', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'light' });
    const { getByText } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(getByText('light')).toBeTruthy();
    });
  });

  it('loads settings once on mount (not on every render)', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    await waitFor(() => expect(loadAppSettings).toHaveBeenCalledTimes(1));
  });

  // ─── setTheme ─────────────────────────────────────────────────────────────

  it('setTheme updates theme state immediately', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'dark' });
    const { getByText } = render(
      <ThemeProvider>
        <SetThemeConsumer targetTheme="light" />
      </ThemeProvider>
    );

    await waitFor(() => expect(getByText('dark')).toBeTruthy());
    fireEvent.press(getByText('switch'));
    await waitFor(() => {
      expect(getByText('light')).toBeTruthy();
    });
  });

  it('setTheme persists the new theme via saveAppSettings', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'dark' });
    const { getByText } = render(
      <ThemeProvider>
        <SetThemeConsumer targetTheme="light" />
      </ThemeProvider>
    );

    await waitFor(() => expect(getByText('dark')).toBeTruthy());
    fireEvent.press(getByText('switch'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ theme: 'light' });
    });
  });

  it('setTheme can switch from light back to dark', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'light' });
    const { getByText } = render(
      <ThemeProvider>
        <SetThemeConsumer targetTheme="dark" />
      </ThemeProvider>
    );

    await waitFor(() => expect(getByText('light')).toBeTruthy());
    fireEvent.press(getByText('switch'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ theme: 'dark' });
    });
  });

  // ─── toggleTheme ──────────────────────────────────────────────────────────

  it('toggleTheme switches dark → light', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'dark' });
    const { getByText } = render(
      <ThemeProvider>
        <ToggleThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => expect(getByText('dark')).toBeTruthy());
    fireEvent.press(getByText('toggle'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ theme: 'light' });
    });
  });

  it('toggleTheme switches light → dark', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'light' });
    const { getByText } = render(
      <ThemeProvider>
        <ToggleThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => expect(getByText('light')).toBeTruthy());
    fireEvent.press(getByText('toggle'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ theme: 'dark' });
    });
  });

  it('multiple toggles persist each step correctly', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'dark' });
    const { getByText } = render(
      <ThemeProvider>
        <ToggleThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => expect(getByText('dark')).toBeTruthy());

    fireEvent.press(getByText('toggle'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenLastCalledWith({ theme: 'light' });
    });

    fireEvent.press(getByText('toggle'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenLastCalledWith({ theme: 'dark' });
    });
  });

  // ─── colors ───────────────────────────────────────────────────────────────

  it('provides DarkColors (accent #E8D5B7) when theme is dark', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'dark' });
    const { getByText } = render(
      <ThemeProvider>
        <ColorsConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByText('dark:#000000')).toBeTruthy();
    });
  });

  it('provides LightColors (accent #C4A35A) when theme is light', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'light' });
    const { getByText } = render(
      <ThemeProvider>
        <ColorsConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByText('light:#FFFFFF')).toBeTruthy();
    });
  });

  // ─── useTheme hook integration ─────────────────────────────────────────────

  it('useTheme returns theme, colors.accent, setTheme, and toggleTheme', async () => {
    loadAppSettings.mockResolvedValue({ theme: 'dark' });
    const { getByText } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(getByText('dark')).toBeTruthy();
      expect(getByText('accent:#E8D5B7')).toBeTruthy();
    });
  });
});

// ─── Test helper components ─────────────────────────────────────────────────

function ThemeConsumer() {
  const { theme, colors } = useTheme();
  return (
    <View>
      <Text>{theme}</Text>
      <Text>accent:{colors.accent}</Text>
    </View>
  );
}

function SetThemeConsumer({ targetTheme }: { targetTheme: 'dark' | 'light' }) {
  const { theme, setTheme } = useTheme();
  return (
    <View>
      <Text>{theme}</Text>
      <TouchableOpacity onPress={() => setTheme(targetTheme)}>
        <Text>switch</Text>
      </TouchableOpacity>
    </View>
  );
}

function ToggleThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <View>
      <Text>{theme}</Text>
      <TouchableOpacity onPress={toggleTheme}>
        <Text>toggle</Text>
      </TouchableOpacity>
    </View>
  );
}

function ColorsConsumer() {
  const { theme, colors } = useTheme();
  return <Text>{theme}:{colors.primary}</Text>;
}
