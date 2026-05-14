import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SunPositionOverlay, SunToggleButton } from '../components/SunPositionOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// ThemeContext — dark theme (default)
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      sunColor: '#FFB800',
      sunPanelBg: 'rgba(20,20,20,0.85)',
      sunPanelBorder: 'rgba(255,184,0,0.3)',
      topBarBg: '#1A1A1A',
      topBarBorderInactive: 'rgba(255,255,255,0.1)',
      topBarTextSecondary: 'rgba(255,255,255,0.5)',
      sunToggleActiveBg: 'rgba(255,184,0,0.2)',
      sunToggleActiveBorder: '#FFB800',
      sunCompassBg: 'rgba(255,184,0,0.1)',
      sunCompassCenter: '#FFB800',
      sunCompassText: 'rgba(255,255,255,0.7)',
      text: '#FFFFFF',
      textSecondary: 'rgba(255,255,255,0.6)',
      accent: '#4FC3F7',
      background: '#000000',
      surface: '#1A1A1A',
      border: 'rgba(255,255,255,0.1)',
      error: '#FF5252',
      warning: '#FFB800',
      success: '#4CAF50',
      info: '#2196F3',
    },
  })),
}));

// useSunPosition mock
jest.mock('../hooks/useSunPosition', () => ({
  useSunPosition: jest.fn(() => ({
    sunData: {
      available: true,
      sunAltitude: 45.2,
      sunAzimuth: 180,
      direction: '南',
      advice: '光线柔和，适合拍照',
      goldenHourStart: '17:30',
      goldenHourEnd: '18:15',
      blueHourStart: null,
      blueHourEnd: null,
    },
    requestLocation: jest.fn(),
  })),
}));

// Ionicons mock — rendered as a simple View+Text to mimic @expo/vector-icons structure
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, size, color }: { name: string; size: number; color: string }) {
      return React.createElement(Text, { testID: `icon-${name}` }, `${name}(${size})`);
    },
  };
});

// useAccessibilityButton mock — no default implementation; configured per-test
// to avoid stale return values across tests.
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityButton: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Light-theme version of ThemeContext
const lightThemeColors = {
  theme: 'light',
  colors: {
    sunColor: '#E69500',
    sunPanelBg: 'rgba(255,255,255,0.9)',
    sunPanelBorder: 'rgba(200,150,0,0.3)',
    topBarBg: '#FFFFFF',
    topBarBorderInactive: 'rgba(0,0,0,0.1)',
    topBarTextSecondary: 'rgba(0,0,0,0.5)',
    sunToggleActiveBg: 'rgba(230,149,0,0.15)',
    sunToggleActiveBorder: '#E69500',
    sunCompassBg: 'rgba(230,149,0,0.1)',
    sunCompassCenter: '#E69500',
    sunCompassText: 'rgba(0,0,0,0.6)',
    text: '#1A1A1A',
    textSecondary: 'rgba(0,0,0,0.5)',
    accent: '#1976D2',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    border: 'rgba(0,0,0,0.1)',
    error: '#D32F2F',
    warning: '#ED6C02',
    success: '#2E7D32',
    info: '#0288D1',
  },
};

// ---------------------------------------------------------------------------
// Tests for SunPositionOverlay
// ---------------------------------------------------------------------------

describe('SunPositionOverlay', () => {
  let useTheme: jest.Mock;
  let useSunPosition: jest.Mock;

  beforeEach(() => {
    useTheme = require('../contexts/ThemeContext').useTheme;
    useSunPosition = require('../hooks/useSunPosition').useSunPosition;
  });

  it('renders nothing when visible=false', () => {
    const { toJSON } = render(<SunPositionOverlay visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders unavailable panel when sunData.available=false', () => {
    useSunPosition.mockReturnValueOnce({
      sunData: {
        available: false,
        advice: '无法获取太阳位置',
        sunAltitude: 0,
        sunAzimuth: 0,
        direction: '',
        goldenHourStart: null,
        goldenHourEnd: null,
        blueHourStart: null,
        blueHourEnd: null,
      },
      requestLocation: jest.fn(),
    });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('无法获取太阳位置')).toBeTruthy();
    // Should show the unavailable icon
    expect(getByText(/sunny-outline/)).toBeTruthy();
  });

  it('renders sun panel with altitude and azimuth when sunData.available=true', () => {
    useSunPosition.mockReturnValueOnce({
      sunData: {
        available: true,
        sunAltitude: 45.2,
        sunAzimuth: 180,
        direction: '南',
        advice: '光线柔和，适合拍照',
        goldenHourStart: '17:30',
        goldenHourEnd: '18:15',
        blueHourStart: null,
        blueHourEnd: null,
      },
      requestLocation: jest.fn(),
    });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('太阳')).toBeTruthy();
    // Altitude display: "仰角 45.2°"
    expect(getByText(/仰角 45\.2°/)).toBeTruthy();
    // Azimuth/direction display: "方向 南 (180°)"
    expect(getByText(/方向/)).toBeTruthy();
    expect(getByText(/南/)).toBeTruthy();
    expect(getByText(/180°/)).toBeTruthy();
  });

  it('renders CompassArrow sub-component', () => {
    useSunPosition.mockReturnValueOnce({
      sunData: {
        available: true,
        sunAltitude: 45.2,
        sunAzimuth: 180,
        direction: '南',
        advice: '光线柔和，适合拍照',
        goldenHourStart: null,
        goldenHourEnd: null,
        blueHourStart: null,
        blueHourEnd: null,
      },
      requestLocation: jest.fn(),
    });
    const { UNSAFE_root } = render(<SunPositionOverlay visible={true} />);
    // CompassArrow renders N/E/S/W compass direction labels as Text elements
    const textElements = UNSAFE_root.findAllByType('Text');
    expect(textElements.length).toBeGreaterThan(0);
    // Verify the compass has direction labels (N, E, S, W or icon references)
    const textStrings = textElements.map((el: { props: { children: string } }) => el.props.children).filter(Boolean);
    expect(textStrings.some((t: string) => ['N', 'E', 'S', 'W', 'sunny'].includes(t))).toBe(true);
  });

  it('renders golden hour row when goldenHourStart/goldenHourEnd are provided', () => {
    useSunPosition.mockReturnValueOnce({
      sunData: {
        available: true,
        sunAltitude: 45.2,
        sunAzimuth: 180,
        direction: '南',
        advice: '光线柔和，适合拍照',
        goldenHourStart: '17:30',
        goldenHourEnd: '18:15',
        blueHourStart: null,
        blueHourEnd: null,
      },
      requestLocation: jest.fn(),
    });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/黄金时刻/)).toBeTruthy();
    expect(getByText(/17:30/)).toBeTruthy();
    expect(getByText(/18:15/)).toBeTruthy();
  });

  it('hides golden hour row when goldenHourStart is null', () => {
    useSunPosition.mockReturnValueOnce({
      sunData: {
        available: true,
        sunAltitude: 45.2,
        sunAzimuth: 180,
        direction: '南',
        advice: '光线柔和，适合拍照',
        goldenHourStart: null,
        goldenHourEnd: null,
        blueHourStart: null,
        blueHourEnd: null,
      },
      requestLocation: jest.fn(),
    });
    const { queryByText } = render(<SunPositionOverlay visible={true} />);
    expect(queryByText(/黄金时刻/)).toBeNull();
  });

  it('applies dark theme colors via useTheme', () => {
    render(<SunPositionOverlay visible={true} />);
    expect(useTheme).toHaveBeenCalled();
  });

  it('calls useSunPosition to get sun data', () => {
    render(<SunPositionOverlay visible={true} />);
    expect(useSunPosition).toHaveBeenCalled();
  });
});

describe('SunPositionOverlay — light theme', () => {
  beforeEach(() => {
    const { useTheme } = require('../contexts/ThemeContext');
    useTheme.mockReturnValue(lightThemeColors);
  });

  it('renders correctly with light theme colors', () => {
    const { useSunPosition } = require('../hooks/useSunPosition');
    useSunPosition.mockReturnValueOnce({
      sunData: {
        available: true,
        sunAltitude: 30,
        sunAzimuth: 90,
        direction: '东',
        advice: '侧光人像',
        goldenHourStart: '06:30',
        goldenHourEnd: '07:30',
        blueHourStart: null,
        blueHourEnd: null,
      },
      requestLocation: jest.fn(),
    });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('太阳')).toBeTruthy();
    expect(getByText(/仰角 30\.0°/)).toBeTruthy();
    expect(getByText(/黄金时刻/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tests for SunToggleButton
// ---------------------------------------------------------------------------

describe('SunToggleButton', () => {
  let useTheme: jest.Mock;
  let useAccessibilityButton: jest.Mock;

  beforeEach(() => {
    useTheme = require('../contexts/ThemeContext').useTheme;
    useAccessibilityButton = require('../hooks/useAccessibility').useAccessibilityButton;
    // Reset only the calls, not the implementation, to avoid stale state
    useAccessibilityButton.mockClear();
  });

  it('renders with correct label when visible=false', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SunToggleButton visible={false} onPress={onPress} />
    );
    expect(getByText('太阳')).toBeTruthy();
  });

  it('renders with correct label when visible=true', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SunToggleButton visible={true} onPress={onPress} />
    );
    expect(getByText('太阳')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SunToggleButton visible={false} onPress={onPress} />
    );
    fireEvent.press(getByText('太阳'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('passes correct opts to useAccessibilityButton (label and role)', () => {
    // Verify the component calls useAccessibilityButton with correct label and role
    const onPress = jest.fn();
    render(<SunToggleButton visible={false} onPress={onPress} />);
    expect(useAccessibilityButton).toHaveBeenCalledWith(
      expect.objectContaining({ label: '太阳位置', role: 'button' })
    );
  });

  it('passes different hint based on visible state', () => {
    // The component's hint reflects what the button WILL do:
    // visible=true (currently showing) → hint: '关闭太阳位置显示' (close it)
    // visible=false (currently hidden) → hint: '打开太阳位置显示' (open it)
    let capturedHint: string | undefined;
    useAccessibilityButton.mockImplementation(
      ({ label, hint }: { label: string; hint?: string }) => {
        capturedHint = hint;
        return {
          accessibilityLabel: label,
          accessibilityHint: hint ?? '太阳位置提示',
          accessibilityRole: 'button' as const,
          accessibilityState: { disabled: false, selected: false },
        };
      }
    );
    const onPress = jest.fn();
    render(<SunToggleButton visible={false} onPress={onPress} />);
    expect(capturedHint).toBe('打开太阳位置显示');
    // visible=true → hint: '关闭太阳位置显示'
    useAccessibilityButton.mockImplementation(
      ({ label, hint }: { label: string; hint?: string }) => {
        capturedHint = hint;
        return {
          accessibilityLabel: label,
          accessibilityHint: hint ?? '太阳位置提示',
          accessibilityRole: 'button' as const,
          accessibilityState: { disabled: false, selected: true },
        };
      }
    );
    render(<SunToggleButton visible={true} onPress={onPress} />);
    expect(capturedHint).toBe('关闭太阳位置显示');
  });

  it('spreads a11y props onto TouchableOpacity', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <SunToggleButton visible={true} onPress={onPress} />
    );
    const button = UNSAFE_root.findByProps({ accessibilityRole: 'button' });
    expect(button.props.accessibilityLabel).toBe('太阳位置');
    expect(button.props.accessibilityRole).toBe('button');
    // visible=true → accessibilityState.selected=true
    expect(button.props.accessibilityState.selected).toBe(true);
  });

  it('uses useTheme internally', () => {
    const onPress = jest.fn();
    render(<SunToggleButton visible={false} onPress={onPress} />);
    expect(useTheme).toHaveBeenCalled();
  });
});
