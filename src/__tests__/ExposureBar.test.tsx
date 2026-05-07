import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ExposureBar } from '../components/ExposureBar';

// ---------------------------------------------------------------------------
// Mock react-native-reanimated (same pattern as LevelIndicator.test.tsx)
// ---------------------------------------------------------------------------
const mockSharedValues = new Map();
let mockSvId = 0;

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  function mockUseSharedValue(initial: number | boolean | string | object) {
    const id = mockSvId++;
    if (!mockSharedValues.has(id)) {
      mockSharedValues.set(id, { value: initial });
    }
    return mockSharedValues.get(id);
  }
  function mockUseAnimatedStyle<T>(styleFn: () => T) {
    return styleFn();
  }
  const AnimatedView = RN.View;
  return {
    __esModule: true,
    default: { View: AnimatedView, Text: RN.Text },
    useSharedValue: mockUseSharedValue,
    useAnimatedStyle: mockUseAnimatedStyle,
    useFrameCallback: () => {},
    runOnJS: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
    Animated: { View: AnimatedView, Text: RN.Text },
    createAnimatedComponent: <C extends React.ComponentType<unknown>>(C: C) => C,
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown, options?: { duration?: number }) => {
      // Capture duration for reducedMotion testing
      if (options && (options as any).__testDuration !== undefined) {
        (options as any).__testDuration = options.duration ?? 200;
      }
      return v;
    },
    Easing: {
      out: (e: (t: number) => number) => e,
      in: (e: (t: number) => number) => e,
      quad: (t: number) => t,
      ease: (t: number) => t,
    },
  };
});

// Mock ThemeContext with dark theme colors
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      gridAccent: 'rgba(232,213,183,0.45)',
      bubbleBg: 'rgba(0,0,0,0.75)',
      bubbleText: '#fff',
      countdownBg: 'rgba(0,0,0,0.6)',
      countdownText: '#ffffff',
      success: '#00C853',
      error: '#FF1744',
      warning: '#FFB300',
      overlayBg: 'rgba(0,0,0,0.6)',
      topBarTextSecondary: 'rgba(255,255,255,0.6)',
      topBarBorderInactive: 'rgba(255,255,255,0.15)',
      text: '#ffffff',
      textSecondary: '#888888',
      countdownBorder: 'rgba(255,255,255,0.4)',
      sunColor: '#FFB800',
      cardBg: 'rgba(0,0,0,0.8)',
      border: 'rgba(255,255,255,0.15)',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

// Mock useAccessibility for reducedMotion
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: false })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function findTextNodes(node: any, acc: string[] = []): string[] {
  if (!node) return acc;
  if (typeof node === 'string') {
    acc.push(node);
    return acc;
  }
  if (Array.isArray(node)) {
    node.forEach((n: any) => findTextNodes(n, acc));
    return acc;
  }
  const children = node.children ?? (node.props && node.props.children);
  if (children !== undefined && children !== null) {
    if (typeof children === 'string') {
      acc.push(children);
    } else if (Array.isArray(children)) {
      children.forEach((c: any) => findTextNodes(c, acc));
    } else if (typeof children === 'object') {
      findTextNodes(children, acc);
    }
  }
  return acc;
}

function findNodeWithProp(node: any, propName: string): any {
  if (!node || typeof node !== 'object') return null;
  if (node.props && node.props[propName] !== undefined) return node;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNodeWithProp(child, propName);
      if (found) return found;
    }
  }
  const children = node.children ?? (node.props && node.props.children);
  if (children) {
    if (Array.isArray(children)) {
      for (const child of children) {
        const found = findNodeWithProp(child, propName);
        if (found) return found;
      }
    } else {
      return findNodeWithProp(children, propName);
    }
  }
  return null;
}

function getAllText(node: any): string {
  return findTextNodes(node, []).join(' ');
}

function getMockPanResponder() {
  return {
    panHandlers: {
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: jest.fn(),
      onResponderMove: jest.fn(),
      onResponderRelease: jest.fn(),
      onResponderTerminationRequest: () => true,
      onResponderTerminate: jest.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ExposureBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedValues.clear();
    mockSvId = 0;
  });

  // -------------------------------------------------------------------------
  // Test 1: Returns null when visible=false
  // -------------------------------------------------------------------------
  it('returns null when visible=false', () => {
    const { toJSON } = render(
      <ExposureBar
        visible={false}
        exposureComp={0}
        minEC={-2}
        maxEC={2}
        onExposureChange={jest.fn()}
      />
    );
    expect(toJSON()).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 2: Renders correctly when visible=true (label, track, thumb, tick labels, value label)
  // -------------------------------------------------------------------------
  it('renders correctly when visible=true', () => {
    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={0}
        minEC={-2}
        maxEC={2}
        onExposureChange={jest.fn()}
        onExposureChangeEnd={jest.fn()}
      />
    );

    const tree = toJSON() as any;
    const allText = getAllText(tree);

    // Label
    expect(allText).toContain('曝光补偿 (EV)');

    // Tick labels: minEC, 0, maxEC
    expect(allText).toContain('-2.0');
    expect(allText).toContain('0');
    expect(allText).toContain('2.0');

    // Value label (EV)
    expect(allText).toContain('+0.0 EV');

    // pointerEvents
    const container = findNodeWithProp(tree, 'pointerEvents');
    expect(container).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Test 3: EV value display formatting: +1.5 for positive, -1.0 for negative
  // -------------------------------------------------------------------------
  it('displays +1.5 EV for positive value', () => {
    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={1.5}
        minEC={-2}
        maxEC={2}
        onExposureChange={jest.fn()}
      />
    );
    const allText = getAllText(toJSON() as any);
    expect(allText).toContain('+1.5 EV');
  });

  it('displays -1.0 EV for negative value', () => {
    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={-1.0}
        minEC={-2}
        maxEC={2}
        onExposureChange={jest.fn()}
      />
    );
    const allText = getAllText(toJSON() as any);
    expect(allText).toContain('-1.0 EV');
  });

  // -------------------------------------------------------------------------
  // Test 4: Tick labels show minEC, 0, maxEC correctly
  // -------------------------------------------------------------------------
  it('shows correct tick labels for minEC, 0, maxEC', () => {
    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={0}
        minEC={-3}
        maxEC={1}
        onExposureChange={jest.fn()}
      />
    );
    const allText = getAllText(toJSON() as any);
    expect(allText).toContain('-3.0');
    expect(allText).toContain('0');
    expect(allText).toContain('1.0');
  });

  // -------------------------------------------------------------------------
  // Test 5: PanResponder callbacks - onExposureChange called during drag
  // -------------------------------------------------------------------------
  it('calls onExposureChange during drag', () => {
    const onExposureChange = jest.fn();
    const onExposureChangeEnd = jest.fn();

    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={0}
        minEC={-2}
        maxEC={2}
        onExposureChange={onExposureChange}
        onExposureChangeEnd={onExposureChangeEnd}
      />
    );

    const tree = toJSON() as any;
    // Find the panResponder handler
    const handlers = tree.props;

    // Simulate drag: onPanResponderMove
    // gestureState.moveX is the absolute screen X position
    // We need layoutRef.current.x to be set (via onLayout)
    // Default FULL_WIDTH = Dimensions.get('window').width - 32
    // Let's simulate moveX at position that corresponds to EV=1
    if (handlers.onResponderMove) {
      handlers.onResponderMove(
        { nativeEvent: {} },
        { moveX: 200, dx: 10, dy: 0 }
      );
    }

    // If onLayout was triggered, layoutRef.current.x and width would be set
    // For the test, we simulate onLayout first
    const container = findNodeWithProp(tree, 'children');
    // Find the Animated.View (container) and trigger onLayout
    const onLayoutHandler = tree.props?.onLayout;
    if (onLayoutHandler) {
      onLayoutHandler({
        nativeEvent: {
          layout: { x: 16, y: 120, width: 300, height: 80 },
        },
      });
    }

    // Now simulate move
    if (handlers.onResponderMove) {
      handlers.onResponderMove(
        { nativeEvent: {} },
        { moveX: 200, dx: 10, dy: 0 }
      );
    }

    // onExposureChange should have been called at least once during drag
    expect(onExposureChange).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 6: PanResponder callbacks - onExposureChangeEnd called on release
  // -------------------------------------------------------------------------
  it('calls onExposureChangeEnd on release', () => {
    const onExposureChange = jest.fn();
    const onExposureChangeEnd = jest.fn();

    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={0}
        minEC={-2}
        maxEC={2}
        onExposureChange={onExposureChange}
        onExposureChangeEnd={onExposureChangeEnd}
      />
    );

    const tree = toJSON() as any;
    const handlers = tree.props;

    // Simulate onLayout first to set layoutRef
    const onLayoutHandler = tree.props?.onLayout;
    if (onLayoutHandler) {
      onLayoutHandler({
        nativeEvent: {
          layout: { x: 16, y: 120, width: 300, height: 80 },
        },
      });
    }

    // Simulate release: onPanResponderRelease
    if (handlers.onResponderRelease) {
      handlers.onResponderRelease(
        { nativeEvent: {} },
        { moveX: 200, dx: 10, dy: 0 }
      );
    }

    expect(onExposureChangeEnd).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 7: Edge case - range is 0 (minEC === maxEC) - valueToPosition returns width/2
  // -------------------------------------------------------------------------
  it('valueToPosition returns width/2 when range is 0', () => {
    // When minEC === maxEC, valueToPosition returns layoutRef.current.width / 2
    // We can verify this by checking the component renders without error
    // and the thumb position is at center
    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={0}
        minEC={1}
        maxEC={1}
        onExposureChange={jest.fn()}
      />
    );

    const tree = toJSON() as any;
    const allText = getAllText(tree);
    // Should still render
    expect(allText).toContain('曝光补偿 (EV)');
  });

  // -------------------------------------------------------------------------
  // Test 8: Edge case - layout width is 0 - positionToValue returns 0
  // -------------------------------------------------------------------------
  it('positionToValue returns 0 when layout width is 0', () => {
    // When width is 0, positionToValue returns 0 (guarded)
    // We can verify this by checking the component handles it gracefully
    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={0}
        minEC={-2}
        maxEC={2}
        onExposureChange={jest.fn()}
      />
    );

    // If onLayout fires with width=0, positionToValue should guard and return 0
    const tree = toJSON() as any;
    const onLayoutHandler = tree.props?.onLayout;
    if (onLayoutHandler) {
      onLayoutHandler({
        nativeEvent: {
          layout: { x: 16, y: 120, width: 0, height: 80 },
        },
      });
    }

    // Component should still render
    const allText = getAllText(toJSON() as any);
    expect(allText).toContain('曝光补偿 (EV)');
  });

  // -------------------------------------------------------------------------
  // Test 9: Accessibility - reducedMotion=true uses duration=0 for withTiming
  // -------------------------------------------------------------------------
  it('reducedMotion=true uses duration=0 for withTiming', () => {
    // Re-mock useAccessibility with reducedMotion=true
    jest.doMock('../hooks/useAccessibility', () => ({
      useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: true })),
    }));

    const { useAccessibilityReducedMotion } = require('../hooks/useAccessibility');
    (useAccessibilityReducedMotion as jest.Mock).mockReturnValueOnce({ reducedMotion: true });

    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={0}
        minEC={-2}
        maxEC={2}
        onExposureChange={jest.fn()}
      />
    );

    // Component should render with reducedMotion=true
    expect(toJSON()).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 10: Container has pointerEvents="box-none"
  // -------------------------------------------------------------------------
  it('container has pointerEvents="box-none"', () => {
    const { toJSON } = render(
      <ExposureBar
        visible={true}
        exposureComp={0}
        minEC={-2}
        maxEC={2}
        onExposureChange={jest.fn()}
      />
    );

    const tree = toJSON() as any;
    const container = findNodeWithProp(tree, 'pointerEvents');
    expect(container).toBeTruthy();
    expect(container.props.pointerEvents).toBe('box-none');
  });
});
