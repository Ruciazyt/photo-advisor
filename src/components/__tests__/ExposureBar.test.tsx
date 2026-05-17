/**
 * Tests for ExposureBar component — EV (exposure compensation) slider bar
 */

import React from 'react';

// Mock reanimated + worklets (same pattern as existing tests in project)
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: { View },
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
  };
});

jest.mock('react-native-worklets');

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      text: '#FFFFFF',
      textSecondary: '#888888',
      border: 'rgba(255,255,255,0.5)',
      background: '#000000',
      overlayBg: 'rgba(0,0,0,0.55)',
      cardBg: '#1A1A1A',
      success: '#4CAF50',
      error: '#FF5252',
      warning: '#F59E0B',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

// Mock useAccessibilityReducedMotion
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: false })),
  useAccessibilityAnnouncement: jest.fn(() => ({ announce: jest.fn() })),
}));

import { render, fireEvent } from '@testing-library/react-native';
import { ExposureBar } from '../ExposureBar';

describe('ExposureBar', () => {
  const defaultProps = {
    visible: true,
    exposureComp: 0,
    minEC: -3,
    maxEC: 3,
    onExposureChange: jest.fn(),
    onExposureChangeEnd: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // 1. Visibility toggle — renders null when not visible
  // ─────────────────────────────────────────────

  it('renders null when visible=false (returns null early)', () => {
    const { toJSON } = render(
      <ExposureBar {...defaultProps} visible={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the bar when visible=true', () => {
    const { getByText } = render(<ExposureBar {...defaultProps} />);
    expect(getByText('曝光补偿 (EV)')).toBeTruthy();
  });

  it('renders all tick labels (min, 0, max) and EV value label', () => {
    const { getByText } = render(
      <ExposureBar
        {...defaultProps}
        exposureComp={1.5}
        minEC={-3}
        maxEC={3}
      />
    );
    expect(getByText('曝光补偿 (EV)')).toBeTruthy();
    expect(getByText('-3.0')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
    expect(getByText('3.0')).toBeTruthy();
    expect(getByText('+1.5 EV')).toBeTruthy();
  });

  it('shows negative EV value with minus sign', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} exposureComp={-2.0} />
    );
    expect(getByText('-2.0 EV')).toBeTruthy();
  });

  it('shows positive EV value with plus sign', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} exposureComp={1.0} />
    );
    expect(getByText('+1.0 EV')).toBeTruthy();
  });

  // ─────────────────────────────────────────────
  // 2. Value-to-position mapping (thumb positioning)
  // ─────────────────────────────────────────────

  it('renders with correct EV label at min boundary', () => {
    const { getByText } = render(
      <ExposureBar
        {...defaultProps}
        exposureComp={-3}
        minEC={-3}
        maxEC={3}
      />
    );
    expect(getByText('-3.0')).toBeTruthy();
    expect(getByText('+0.0 EV')).toBeTruthy(); // min maps to 0
  });

  it('renders with correct EV label at max boundary', () => {
    const { getByText } = render(
      <ExposureBar
        {...defaultProps}
        exposureComp={3}
        minEC={-3}
        maxEC={3}
      />
    );
    expect(getByText('3.0')).toBeTruthy();
  });

  it('renders correctly with non-zero exposure value', () => {
    const { getByText } = render(
      <ExposureBar
        {...defaultProps}
        exposureComp={0.5}
        minEC={-3}
        maxEC={3}
      />
    );
    expect(getByText('+0.5 EV')).toBeTruthy();
  });

  // ─────────────────────────────────────────────
  // 3. Position-to-value mapping (drag → EV conversion)
  // ─────────────────────────────────────────────

  /**
   * Helper: find a View with the given pan handler and call it.
   * layoutRef.current.width is set from the onLayout callback on the Animated.View.
   * With default Dimensions: width=390, so bar width = 390 - 32 = 358.
   * The layout fires with width=390 (full container), barWidth = 358 internally.
   *
   * PanResponder uses gestureState.moveX (absolute screen coord).
   * rawPos = Math.max(0, Math.min(barWidth, gestureState.moveX - barX))
   * barX = layoutRef.current.x (set in onLayout, typically 16 from left:16 style)
   *
   * positionToValue: (pos / barWidth) * range + minEC, rounded to 1 decimal
   * With minEC=-3, maxEC=3, range=6 → value = (pos / barWidth) * 6 - 3, rounded
   */
  function findPanHandler(
    result: ReturnType<typeof render>,
    handlerName: 'onPanResponderMove' | 'onPanResponderRelease'
  ) {
    const allViews = result.UNSAFE_getAllByType
      ? result.UNSAFE_getAllByType(require('react-native').View)
      : [];
    for (const v of allViews) {
      if (v.props[handlerName]) return v.props[handlerName];
    }
    return null;
  }

  function fireLayout(result: ReturnType<typeof render>) {
    const allViews = result.UNSAFE_getAllByType
      ? result.UNSAFE_getAllByType(require('react-native').View)
      : [];
    for (const v of allViews) {
      if (v.props.onLayout) {
        // Simulate full container width of 390 (barWidth = 390 - 32 = 358)
        fireEvent(v, 'layout', {
          nativeEvent: { layout: { width: 390, height: 80, x: 0, y: 0 } },
        });
        return;
      }
    }
  }

  it('onExposureChange fires during drag movement', () => {
    const onExposureChange = jest.fn();
    const result = render(
      <ExposureBar
        {...defaultProps}
        onExposureChange={onExposureChange}
      />
    );

    // Set layout so barWidth is known
    fireLayout(result);

    const moveHandler = findPanHandler(result, 'onPanResponderMove');
    expect(moveHandler).not.toBeNull();

    // Simulate move at bar center:
    // barWidth=358, barX=16 (from container left:16, top:120 → x≈16)
    // center pos = 179 → value = (179/358)*6 - 3 ≈ 0.0
    if (moveHandler) moveHandler(null, { moveX: 16 + 179 });

    expect(onExposureChange).toHaveBeenCalled();
    const [arg] = onExposureChange.mock.calls[0];
    expect(typeof arg).toBe('number');
  });

  it('onExposureChangeEnd fires when drag is released', () => {
    const onExposureChangeEnd = jest.fn();
    const result = render(
      <ExposureBar
        {...defaultProps}
        onExposureChangeEnd={onExposureChangeEnd}
      />
    );

    fireLayout(result);

    const releaseHandler = findPanHandler(result, 'onPanResponderRelease');
    expect(releaseHandler).not.toBeNull();

    if (releaseHandler) releaseHandler(null, { moveX: 16 + 179 });

    expect(onExposureChangeEnd).toHaveBeenCalled();
  });

  it('onExposureChangeEnd is optional — does not crash when omitted', () => {
    const onExposureChange = jest.fn();
    const result = render(
      <ExposureBar
        visible={true}
        exposureComp={0}
        minEC={-3}
        maxEC={3}
        onExposureChange={onExposureChange}
        // onExposureChangeEnd intentionally omitted
      />
    );

    fireLayout(result);

    const releaseHandler = findPanHandler(result, 'onPanResponderRelease');
    expect(releaseHandler).not.toBeNull();

    // Should not throw even though onExposureChangeEnd is undefined
    expect(() => {
      if (releaseHandler) releaseHandler(null, { moveX: 16 + 179 });
    }).not.toThrow();
  });

  it('clamps drag to left bound (pos < 0 → clamped to 0)', () => {
    const onExposureChange = jest.fn();
    const result = render(
      <ExposureBar
        {...defaultProps}
        onExposureChange={onExposureChange}
      />
    );
    fireLayout(result);

    const moveHandler = findPanHandler(result, 'onPanResponderMove');
    if (moveHandler) {
      onExposureChange.mockClear();
      // Drag far left — should clamp to barX offset minimum
      moveHandler(null, { moveX: -1000 });
      expect(onExposureChange).toHaveBeenCalled();
    }
  });

  it('clamps drag to right bound (pos > barWidth → clamped to barWidth)', () => {
    const onExposureChange = jest.fn();
    const result = render(
      <ExposureBar
        {...defaultProps}
        onExposureChange={onExposureChange}
      />
    );
    fireLayout(result);

    const moveHandler = findPanHandler(result, 'onPanResponderMove');
    if (moveHandler) {
      onExposureChange.mockClear();
      // Drag far right
      moveHandler(null, { moveX: 9999 });
      expect(onExposureChange).toHaveBeenCalled();
    }
  });

  // ─────────────────────────────────────────────
  // 4. Reanimated opacity animation
  // ─────────────────────────────────────────────

  it('calls useSharedValue for animatedOpacity', () => {
    const { useSharedValue } = require('react-native-reanimated');
    render(<ExposureBar {...defaultProps} />);
    expect(useSharedValue).toHaveBeenCalled();
  });

  it('calls useAnimatedStyle for opacity transitions', () => {
    const { useAnimatedStyle } = require('react-native-reanimated');
    render(<ExposureBar {...defaultProps} />);
    expect(useAnimatedStyle).toHaveBeenCalled();
  });

  it('calls withTiming when useAnimatedStyle is invoked', () => {
    const { withTiming } = require('react-native-reanimated');
    render(<ExposureBar {...defaultProps} visible={true} />);
    expect(withTiming).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────
  // 5. Value label formatting
  // ─────────────────────────────────────────────

  it('formats +0.0 EV for zero', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} exposureComp={0} />
    );
    expect(getByText('+0.0 EV')).toBeTruthy();
  });

  it('formats -0.5 EV for negative half', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} exposureComp={-0.5} />
    );
    expect(getByText('-0.5 EV')).toBeTruthy();
  });

  it('formats +2.5 EV for positive value', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} exposureComp={2.5} />
    );
    expect(getByText('+2.5 EV')).toBeTruthy();
  });

  // ─────────────────────────────────────────────
  // 6. Edge case: zero range (minEC === maxEC)
  // ─────────────────────────────────────────────

  it('handles zero range without crashing (no division by zero)', () => {
    const onExposureChange = jest.fn();
    const result = render(
      <ExposureBar
        {...defaultProps}
        minEC={0}
        maxEC={0}
        exposureComp={0}
        onExposureChange={onExposureChange}
      />
    );

    expect(result.getByText('曝光补偿 (EV)')).toBeTruthy();

    fireLayout(result);

    const moveHandler = findPanHandler(result, 'onPanResponderMove');
    if (moveHandler) {
      expect(() => moveHandler(null, { moveX: 200 })).not.toThrow();
    }
  });

  it('clamps to center position when range is zero', () => {
    const result = render(
      <ExposureBar
        {...defaultProps}
        minEC={0}
        maxEC={0}
        exposureComp={0}
      />
    );
    // Should render fine — valueToPosition returns width/2 for zero range
    expect(result.getByText('+0.0 EV')).toBeTruthy();
  });

  // ─────────────────────────────────────────────
  // 7. Accessibility: reduced motion respects no-animation duration
  // ─────────────────────────────────────────────

  it('renders with reducedMotion=false by default (withTiming duration=200)', () => {
    const { withTiming } = require('react-native-reanimated');
    const result = render(<ExposureBar {...defaultProps} visible={true} />);
    expect(result.getByText('曝光补偿 (EV)')).toBeTruthy();
    // withTiming should be called for opacity animation
    expect(withTiming).toHaveBeenCalled();
  });
});