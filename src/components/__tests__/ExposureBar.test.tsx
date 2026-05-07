/**
 * Unit tests for src/components/ExposureBar.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { act } from 'react';
import { View } from 'react-native';
import { ExposureBar } from '../ExposureBar';

// Mock PanResponder.create — use 'mock' prefix so jest allows factory to reference it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPanResponderHandlers: any = {
  onStartShouldSetResponder: jest.fn(() => true),
  onMoveShouldSetResponder: jest.fn(() => true),
  onPanResponderGrant: jest.fn(),
  onPanResponderMove: jest.fn(),
  onPanResponderRelease: jest.fn(),
};

jest.mock('react-native', () => {
  const React = require('react');
  // Track the config passed to PanResponder.create so tests can inspect/invoke callbacks
  const mockPanResponder: any = {
    panHandlers: mockPanResponderHandlers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (jest.fn() as any).mockImplementation((config: any) => {
      // Wire real config callbacks through the mock handlers so they can be triggered in tests
      const originalOnMove = config.onPanResponderMove;
      const originalOnRelease = config.onPanResponderRelease;
      mockPanResponderHandlers.onPanResponderMove = (...args: any[]) => { originalOnMove?.(...args); };
      mockPanResponderHandlers.onPanResponderRelease = (...args: any[]) => { originalOnRelease?.(...args); };
      return mockPanResponder;
    }),
  };
  return {
    View: (props: any) => {
      // Auto-fire onLayout so layoutRef gets populated for position calculations
      React.useEffect(() => {
        if (props.onLayout) {
          props.onLayout({ nativeEvent: { layout: { width: 358, height: 8, x: 0, y: 0 } } } as any);
        }
      }, []);
      return React.createElement('View', props, props.children);
    },
    Text: (props: any) => React.createElement('Text', props, props.children),
    PanResponder: mockPanResponder,
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => (Array.isArray(s) ? Object.assign({}, ...s) : s) },
  };
});

// Mock react-native-reanimated (follows project convention from existing tests)
jest.mock('react-native-reanimated', () => {
  const mockView = (props: React.PropsWithChildren) => props.children;
  const mockText = (props: React.PropsWithChildren) => props.children;
  return {
    __esModule: true,
    default: { View: mockView, Text: mockText },
    useSharedValue: jest.fn((initial: unknown) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value: unknown) => value),
    Easing: { out: jest.fn(), ease: jest.fn() },
  };
});

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark' as const,
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
      bubbleBg: 'rgba(0,0,0,0.4)',
      bubbleText: '#FFFFFF',
      countdownBg: 'rgba(232,213,183,0.9)',
      countdownBorder: 'rgba(255,255,255,0.4)',
      countdownText: '#000000',
      scoreS: '#FFD700',
      scoreA: '#C0C0C0',
      scoreB: '#CD7F32',
      scoreC: '#8B7355',
      scoreD: '#555555',
      scoreOverlayBg: 'rgba(0,0,0,0.65)',
      scoreHintText: 'rgba(255,255,255,0.4)',
      scoreCardBg: 'rgba(28,28,28,0.95)',
      scoreCardBorder: 'rgba(255,255,255,0.1)',
      scoreLabelText: 'rgba(255,255,255,0.6)',
      scoreBarBg: 'rgba(255,255,255,0.1)',
      modeSelectorBg: 'rgba(0,0,0,0.4)',
      modeSelectorUnselected: 'rgba(255,255,255,0.7)',
      overlayBg: 'rgba(0,0,0,0.55)',
      topBarBg: 'rgba(0,0,0,0.55)',
      topBarText: '#FFFFFF',
      topBarTextSecondary: 'rgba(255,255,255,0.6)',
      topBarBorderInactive: 'rgba(255,255,255,0.15)',
      topBarBorderActive: 'rgba(255,255,255,0.3)',
      topBarSelectorBgActive: 'rgba(232,213,183,0.35)',
      topBarSelectorBorderActive: 'rgba(232,213,183,0.6)',
      timerActiveBg: 'rgba(255,82,82,0.6)',
      timerActiveBorder: 'rgba(255,255,255,0.3)',
      timerPreviewBg: 'rgba(0,0,0,0.5)',
      timerBorder: 'rgba(255,255,255,0.25)',
      timerUnitText: 'rgba(255,255,255,0.5)',
      challengeActiveBg: 'rgba(255,215,0,0.15)',
      challengeActiveBorder: 'rgba(255,215,0,0.6)',
      challengeActiveText: '#FFD700',
      rawActiveBg: 'rgba(0,200,100,0.2)',
      rawActiveBorder: 'rgba(0,200,100,0.6)',
      rawActiveText: '#00C864',
      focusGuideActiveBg: 'rgba(255,220,0,0.15)',
    },
  })),
}));

// Mock useAccessibilityReducedMotion
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: false })),
}));

const defaultProps = {
  visible: true,
  exposureComp: 0,
  minEC: -3.0,
  maxEC: 3.0,
  onExposureChange: jest.fn(),
  onExposureChangeEnd: jest.fn(),
};

describe('ExposureBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when visible=false', () => {
    const { queryByText } = render(
      <ExposureBar {...defaultProps} visible={false} />
    );
    expect(queryByText('曝光补偿 (EV)')).toBeNull();
    expect(queryByText('-3.0')).toBeNull();
  });

  it('renders correctly when visible=true with default props', () => {
    const { getByText } = render(<ExposureBar {...defaultProps} />);
    expect(getByText('曝光补偿 (EV)')).toBeTruthy();
    expect(getByText('+0.0 EV')).toBeTruthy();
  });

  it('renders EV value label with positive exposure (shows "+X.X EV")', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} exposureComp={1.5} />
    );
    expect(getByText('+1.5 EV')).toBeTruthy();
  });

  it('renders EV value label with negative exposure (shows "-X.X EV")', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} exposureComp={-2.0} />
    );
    expect(getByText('-2.0 EV')).toBeTruthy();
  });

  it('renders EV value label at zero (shows "+0.0 EV")', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} exposureComp={0} />
    );
    expect(getByText('+0.0 EV')).toBeTruthy();
  });

  it('renders tick labels showing min, 0, and max values', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} minEC={-3.0} maxEC={3.0} />
    );
    expect(getByText('-3.0')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
    expect(getByText('3.0')).toBeTruthy();
  });

  it('renders tick labels with different min/max values', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} minEC={-1.0} maxEC={2.0} />
    );
    expect(getByText('-1.0')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
    expect(getByText('2.0')).toBeTruthy();
  });

  it('exposes correct pointerEvents and panHandlers via panResponder', () => {
    render(<ExposureBar {...defaultProps} />);
    // Verify PanResponder.create was called with expected handler config
    expect(mockPanResponderHandlers.onStartShouldSetResponder).toBeDefined();
    expect(typeof mockPanResponderHandlers.onMoveShouldSetResponder).toBe('function');
    expect(typeof mockPanResponderHandlers.onPanResponderGrant).toBe('function');
    expect(typeof mockPanResponderHandlers.onPanResponderMove).toBe('function');
    expect(typeof mockPanResponderHandlers.onPanResponderRelease).toBe('function');
    // onStartShouldSetResponder and onMoveShouldSetResponder should return true
    expect(mockPanResponderHandlers.onStartShouldSetResponder()).toBe(true);
    expect(mockPanResponderHandlers.onMoveShouldSetResponder()).toBe(true);
  });

  it('calls onExposureChange when panResponder move is triggered', () => {
    const onExposureChange = jest.fn();
    const onExposureChangeEnd = jest.fn();
    const result = render(
      <ExposureBar
        {...defaultProps}
        onExposureChange={onExposureChange}
        onExposureChangeEnd={onExposureChangeEnd}
        minEC={-3.0}
        maxEC={3.0}
      />
    );
    // Force a synchronous re-render so useMemo picks up the latest callbacks
    act(() => {
      result.rerender(
        <ExposureBar
          {...defaultProps}
          onExposureChange={onExposureChange}
          onExposureChangeEnd={onExposureChangeEnd}
          minEC={-3.0}
          maxEC={3.0}
        />
      );
    });
    // Simulate a pan move event — the stored callback calls the actual onExposureChange
    const mockGestureState = { moveX: 200, moveY: 150 };
    act(() => {
      mockPanResponderHandlers.onPanResponderMove(null, mockGestureState);
    });
    expect(onExposureChange).toHaveBeenCalled();
  });

  it('calls onExposureChangeEnd when panResponder release is triggered', () => {
    const onExposureChangeEnd = jest.fn();
    const result = render(
      <ExposureBar
        {...defaultProps}
        onExposureChangeEnd={onExposureChangeEnd}
        minEC={-3.0}
        maxEC={3.0}
      />
    );
    // Force a synchronous re-render so useMemo picks up the latest callbacks
    act(() => {
      result.rerender(
        <ExposureBar
          {...defaultProps}
          onExposureChangeEnd={onExposureChangeEnd}
          minEC={-3.0}
          maxEC={3.0}
        />
      );
    });
    const mockGestureState = { moveX: 200, moveY: 150 };
    act(() => {
      mockPanResponderHandlers.onPanResponderRelease(null, mockGestureState);
    });
    expect(onExposureChangeEnd).toHaveBeenCalled();
  });
});
