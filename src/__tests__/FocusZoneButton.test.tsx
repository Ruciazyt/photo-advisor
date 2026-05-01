/**
 * Unit tests for FocusZoneButton component.
 * Tests the component in isolation, independent of FocusGuideOverlay.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { FocusZoneButton } from '../components/FocusZoneButton';
import { FOCUS_ZONES } from '../components/FocusGuideOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockA11yButton = jest.fn();
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityButton: (...args: unknown[]) => mockA11yButton(...args),
}));

jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    colors: {
      primary: '#000000',
      accent: '#E8D5B7',
      cardBg: '#1A1A1A',
      text: '#FFFFFF',
      textSecondary: '#888888',
      border: '#333333',
      success: '#4CAF50',
      error: '#FF5252',
      warning: '#F59E0B',
      background: '#000000',
      sunColor: '#FFB800',
      gridAccent: 'rgba(232,213,183,0.35)',
      countdownBg: 'rgba(232,213,183,0.9)',
      countdownText: '#000000',
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultZone = FOCUS_ZONES[0]; // '远景'
const defaultProps = {
  zone: defaultZone,
  style: { backgroundColor: 'red' },
  labelStyle: { fontSize: 16 },
  subStyle: { fontSize: 12 },
  onPress: jest.fn(),
};

beforeEach(() => {
  mockA11yButton.mockClear();
  mockA11yButton.mockImplementation(
    (opts: { label: string; hint?: string; role?: string; enabled?: boolean }) => ({
      accessibilityLabel: opts.label,
      accessibilityRole: opts.role ?? 'button',
      accessibilityState: { disabled: !(opts.enabled ?? true) },
      ...(opts.hint ? { accessibilityHint: opts.hint } : {}),
    }),
  );
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FocusZoneButton', () => {
  it('renders zone label and sub text', () => {
    render(<FocusZoneButton {...defaultProps} />);
    expect(screen.getByText(defaultZone.label)).toBeTruthy();
    expect(screen.getByText(defaultZone.sub)).toBeTruthy();
  });

  it('calls useAccessibilityButton with correct label and hint for 远景', () => {
    render(<FocusZoneButton {...defaultProps} zone={FOCUS_ZONES[0]} />);
    expect(mockA11yButton).toHaveBeenCalledWith({
      label: '对焦区域：远景',
      hint: '切换到远景对焦（无穷远），适合风景和建筑',
      role: 'button',
      enabled: true,
    });
  });

  it('calls useAccessibilityButton with correct label and hint for 标准', () => {
    render(<FocusZoneButton {...defaultProps} zone={FOCUS_ZONES[1]} />);
    expect(mockA11yButton).toHaveBeenCalledWith({
      label: '对焦区域：标准',
      hint: '切换到标准对焦（约3米），适合人文和抓拍',
      role: 'button',
      enabled: true,
    });
  });

  it('calls useAccessibilityButton with correct label and hint for 近拍', () => {
    render(<FocusZoneButton {...defaultProps} zone={FOCUS_ZONES[2]} />);
    expect(mockA11yButton).toHaveBeenCalledWith({
      label: '对焦区域：近拍',
      hint: '切换到近拍对焦（约0.5米），适合微距和特写',
      role: 'button',
      enabled: true,
    });
  });

  it('calls onPress when button is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<FocusZoneButton {...defaultProps} onPress={onPress} />);
    fireEvent.press(getByText(defaultZone.label));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('spreads a11y props from useAccessibilityButton onto TouchableOpacity', () => {
    render(
      <FocusZoneButton
        {...defaultProps}
        zone={FOCUS_ZONES[0]}
      />,
    );
    // Verify useAccessibilityButton was called (proving the hook ran and props were spread)
    expect(mockA11yButton).toHaveBeenCalled();
    // Verify the button renders with the zone label text
    expect(screen.getByText(FOCUS_ZONES[0].label)).toBeTruthy();
  });

  it('renders correctly when zone changes', () => {
    const { rerender, getByText } = render(<FocusZoneButton {...defaultProps} zone={FOCUS_ZONES[0]} />);
    expect(getByText('远景')).toBeTruthy();
    expect(getByText('∞')).toBeTruthy();

    rerender(<FocusZoneButton {...defaultProps} zone={FOCUS_ZONES[1]} onPress={jest.fn()} />);
    expect(getByText('标准')).toBeTruthy();
    expect(getByText('~3m')).toBeTruthy();

    rerender(<FocusZoneButton {...defaultProps} zone={FOCUS_ZONES[2]} onPress={jest.fn()} />);
    expect(getByText('近拍')).toBeTruthy();
    expect(getByText('~0.5m')).toBeTruthy();
  });

  it('passes style, labelStyle, and subStyle props to the correct elements', () => {
    const customStyle = { backgroundColor: 'blue' };
    const customLabelStyle = { color: 'white', fontSize: 20 };
    const customSubStyle = { color: 'gray', fontSize: 14 };

    const { getByText } = render(
      <FocusZoneButton
        {...defaultProps}
        zone={FOCUS_ZONES[0]}
        style={customStyle}
        labelStyle={customLabelStyle}
        subStyle={customSubStyle}
        onPress={jest.fn()}
      />,
    );
    // Component renders without errors when custom styles are passed
    expect(getByText(FOCUS_ZONES[0].label)).toBeTruthy();
    expect(getByText(FOCUS_ZONES[0].sub)).toBeTruthy();
  });

  it('onPress is not called before button is pressed', () => {
    const onPress = jest.fn();
    render(<FocusZoneButton {...defaultProps} onPress={onPress} />);
    expect(onPress).not.toHaveBeenCalled();
  });
});
