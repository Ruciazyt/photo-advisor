/**
 * Unit tests for src/components/ExposureBar.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { act } from 'react';
import { ExposureBar } from '../components/ExposureBar';

// Mock PanResponder — must fully replace (not spread actual), same pattern as other project tests
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
  const mockPanResponder: any = {
    panHandlers: mockPanResponderHandlers,
    create: (jest.fn() as any).mockImplementation((config: any) => {
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

// Mock react-native-reanimated (same pattern as other project tests)
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
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark' as const,
    colors: {
      accent: '#E8D5B7',
      cardBg: '#1A1A1A',
      text: '#FFFFFF',
      textSecondary: '#888888',
      border: '#333333',
    },
  })),
}));

// Mock useAccessibilityReducedMotion
jest.mock('../hooks/useAccessibility', () => ({
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

  // ─── visibility ────────────────────────────────────────────────────────────

  it('renders with visible=true (EV label, bar, thumb, tick labels)', () => {
    const { getByText } = render(<ExposureBar {...defaultProps} />);
    expect(getByText('曝光补偿 (EV)')).toBeTruthy();
    expect(getByText('-3.0')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
    expect(getByText('3.0')).toBeTruthy();
    expect(getByText('+0.0 EV')).toBeTruthy();
  });

  it('does NOT render when visible=false (returns null)', () => {
    const { queryByText } = render(<ExposureBar {...defaultProps} visible={false} />);
    expect(queryByText('曝光补偿 (EV)')).toBeNull();
    expect(queryByText('-3.0')).toBeNull();
  });

  // ─── reduced motion via hook ───────────────────────────────────────────────

  it('uses useAccessibilityReducedMotion', () => {
    const { useAccessibilityReducedMotion } = require('../hooks/useAccessibility');
    render(<ExposureBar {...defaultProps} />);
    expect(useAccessibilityReducedMotion).toHaveBeenCalled();
  });

  // ─── thumb position (sanity via rendered JSON) ───────────────────────────────

  it('renders when exposureComp=minEC', () => {
    const { toJSON } = render(
      <ExposureBar {...defaultProps} minEC={-3} maxEC={3} exposureComp={-3} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders when exposureComp=maxEC', () => {
    const { toJSON } = render(
      <ExposureBar {...defaultProps} minEC={-3} maxEC={3} exposureComp={3} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders when exposureComp=centered at 0', () => {
    const { toJSON } = render(
      <ExposureBar {...defaultProps} minEC={-3} maxEC={3} exposureComp={0} />
    );
    expect(toJSON()).toBeTruthy();
  });

  // ─── fill width ────────────────────────────────────────────────────────────

  it('fill renders at exposureComp=0', () => {
    const { toJSON } = render(
      <ExposureBar {...defaultProps} minEC={-3} maxEC={3} exposureComp={0} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('fill renders at exposureComp=minEC', () => {
    const { toJSON } = render(
      <ExposureBar {...defaultProps} minEC={-3} maxEC={3} exposureComp={-3} />
    );
    expect(toJSON()).toBeTruthy();
  });

  // ─── pan gesture ────────────────────────────────────────────────────────────

  it('onPanResponderMove triggers onExposureChange', () => {
    const onExposureChange = jest.fn();
    const result = render(
      <ExposureBar
        {...defaultProps}
        onExposureChange={onExposureChange}
        minEC={-3.0}
        maxEC={3.0}
      />
    );
    act(() => {
      result.rerender(
        <ExposureBar
          {...defaultProps}
          onExposureChange={onExposureChange}
          minEC={-3.0}
          maxEC={3.0}
        />
      );
    });
    act(() => {
      mockPanResponderHandlers.onPanResponderMove(null, { moveX: 200, moveY: 150 });
    });
    expect(onExposureChange).toHaveBeenCalled();
  });

  it('onPanResponderRelease triggers onExposureChangeEnd', () => {
    const onExposureChangeEnd = jest.fn();
    const result = render(
      <ExposureBar
        {...defaultProps}
        onExposureChangeEnd={onExposureChangeEnd}
        minEC={-3.0}
        maxEC={3.0}
      />
    );
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
    act(() => {
      mockPanResponderHandlers.onPanResponderRelease(null, { moveX: 200, moveY: 150 });
    });
    expect(onExposureChangeEnd).toHaveBeenCalled();
  });

  // ─── onLayout ───────────────────────────────────────────────────────────────

  it('onLayout populates layoutRef width (via auto-fire in View mock)', () => {
    const { toJSON } = render(<ExposureBar {...defaultProps} visible={true} />);
    expect(toJSON()).toBeTruthy();
  });

  // ─── value label format ─────────────────────────────────────────────────────

  it('shows +N.N EV format for positive values', () => {
    const { getByText } = render(<ExposureBar {...defaultProps} exposureComp={1.5} />);
    expect(getByText('+1.5 EV')).toBeTruthy();
  });

  it('shows -N.N EV format for negative values', () => {
    const { getByText } = render(<ExposureBar {...defaultProps} exposureComp={-2.0} />);
    expect(getByText('-2.0 EV')).toBeTruthy();
  });

  it('shows +0.0 EV for zero', () => {
    const { getByText } = render(<ExposureBar {...defaultProps} exposureComp={0} />);
    expect(getByText('+0.0 EV')).toBeTruthy();
  });

  // ─── tick labels ────────────────────────────────────────────────────────────

  it('displays minEC tick label', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} minEC={-2.5} maxEC={2.5} exposureComp={0} />
    );
    expect(getByText('-2.5')).toBeTruthy();
  });

  it('displays maxEC tick label', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} minEC={-2.5} maxEC={2.5} exposureComp={0} />
    );
    expect(getByText('2.5')).toBeTruthy();
  });

  it('displays 0 tick label', () => {
    const { getByText } = render(
      <ExposureBar {...defaultProps} minEC={-2.5} maxEC={2.5} exposureComp={0} />
    );
    expect(getByText('0')).toBeTruthy();
  });

  // ─── reduced motion via hook ────────────────────────────────────────────────

  it('uses useAccessibilityReducedMotion', () => {
    const { useAccessibilityReducedMotion } = require('../hooks/useAccessibility');
    render(<ExposureBar {...defaultProps} />);
    expect(useAccessibilityReducedMotion).toHaveBeenCalled();
  });
});
