/**
 * Unit tests for SunPositionOverlay component and SunToggleButton.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SunPositionOverlay, SunToggleButton } from '../SunPositionOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockUseSunPosition = jest.fn();
jest.mock('../../hooks/useSunPosition', () => ({
  useSunPosition: (...args: unknown[]) => mockUseSunPosition(...args),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      sunColor: '#FFD700',
      sunPanelBg: 'rgba(30,30,30,0.85)',
      sunPanelBorder: '#FFD70055',
      sunCompassText: '#888',
      sunCompassCenter: '#FFD700',
      sunCompassBg: 'rgba(255,215,0,0.1)',
      topBarBorderInactive: '#444',
      sunToggleActiveBg: 'rgba(255,215,0,0.2)',
      sunToggleActiveBorder: '#FFD700',
      topBarBg: '#1a1a1a',
      topBarBorderInactive: '#555',
      topBarTextSecondary: '#aaa',
      text: '#fff',
      textSecondary: '#aaa',
      accent: '#E8D5B7',
      bubbleBg: '#1a1a1a',
      overlayBg: 'rgba(0,0,0,0.8)',
      success: '#00c853',
      warning: '#ffab00',
      error: '#ff4444',
    },
  }),
}));

jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityButton: jest.fn().mockReturnValue({
    accessibilityLabel: 'mock-label',
    accessibilityHint: 'mock-hint',
    onPress: undefined,
  }),
  useAccessibilityReducedMotion: jest.fn().mockReturnValue({ reducedMotion: false }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSunData = {
  available: true,
  goldenHourStart: '06:12',
  goldenHourEnd: '06:52',
  blueHourStart: '05:52',
  blueHourEnd: '06:12',
  sunAltitude: 42.5,
  sunAzimuth: 157.3,
  direction: 'SSE',
  advice: '阳光充足，适合户外人像拍摄',
  error: null,
};

const mockSunDataUnavailable = {
  available: false,
  goldenHourStart: null,
  goldenHourEnd: null,
  blueHourStart: null,
  blueHourEnd: null,
  sunAltitude: 0,
  sunAzimuth: 0,
  direction: '-',
  advice: '无法获取位置信息，请在设置中开启定位权限',
  error: 'Location permission denied',
};

const mockSunDataLowSun = {
  available: true,
  goldenHourStart: null,
  goldenHourEnd: null,
  blueHourStart: null,
  blueHourEnd: null,
  sunAltitude: -8.2,
  sunAzimuth: 275.0,
  direction: 'W',
  advice: '太阳仰角过低，不建议拍摄',
  error: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SunPositionOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when visible=false', () => {
    mockUseSunPosition.mockReturnValue({ sunData: mockSunData });
    const { toJSON } = render(<SunPositionOverlay visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders with sun data available', () => {
    mockUseSunPosition.mockReturnValue({ sunData: mockSunData });
    const { getByText } = render(<SunPositionOverlay visible={true} />);

    expect(getByText('太阳')).toBeTruthy();
    expect(getByText('仰角 42.5°')).toBeTruthy();
    expect(getByText(/方向.*SSE.*157/)).toBeTruthy();
    expect(getByText(/阳光充足/)).toBeTruthy();
  });

  it('displays golden hour row when goldenHourStart and goldenHourEnd are available', () => {
    mockUseSunPosition.mockReturnValue({ sunData: mockSunData });
    const { getByText } = render(<SunPositionOverlay visible={true} />);

    expect(getByText('黄金时刻 06:12-06:52')).toBeTruthy();
  });

  it('does not display golden hour row when goldenHourStart is null', () => {
    mockUseSunPosition.mockReturnValue({ sunData: mockSunDataLowSun });
    const { queryByText } = render(<SunPositionOverlay visible={true} />);

    expect(queryByText(/黄金时刻/)).toBeNull();
  });

  it('renders unavailable state when sunData.available=false', () => {
    mockUseSunPosition.mockReturnValue({ sunData: mockSunDataUnavailable });
    const { getByText } = render(<SunPositionOverlay visible={true} />);

    expect(getByText('无法获取位置信息，请在设置中开启定位权限')).toBeTruthy();
  });

  it('compass arrow renders without crashing', () => {
    mockUseSunPosition.mockReturnValue({ sunData: mockSunData });
    const { root } = render(<SunPositionOverlay visible={true} />);
    expect(root).toBeTruthy();
  });

  it('container renders with proper structure', () => {
    mockUseSunPosition.mockReturnValue({ sunData: mockSunData });
    const { root } = render(<SunPositionOverlay visible={true} />);

    expect(root).toBeTruthy();
    expect(mockUseSunPosition).toHaveBeenCalled();
  });

  it('updates when sunData changes', () => {
    mockUseSunPosition.mockReturnValue({ sunData: mockSunDataUnavailable });
    const { getByText, rerender } = render(<SunPositionOverlay visible={true} />);

    // Full text including the suffix part
    expect(getByText(/无法获取位置信息/)).toBeTruthy();

    mockUseSunPosition.mockReturnValue({ sunData: mockSunData });
    rerender(<SunPositionOverlay visible={true} />);

    expect(getByText(/仰角 42\.5°/)).toBeTruthy();
  });
});

describe('SunToggleButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with visible=true', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SunToggleButton visible={true} onPress={onPress} />);

    expect(getByText('太阳')).toBeTruthy();
  });

  it('renders with visible=false', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SunToggleButton visible={false} onPress={onPress} />);

    expect(getByText('太阳')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SunToggleButton visible={true} onPress={onPress} />);

    // Press via fireEvent on the text element which triggers the parent TouchableOpacity
    fireEvent.press(getByText('太阳'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without crash in both visible states', () => {
    const onPress = jest.fn();
    const { root: root1 } = render(<SunToggleButton visible={true} onPress={onPress} />);
    expect(root1).toBeTruthy();

    const { root: root2 } = render(<SunToggleButton visible={false} onPress={onPress} />);
    expect(root2).toBeTruthy();
  });
});