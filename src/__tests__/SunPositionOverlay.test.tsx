import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import { SunPositionOverlay, SunToggleButton } from '../components/SunPositionOverlay';

// --- Mocks (self-contained — no references to vars below) ---

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      sunColor: '#FFB800',
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

// --- Tests for SunPositionOverlay ---

describe('SunPositionOverlay', () => {
  let useTheme: jest.Mock;
  let useSunPosition: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useTheme = require('../contexts/ThemeContext').useTheme;
    useSunPosition = require('../hooks/useSunPosition').useSunPosition;
  });

  it('renders nothing when visible is false', () => {
    const { toJSON } = render(<SunPositionOverlay visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the sun panel when visible is true and sun data available', () => {
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('太阳')).toBeTruthy();
    expect(getByText(/仰角/)).toBeTruthy();
    expect(getByText(/方向/)).toBeTruthy();
  });

  it('renders unavailable state when sun data is not available', () => {
    useSunPosition.mockReturnValueOnce({
      sunData: { available: false, advice: '无法获取太阳位置', sunAltitude: 0, sunAzimuth: 0, direction: '', goldenHourStart: null, goldenHourEnd: null, blueHourStart: null, blueHourEnd: null },
      requestLocation: jest.fn(),
    });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('无法获取太阳位置')).toBeTruthy();
  });

  it('renders golden hour info when available', () => {
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/黄金时刻/)).toBeTruthy();
    expect(getByText(/17:30.*18:15/)).toBeTruthy();
  });

  it('does not render golden hour row when goldenHourStart/goldenHourEnd are missing', () => {
    useSunPosition.mockReturnValueOnce({
      sunData: { available: true, sunAltitude: 45.2, sunAzimuth: 180, direction: '南', advice: '光线柔和', goldenHourStart: null, goldenHourEnd: null, blueHourStart: null, blueHourEnd: null },
      requestLocation: jest.fn(),
    });
    const { queryByText } = render(<SunPositionOverlay visible={true} />);
    expect(queryByText(/黄金时刻/)).toBeNull();
  });

  it('calls useTheme to get colors', () => {
    render(<SunPositionOverlay visible={true} />);
    expect(useTheme).toHaveBeenCalled();
  });

  it('calls useSunPosition to get sun data', () => {
    render(<SunPositionOverlay visible={true} />);
    expect(useSunPosition).toHaveBeenCalled();
  });
});

// --- Tests for SunToggleButton ---

describe('SunToggleButton', () => {
  let useTheme: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useTheme = require('../contexts/ThemeContext').useTheme;
  });

  it('renders the toggle button with visible=false', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SunToggleButton visible={false} onPress={onPress} />
    );
    expect(getByText('太阳')).toBeTruthy();
  });

  it('renders the toggle button with visible=true', () => {
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

  it('uses useTheme internally so it can render without external colors prop', () => {
    // Verifies SunToggleButton works standalone — it must call useTheme()
    // and not reference parent-scoped variables that would cause ReferenceError
    const onPress = jest.fn();
    render(<SunToggleButton visible={true} onPress={onPress} />);
    expect(useTheme).toHaveBeenCalled();
  });
});
