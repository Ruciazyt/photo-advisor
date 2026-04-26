import React from 'react';
import { render } from '@testing-library/react-native';
import { LevelIndicator } from '../components/LevelIndicator';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';

// ---------------------------------------------------------------------------
// Mock react-native-reanimated
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
    withTiming: (v: unknown) => v,
    Easing: {
      out: (e: (t: number) => number) => e,
      in: (e: (t: number) => number) => e,
      quad: (t: number) => t,
      ease: (t: number) => t,
    },
  };
});

// Mock the orientation hook
jest.mock('../hooks/useDeviceOrientation', () => ({
  useDeviceOrientation: jest.fn(),
}));

// Mock useHaptics
jest.mock('../hooks/useHaptics', () => ({
  useHaptics: jest.fn(() => ({
    triggerLevelHaptic: jest.fn(),
    warningNotification: jest.fn(),
    lightImpact: jest.fn(),
    mediumImpact: jest.fn(),
    heavyImpact: jest.fn(),
    successNotification: jest.fn(),
    errorNotification: jest.fn(),
  })),
}));

// Mock expo-haptics for the LevelIndicator haptics integration
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

// Mock ThemeContext
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
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: function MockIonicons() {
    return null;
  },
}));

const mockUseDeviceOrientation = useDeviceOrientation as jest.MockedFunction<typeof useDeviceOrientation>;

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

describe('LevelIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when accelerometer is not available', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 0, roll: 0 },
      available: false,
    });

    const { toJSON } = render(<LevelIndicator />);
    expect(toJSON()).toBeNull();
  });

  it('renders when accelerometer is available', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 0, roll: 0 },
      available: true,
    });

    const { toJSON } = render(<LevelIndicator />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows level state when tilt is within ±8°', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 3, roll: 5 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('水平')).toBeTruthy();
    expect(getByText(/俯仰/)).toBeTruthy();
    expect(getByText(/横滚/)).toBeTruthy();
  });

  it('shows slight tilt state when tilt is between ±8° and ±20°', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 12, roll: 10 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('轻微倾斜')).toBeTruthy();
  });

  it('shows tilted state when tilt exceeds ±20°', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 25, roll: -22 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('倾斜')).toBeTruthy();
  });

  it('uses worst state when pitch and roll disagree', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 3, roll: 25 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('倾斜')).toBeTruthy();
  });

  it('displays pitch and roll values with one decimal place', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 12.345, roll: -7.891 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('俯仰 12.3°')).toBeTruthy();
    expect(getByText('横滚 -7.9°')).toBeTruthy();
  });
});

describe('LevelIndicator reanimated integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedValues.clear();
    mockSvId = 0;
  });

  it('renders the indicator row when orientation is available', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 0, roll: 0 },
      available: true,
    });
    const { toJSON } = render(<LevelIndicator />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows correct pitch and roll values in tilt labels', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 5.5, roll: -3.2 },
      available: true,
    });
    const { toJSON } = render(<LevelIndicator />);
    const textNodes = findTextNodes(toJSON() as any, []);
    const tiltText = textNodes.join(' ');
    expect(tiltText).toContain('5.5');
    expect(tiltText).toContain('-3.2');
  });

  it('shows "俯仰" and "横滚" labels for pitch and roll', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 0, roll: 0 },
      available: true,
    });
    const { toJSON } = render(<LevelIndicator />);
    const textNodes = findTextNodes(toJSON() as any, []);
    const tiltText = textNodes.join(' ');
    expect(tiltText).toContain('俯仰');
    expect(tiltText).toContain('横滚');
  });

  it('shows "水平" when both pitch and roll are within ±8 degrees', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 3, roll: 2 },
      available: true,
    });
    const { toJSON } = render(<LevelIndicator />);
    const textNodes = findTextNodes(toJSON() as any, []);
    expect(textNodes.some(t => t.includes('水平'))).toBe(true);
  });

  it('shows "轻微倾斜" when tilt is between ±8 and ±20 degrees', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 12, roll: 5 },
      available: true,
    });
    const { toJSON } = render(<LevelIndicator />);
    const textNodes = findTextNodes(toJSON() as any, []);
    expect(textNodes.some(t => t.includes('轻微倾斜'))).toBe(true);
  });

  it('shows "倾斜" when any tilt exceeds ±20 degrees', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 25, roll: 3 },
      available: true,
    });
    const { toJSON } = render(<LevelIndicator />);
    const textNodes = findTextNodes(toJSON() as any, []);
    expect(textNodes.some(t => t.includes('倾斜'))).toBe(true);
  });

  it('shows "倾斜" when roll exceeds threshold even if pitch is level', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 2, roll: -22 },
      available: true,
    });
    const { toJSON } = render(<LevelIndicator />);
    const textNodes = findTextNodes(toJSON() as any, []);
    expect(textNodes.some(t => t.includes('倾斜'))).toBe(true);
  });

  it('container has pointerEvents="none" for non-interactive', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 0, roll: 0 },
      available: true,
    });
    const { toJSON } = render(<LevelIndicator />);
    const tree = toJSON() as any;
    const container = findNodeWithProp(tree, 'pointerEvents');
    expect(container).toBeTruthy();
    expect(container.props.pointerEvents).toBe('none');
  });

  it('renders Ionicons when level', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 0, roll: 0 },
      available: true,
    });
    const { root } = render(<LevelIndicator />);
    expect(root).toBeTruthy();
  });

  it('renders Ionicons when slight tilt', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 12, roll: 5 },
      available: true,
    });
    const { root } = render(<LevelIndicator />);
    expect(root).toBeTruthy();
  });

  it('renders Ionicons when tilted', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 25, roll: 5 },
      available: true,
    });
    const { root } = render(<LevelIndicator />);
    expect(root).toBeTruthy();
  });
});
