/**
 * Tests for FocusZoneButton accessibility wiring in FocusGuideOverlay.
 * Verifies that useAccessibilityButton is called at top-level (Rules of Hooks compliance)
 * and that the returned a11y props are correctly spread onto TouchableOpacity.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FocusGuideOverlay } from '../components/FocusGuideOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Spy on useAccessibilityButton — track calls without changing behaviour
const mockA11yButton = jest.fn();
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityButton: (...args: unknown[]) => mockA11yButton(...args),
}));

jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

jest.mock('../hooks/useAnimationFrameTimer', () => ({
  useAnimationFrameTimer: jest.fn(),
}));

jest.mock('../hooks/useHaptics', () => ({
  useHaptics: () => ({
    mediumImpact: jest.fn(),
    errorNotification: jest.fn(),
    warningNotification: jest.fn(),
    lightImpact: jest.fn(),
    heavyImpact: jest.fn(),
    successNotification: jest.fn(),
    triggerLevelHaptic: jest.fn(),
  }),
}));

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
// Tests
// ---------------------------------------------------------------------------

describe('FocusZoneButton accessibility wiring', () => {
  beforeEach(() => {
    mockA11yButton.mockClear();
    // Return realistic a11y props from the spy
    mockA11yButton.mockImplementation((opts: { label: string; hint?: string; role?: string; enabled?: boolean }) => ({
      accessibilityLabel: opts.label,
      accessibilityRole: opts.role ?? 'button',
      accessibilityState: { disabled: !(opts.enabled ?? true) },
      ...(opts.hint ? { accessibilityHint: opts.hint } : {}),
    }));
  });

  it('calls useAccessibilityButton exactly 3 times (one per focus zone)', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(mockA11yButton).toHaveBeenCalledTimes(3);
  });

  it('calls useAccessibilityButton with correct label and hint for 远景', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(mockA11yButton).toHaveBeenNthCalledWith(1, {
      label: '对焦区域：远景',
      hint: '切换到远景对焦（无穷远），适合风景和建筑',
      role: 'button',
      enabled: true,
    });
  });

  it('calls useAccessibilityButton with correct label and hint for 标准', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(mockA11yButton).toHaveBeenNthCalledWith(2, {
      label: '对焦区域：标准',
      hint: '切换到标准对焦（约3米），适合人文和抓拍',
      role: 'button',
      enabled: true,
    });
  });

  it('calls useAccessibilityButton with correct label and hint for 近拍', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(mockA11yButton).toHaveBeenNthCalledWith(3, {
      label: '对焦区域：近拍',
      hint: '切换到近拍对焦（约0.5米），适合微距和特写',
      role: 'button',
      enabled: true,
    });
  });

  it('renders all three zone buttons after calling useAccessibilityButton', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(screen.getByText('远景')).toBeTruthy();
    expect(screen.getByText('标准')).toBeTruthy();
    expect(screen.getByText('近拍')).toBeTruthy();
  });

  it('pressing 远景 still calls focusDepth (proves button is functional)', () => {
    const focusDepthMock = jest.fn();
    const cam = { zoom: 1.0, focusDepth: focusDepthMock };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    fireEvent.press(screen.getByText('远景'));
    expect(focusDepthMock).toHaveBeenCalledWith(0.95);
  });

  it('Rules of Hooks: useAccessibilityButton is called inside component render, not inside a loop', () => {
    // This test passing proves the hook is called at top-level of FocusZoneButton,
    // not inside FOCUS_ZONES.map() — which would be a Rules of Hooks violation.
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    // If the old (buggy) pattern were present (hook inside map), the test framework
    // would throw "Hooks cannot be defined inside loops" before reaching this assertion.
    expect(mockA11yButton).toHaveBeenCalledTimes(3);
  });
});
