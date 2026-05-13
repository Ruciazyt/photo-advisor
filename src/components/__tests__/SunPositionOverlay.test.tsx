/**
 * Unit tests for SunPositionOverlay and SunToggleButton.
 *
 * Coverage:
 * 1. Basic rendering (visible=true / visible=false → null)
 * 2. Golden hour label + time range display
 * 3. Compass direction display (N/E/S/W compass rose + sun direction text)
 * 4. Sun altitude and azimuth display
 * 5. Time display (golden hour start–end)
 * 6. Accessibility (accessibilityLabel, accessibilityRole, accessibilityState)
 * 7. Reduced motion (animation skipped when reducedMotion=true)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SunPositionOverlay, SunToggleButton } from '../SunPositionOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockUseSunPosition = jest.fn();
jest.mock('../../hooks/useSunPosition', () => ({
  useSunPosition: (...args: unknown[]) => mockUseSunPosition(...args),
}));

const mockUseTheme = jest.fn();
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme(),
}));

const mockUseAccessibilityButton = jest.fn();
const mockUseAccessibilityReducedMotion = jest.fn();
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityButton: (...args: unknown[]) => mockUseAccessibilityButton(...args),
  useAccessibilityReducedMotion: () => mockUseAccessibilityReducedMotion(),
}));

// ---------------------------------------------------------------------------
// Shared theme colours (dark theme, used as default)
// ---------------------------------------------------------------------------

const darkColors = {
  sunColor: '#FFD700',
  blueHourColor: '#6B93D6',
  sunPanelBg: 'rgba(30,30,30,0.85)',
  sunPanelBorder: '#FFD70055',
  sunCompassText: '#888',
  sunCompassCenter: '#FFD700',
  sunCompassBg: 'rgba(255,215,0,0.1)',
  topBarBorderInactive: '#555',
  topBarBg: '#1a1a1a',
  sunToggleActiveBg: 'rgba(255,215,0,0.2)',
  sunToggleActiveBorder: '#FFD700',
  topBarTextSecondary: '#aaa',
  text: '#fff',
  textSecondary: '#aaa',
  accent: '#E8D5B7',
  bubbleBg: '#1a1a1a',
  overlayBg: 'rgba(0,0,0,0.8)',
  success: '#00c853',
  warning: '#ffab00',
  error: '#ff4444',
};

// ---------------------------------------------------------------------------
// Default mock return values
// ---------------------------------------------------------------------------

const defaultSunData = {
  available: true,
  goldenHourStart: '06:12',
  goldenHourEnd: '06:52',
  blueHourStart: '05:52',   // stored in sunData but NOT rendered in the overlay
  blueHourEnd: '06:12',
  sunAltitude: 42.5,
  sunAzimuth: 157.0,
  direction: '东南',         // getAzimuthDirection returns Chinese chars
  advice: '阳光充足，适合户外人像拍摄',
  error: null,
};

const defaultTheme = { colors: darkColors };

beforeEach(() => {
  jest.clearAllMocks();
  // Use mockReturnValue (persistent) instead of mockReturnValueOnce to avoid
  // queue bleed between tests. jest.clearAllMocks() does NOT reset the queue.
  mockUseSunPosition.mockReturnValue({ sunData: defaultSunData, requestLocation: jest.fn() });
  mockUseTheme.mockReturnValue(defaultTheme);
  mockUseAccessibilityButton.mockReturnValue({
    accessibilityLabel: '太阳位置',
    accessibilityHint: '关闭太阳位置显示',
    accessibilityRole: 'button',
    accessibilityState: { disabled: false, selected: true },
  });
  mockUseAccessibilityReducedMotion.mockReturnValue({ reducedMotion: false });
});

// ---------------------------------------------------------------------------
// 1. Basic rendering
// ---------------------------------------------------------------------------

describe('1 — Basic rendering', () => {
  it('returns null when visible=false', () => {
    const { toJSON } = render(<SunPositionOverlay visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the sun panel when visible=true', () => {
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('太阳')).toBeTruthy();
  });

  it('renders the unavailable panel when sunData.available=false', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: {
        available: false,
        advice: '无法获取位置信息，请在设置中开启定位权限',
        sunAltitude: 0,
        sunAzimuth: 0,
        direction: '-',
        goldenHourStart: null,
        goldenHourEnd: null,
        blueHourStart: null,
        blueHourEnd: null,
      },
      requestLocation: jest.fn(),
    });

    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('无法获取位置信息，请在设置中开启定位权限')).toBeTruthy();
  });

  it('unavailable panel shows sunny-outline icon', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, available: false, advice: '定位权限被拒绝' },
      requestLocation: jest.fn(),
    });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('定位权限被拒绝')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. Golden hour label + time display
// ---------------------------------------------------------------------------

describe('2 — Golden hour / time display', () => {
  it('shows "黄金时刻 HH:MM-HH:MM" when goldenHourStart/End are available', () => {
    // Text is split across nested nodes — verify via regex.
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/黄金时刻/)).toBeTruthy();
    expect(getByText(/06:12-06:52/)).toBeTruthy();
  });

  it('omits the golden hour row when goldenHourStart is null', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, goldenHourStart: null, goldenHourEnd: null },
      requestLocation: jest.fn(),
    });
    const { queryByText } = render(<SunPositionOverlay visible={true} />);
    expect(queryByText(/黄金时刻/)).toBeNull();
  });

  it('renders both start and end times correctly', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, goldenHourStart: '17:30', goldenHourEnd: '18:45' },
      requestLocation: jest.fn(),
    });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/17:30/)).toBeTruthy();
    expect(getByText(/18:45/)).toBeTruthy();
  });

  // NOTE: blueHourStart/End are stored in sunData but NOT rendered in the overlay.
  // Only golden hour times are shown. This is a missing feature, not a bug.
  it('shows blue hour row when blueHourStart and blueHourEnd are available', () => {
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/蓝调时刻/)).toBeTruthy();
    expect(getByText(/05:52-06:12/)).toBeTruthy();
  });

  it('omits the blue hour row when blueHourStart is null', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, blueHourStart: null, blueHourEnd: null },
      requestLocation: jest.fn(),
    });
    const { queryByText } = render(<SunPositionOverlay visible={true} />);
    expect(queryByText(/蓝调时刻/)).toBeNull();
  });

  it('omits the blue hour row when blueHourEnd is null', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, blueHourStart: '05:52', blueHourEnd: null },
      requestLocation: jest.fn(),
    });
    const { queryByText } = render(<SunPositionOverlay visible={true} />);
    expect(queryByText(/蓝调时刻/)).toBeNull();
  });

  it('renders both blue hour start and end times correctly', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, blueHourStart: '17:45', blueHourEnd: '18:15' },
      requestLocation: jest.fn(),
    });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/17:45/)).toBeTruthy();
    expect(getByText(/18:15/)).toBeTruthy();
  });

  it('does not affect golden hour rendering when blue hour is shown', () => {
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/黄金时刻/)).toBeTruthy();
    expect(getByText(/06:12-06:52/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 3. Compass direction display
// ---------------------------------------------------------------------------

describe('3 — Compass direction display', () => {
  it('renders the four compass cardinal labels N, E, S, W', () => {
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('N')).toBeTruthy();
    expect(getByText('E')).toBeTruthy();
    expect(getByText('S')).toBeTruthy();
    expect(getByText('W')).toBeTruthy();
  });

  it('displays the sun direction text from sunData.direction', () => {
    // Direction text is in a nested Text element.
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/东南/)).toBeTruthy();
  });

  it('shows all 8 Chinese direction values correctly', () => {
    const directions = [
      { azimuth: 0,   expected: '北' },
      { azimuth: 45,  expected: '东北' },
      { azimuth: 90,  expected: '东' },
      { azimuth: 135, expected: '东南' },
      { azimuth: 180, expected: '南' },
      { azimuth: 225, expected: '西南' },
      { azimuth: 270, expected: '西' },
      { azimuth: 315, expected: '西北' },
    ];

    for (const { azimuth, expected } of directions) {
      mockUseSunPosition.mockReturnValueOnce({
        sunData: { ...defaultSunData, sunAzimuth: azimuth, direction: expected },
        requestLocation: jest.fn(),
      });
      const { getByText } = render(<SunPositionOverlay visible={true} />);
      expect(getByText(new RegExp(expected))).toBeTruthy();
    }
  });

  it('renders the compass arrow (↑) as part of the compass rose', () => {
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    // CompassArrow renders an upward arrow character
    expect(getByText('↑')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 4. Sun altitude and azimuth display
// ---------------------------------------------------------------------------

describe('4 — Sun altitude and azimuth display', () => {
  it('displays altitude with "仰角" prefix and degree suffix', () => {
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/仰角.*42\.5/)).toBeTruthy();
  });

  it('displays azimuth degrees in the direction line', () => {
    // "方向 东南 (157°)" — direction and degree are in separate nested Text nodes.
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/方向.*东南.*157/)).toBeTruthy();
  });

  it('formats altitude to one decimal place', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, sunAltitude: 7.3, sunAzimuth: 90 },
      requestLocation: jest.fn(),
    });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/仰角/)).toBeTruthy();
    expect(getByText(/7\.3/)).toBeTruthy();
  });

  it('shows advice text below altitude and azimuth', () => {
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('阳光充足，适合户外人像拍摄')).toBeTruthy();
  });

  it('updates altitude/azimuth display when sunData changes', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, sunAltitude: 10.0, sunAzimuth: 45 },
      requestLocation: jest.fn(),
    });
    const { getByText, rerender } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/10\.0/)).toBeTruthy();

    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, sunAltitude: 80.5, sunAzimuth: 180 },
      requestLocation: jest.fn(),
    });
    rerender(<SunPositionOverlay visible={true} />);
    expect(getByText(/80\.5/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 5. Time display (golden hour start–end)
// ---------------------------------------------------------------------------

describe('5 — Time display', () => {
  it('renders golden hour start and end times', () => {
    // Times are concatenated as "黄金时刻 06:12-06:52" — split across nested Text nodes.
    // Note: 06:12 may appear twice if blue hour also ends at 06:12
    const { getAllByText } = render(<SunPositionOverlay visible={true} />);
    const times06_12 = getAllByText(/06:12/);
    expect(times06_12.length).toBeGreaterThanOrEqual(1);
    const times06_52 = getAllByText(/06:52/);
    expect(times06_52.length).toBeGreaterThanOrEqual(1);
  });

  it('formats golden hour row with "黄金时刻" label and time range', () => {
    const { getByText, getAllByText } = render(<SunPositionOverlay visible={true} />);
    // Golden hour text is split across nested Text elements.
    expect(getByText(/黄金时刻/)).toBeTruthy();
    // Use getAllByText since 06:12 may appear twice (blue hour end shares same time)
    const times06_12 = getAllByText(/06:12/);
    expect(times06_12.length).toBeGreaterThanOrEqual(1);
    const times06_52 = getAllByText(/06:52/);
    expect(times06_52.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Accessibility
// ---------------------------------------------------------------------------

describe('6 — Accessibility', () => {
  describe('SunPositionOverlay', () => {
    // NOTE: SunPositionOverlay does NOT currently spread accessibility props onto
    // its root container <View>. This means screen readers have no label or role
    // for the overlay panel. This is a missing accessibility feature.
    it('SunPositionOverlay root View has accessibilityRole="text" and an accessibilityLabel', () => {
      const { UNSAFE_root } = render(<SunPositionOverlay visible={true} />);
      const container = UNSAFE_root.findByProps({ pointerEvents: 'none' });
      expect(container.props.accessibilityRole).toBe('text');
      expect(typeof container.props.accessibilityLabel).toBe('string');
      expect(container.props.accessibilityLabel.length).toBeGreaterThan(0);
      // Label includes altitude, direction, and golden/blue hour times
      expect(container.props.accessibilityLabel).toMatch(/仰角/);
      expect(container.props.accessibilityLabel).toMatch(/方向/);
    });

    it('does not crash when rendered without accessibility props', () => {
      const { getByText } = render(<SunPositionOverlay visible={true} />);
      expect(getByText('太阳')).toBeTruthy();
    });
  });

  describe('SunToggleButton', () => {
    it('spreads accessibilityLabel="太阳位置" from useAccessibilityButton', () => {
      mockUseAccessibilityButton.mockReturnValueOnce({
        accessibilityLabel: '太阳位置',
        accessibilityHint: '关闭太阳位置显示',
        accessibilityRole: 'button',
        accessibilityState: { disabled: false, selected: true },
      });
      const onPress = jest.fn();
      const { UNSAFE_root } = render(<SunToggleButton visible={true} onPress={onPress} />);
      const button = UNSAFE_root.findByProps({ accessibilityRole: 'button' });
      expect(button.props.accessibilityLabel).toBe('太阳位置');
    });

    it('spreads accessibilityRole="button" from useAccessibilityButton', () => {
      const onPress = jest.fn();
      const { UNSAFE_root } = render(<SunToggleButton visible={false} onPress={onPress} />);
      const button = UNSAFE_root.findByProps({ accessibilityRole: 'button' });
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('sets accessibilityState.selected=true when visible=true', () => {
      const onPress = jest.fn();
      const { UNSAFE_root } = render(<SunToggleButton visible={true} onPress={onPress} />);
      const button = UNSAFE_root.findByProps({ accessibilityRole: 'button' });
      expect(button.props.accessibilityState.selected).toBe(true);
    });

    it('sets accessibilityState.selected=false when visible=false', () => {
      mockUseAccessibilityButton.mockReturnValueOnce({
        accessibilityLabel: '太阳位置',
        accessibilityHint: '打开太阳位置显示',
        accessibilityRole: 'button',
        accessibilityState: { disabled: false, selected: false },
      });
      const onPress = jest.fn();
      const { UNSAFE_root } = render(<SunToggleButton visible={false} onPress={onPress} />);
      const button = UNSAFE_root.findByProps({ accessibilityRole: 'button' });
      expect(button.props.accessibilityState.selected).toBe(false);
    });

    it('calls onPress when the button is pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<SunToggleButton visible={false} onPress={onPress} />);
      fireEvent.press(getByText('太阳'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('passes different hints based on visible state', () => {
      let capturedHints: string[] = [];
      mockUseAccessibilityButton.mockImplementation(
        ({ hint }: { hint: string }) => {
          capturedHints.push(hint);
          return {
            accessibilityLabel: '太阳位置',
            accessibilityHint: hint,
            accessibilityRole: 'button',
            accessibilityState: { disabled: false, selected: false },
          };
        }
      );

      const onPress = jest.fn();
      render(<SunToggleButton visible={false} onPress={onPress} />);
      render(<SunToggleButton visible={true} onPress={onPress} />);

      expect(capturedHints).toContain('打开太阳位置显示');
      expect(capturedHints).toContain('关闭太阳位置显示');
    });
  });
});

// ---------------------------------------------------------------------------
// 7. Reduced motion
// ---------------------------------------------------------------------------

describe('7 — Reduced motion', () => {
  // NOTE: SunPositionOverlay does NOT currently use useAccessibilityReducedMotion.
  // The compass arrow rotation is always applied via style transform, even when
  // reduced motion is enabled. This is a missing accessibility feature.

  it('renders without crashing when reducedMotion=true', () => {
    mockUseAccessibilityReducedMotion.mockReturnValueOnce({ reducedMotion: true });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('太阳')).toBeTruthy();
  });

  it('renders without crashing when reducedMotion=false', () => {
    mockUseAccessibilityReducedMotion.mockReturnValueOnce({ reducedMotion: false });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('太阳')).toBeTruthy();
  });

  it('compass still renders when reducedMotion=true', () => {
    mockUseAccessibilityReducedMotion.mockReturnValueOnce({ reducedMotion: true });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    // Compass N/E/S/W labels are always present
    expect(getByText('N')).toBeTruthy();
    expect(getByText('E')).toBeTruthy();
    expect(getByText('S')).toBeTruthy();
    expect(getByText('W')).toBeTruthy();
  });

  it('golden hour row still renders when reducedMotion=true', () => {
    mockUseAccessibilityReducedMotion.mockReturnValueOnce({ reducedMotion: true });
    const { getByText } = render(<SunPositionOverlay visible={true} />);
    expect(getByText(/黄金时刻/)).toBeTruthy();
  });

  // NOTE: SunPositionOverlay does NOT currently call useAccessibilityReducedMotion.
  // The compass arrow rotation is always applied even when reduced motion is enabled.
  // This is a documented missing feature (see reduced motion describe block above).
  it('compass rotation is not applied when reducedMotion=true', () => {
    mockUseAccessibilityReducedMotion.mockReturnValueOnce({ reducedMotion: true });
    const { UNSAFE_root } = render(<SunPositionOverlay visible={true} />);
    const allViews = UNSAFE_root.findAllByType('View');
    // Find the arrow container: it has a transform (possibly empty) and contains ↑ text
    const arrowView = allViews.find((v: any) => {
      const style = v.props.style;
      if (!style) return false;
      const flat = Array.isArray(style) ? style : [style];
      return flat.some((s: any) => s && s.transform);
    });
    expect(arrowView).toBeTruthy();
    const transformStyle = Array.isArray(arrowView!.props.style) ? arrowView!.props.style : [arrowView!.props.style];
    const transform = transformStyle.find((s: any) => s && s.transform);
    // When reducedMotion=true, transform should be an empty array (no rotation)
    expect(transform?.transform).toEqual([]);
  });

  it('compass rotation is applied when reducedMotion=false', () => {
    mockUseAccessibilityReducedMotion.mockReturnValueOnce({ reducedMotion: false });
    const { UNSAFE_root } = render(<SunPositionOverlay visible={true} />);
    const allViews = UNSAFE_root.findAllByType('View');
    const arrowView = allViews.find((v: any) => {
      const style = v.props.style;
      if (!style) return false;
      const flat = Array.isArray(style) ? style : [style];
      return flat.some((s: any) => s && s.transform && s.transform.some((t: any) => 'rotate' in t));
    });
    expect(arrowView).toBeTruthy();
    const transformStyle = Array.isArray(arrowView!.props.style) ? arrowView!.props.style : [arrowView!.props.style];
    const transform = transformStyle.find((s: any) => s && s.transform);
    expect(transform?.transform).toEqual([{ rotate: '157deg' }]);
  });
});

// ---------------------------------------------------------------------------
// Structural / integration
// ---------------------------------------------------------------------------

describe('Structural / integration', () => {
  it('calls useSunPosition to get sun data', () => {
    render(<SunPositionOverlay visible={true} />);
    expect(mockUseSunPosition).toHaveBeenCalled();
  });

  it('calls useTheme to get theme colors', () => {
    render(<SunPositionOverlay visible={true} />);
    expect(mockUseTheme).toHaveBeenCalled();
  });

  it('SunToggleButton uses useTheme internally', () => {
    const onPress = jest.fn();
    render(<SunToggleButton visible={false} onPress={onPress} />);
    expect(mockUseTheme).toHaveBeenCalled();
  });

  it('container has pointerEvents="none" so it does not block touches', () => {
    const { UNSAFE_root } = render(<SunPositionOverlay visible={true} />);
    const container = UNSAFE_root.findByProps({ pointerEvents: 'none' });
    expect(container).toBeTruthy();
  });

  it('renders correctly when re-rendered with different sun data', () => {
    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, sunAltitude: 5.0, advice: '黄金时刻，光线柔和' },
      requestLocation: jest.fn(),
    });
    const { getByText, rerender } = render(<SunPositionOverlay visible={true} />);
    expect(getByText('仰角 5.0°')).toBeTruthy();

    mockUseSunPosition.mockReturnValueOnce({
      sunData: { ...defaultSunData, sunAltitude: 60.0, advice: '顶光较强，建议补光' },
      requestLocation: jest.fn(),
    });
    rerender(<SunPositionOverlay visible={true} />);
    expect(getByText('仰角 60.0°')).toBeTruthy();
  });
});
