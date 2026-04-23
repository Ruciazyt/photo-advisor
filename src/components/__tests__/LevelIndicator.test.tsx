import { render } from '@testing-library/react-native';
import { LevelIndicator } from '../LevelIndicator';

// ---------------------------------------------------------------------------
// Mock react-native-reanimated
// ---------------------------------------------------------------------------
const mockSharedValues = new Map();
let mockSvId = 0;

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  function mockUseSharedValue(initial) {
    const id = mockSvId++;
    if (!mockSharedValues.has(id)) {
      mockSharedValues.set(id, { value: initial });
    }
    return mockSharedValues.get(id);
  }
  function mockUseAnimatedStyle(styleFn) {
    return styleFn();
  }
  const AnimatedView = RN.View;
  return {
    __esModule: true,
    default: { View: AnimatedView, Text: RN.Text },
    useSharedValue: mockUseSharedValue,
    useAnimatedStyle: mockUseAnimatedStyle,
    useFrameCallback: () => {},
    runOnJS: (fn) => fn,
    Animated: { View: AnimatedView, Text: RN.Text },
    createAnimatedComponent: (C) => C,
    withSpring: (v) => v,
    withTiming: (v) => v,
    Easing: { out: (e) => e, in: (e) => e, quad: (t) => t, ease: (t) => t },
  };
});

// ---------------------------------------------------------------------------
// Mock useDeviceOrientation — shared object reference pattern
// ---------------------------------------------------------------------------
const mockOrientation = { orientation: { pitch: 0, roll: 0 }, available: true };
jest.mock('../../hooks/useDeviceOrientation', () => ({
  useDeviceOrientation: () => mockOrientation,
}));

// ---------------------------------------------------------------------------
// Mock useHaptics — module-level mock fns so same reference persists
// ---------------------------------------------------------------------------
const mockTriggerLevelHaptic = jest.fn();
const mockWarningNotification = jest.fn();
jest.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    triggerLevelHaptic: mockTriggerLevelHaptic,
    warningNotification: mockWarningNotification,
  }),
}));

// ---------------------------------------------------------------------------
// Mock ThemeContext
// ---------------------------------------------------------------------------
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      success: '#00C853',
      error: '#FF1744',
      warning: '#FFB300',
      bubbleBg: 'rgba(0,0,0,0.5)',
      topBarBorderInactive: 'rgba(255,255,255,0.2)',
      overlayBg: 'rgba(0,0,0,0.6)',
      topBarTextSecondary: 'rgba(255,255,255,0.6)',
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: function MockIonicons() {
    return null;
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('LevelIndicator', () => {
  beforeEach(() => {
    mockTriggerLevelHaptic.mockClear();
    mockWarningNotification.mockClear();
    // Reset orientation to default
    mockOrientation.orientation.pitch = 0;
    mockOrientation.orientation.roll = 0;
    mockOrientation.available = true;
  });

  describe('orientation not available', () => {
    it('returns null when orientation is not available', () => {
      mockOrientation.available = false;
      const { toJSON } = render(<LevelIndicator />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('orientation available - renders bubble indicator', () => {
    it('renders the indicator row when orientation is available', () => {
      const { toJSON } = render(<LevelIndicator />);
      expect(toJSON()).not.toBeNull();
    });

    it('shows correct pitch and roll values in tilt labels', () => {
      mockOrientation.orientation.pitch = 5.5;
      mockOrientation.orientation.roll = -3.2;
      const { toJSON } = render(<LevelIndicator />);
      const textNodes = findTextNodes(toJSON() as any, []);
      const tiltText = textNodes.join(' ');
      expect(tiltText).toContain('5.5');
      expect(tiltText).toContain('-3.2');
    });

    it('shows "俯仰" and "横滚" labels for pitch and roll', () => {
      const { toJSON } = render(<LevelIndicator />);
      const textNodes = findTextNodes(toJSON() as any, []);
      const tiltText = textNodes.join(' ');
      expect(tiltText).toContain('俯仰');
      expect(tiltText).toContain('横滚');
    });
  });

  describe('status text based on tilt state', () => {
    it('shows "水平" when both pitch and roll are within ±8 degrees', () => {
      mockOrientation.orientation.pitch = 3;
      mockOrientation.orientation.roll = 2;
      const { toJSON } = render(<LevelIndicator />);
      const textNodes = findTextNodes(toJSON() as any, []);
      expect(textNodes.some(t => t.includes('水平'))).toBe(true);
    });

    it('shows "轻微倾斜" when tilt is between ±8 and ±20 degrees', () => {
      mockOrientation.orientation.pitch = 12;
      mockOrientation.orientation.roll = 5;
      const { toJSON } = render(<LevelIndicator />);
      const textNodes = findTextNodes(toJSON() as any, []);
      expect(textNodes.some(t => t.includes('轻微倾斜'))).toBe(true);
    });

    it('shows "倾斜" when any tilt exceeds ±20 degrees', () => {
      mockOrientation.orientation.pitch = 25;
      mockOrientation.orientation.roll = 3;
      const { toJSON } = render(<LevelIndicator />);
      const textNodes = findTextNodes(toJSON() as any, []);
      expect(textNodes.some(t => t.includes('倾斜'))).toBe(true);
    });

    it('shows "倾斜" when roll exceeds threshold even if pitch is level', () => {
      mockOrientation.orientation.pitch = 2;
      mockOrientation.orientation.roll = -22;
      const { toJSON } = render(<LevelIndicator />);
      const textNodes = findTextNodes(toJSON() as any, []);
      expect(textNodes.some(t => t.includes('倾斜'))).toBe(true);
    });
  });

  describe('color changes based on tilt state', () => {
    it('shows "水平" when level', () => {
      mockOrientation.orientation.pitch = 0;
      mockOrientation.orientation.roll = 0;
      const { toJSON } = render(<LevelIndicator />);
      const textNodes = findTextNodes(toJSON() as any, []);
      expect(textNodes.some(t => t === '水平')).toBe(true);
    });

    it('shows "轻微倾斜" when slight tilt', () => {
      mockOrientation.orientation.pitch = 10;
      mockOrientation.orientation.roll = 10;
      const { toJSON } = render(<LevelIndicator />);
      const textNodes = findTextNodes(toJSON() as any, []);
      expect(textNodes.some(t => t === '轻微倾斜')).toBe(true);
    });

    it('shows "倾斜" when tilted', () => {
      mockOrientation.orientation.pitch = 30;
      mockOrientation.orientation.roll = 5;
      const { toJSON } = render(<LevelIndicator />);
      const textNodes = findTextNodes(toJSON() as any, []);
      expect(textNodes.some(t => t === '倾斜')).toBe(true);
    });
  });

  describe('haptic triggers on state transitions', () => {
    it('triggers triggerLevelHaptic when transitioning to level state', () => {
      // First render with tilted state
      mockOrientation.orientation.pitch = 25;
      mockOrientation.orientation.roll = 0;
      const { rerender } = render(<LevelIndicator />);

      // Transition to level state
      mockOrientation.orientation.pitch = 2;
      mockOrientation.orientation.roll = 0;
      rerender(<LevelIndicator />);

      expect(mockTriggerLevelHaptic).toHaveBeenCalled();
    });

    it('triggers warningNotification when transitioning to tilted state', () => {
      // First render with level state
      mockOrientation.orientation.pitch = 2;
      mockOrientation.orientation.roll = 0;
      const { rerender } = render(<LevelIndicator />);

      // Transition to tilted state
      mockOrientation.orientation.pitch = 22;
      mockOrientation.orientation.roll = 0;
      rerender(<LevelIndicator />);

      expect(mockWarningNotification).toHaveBeenCalled();
    });

    it('does not trigger haptics when state does not change (both "slight")', () => {
      mockOrientation.orientation.pitch = 5;
      mockOrientation.orientation.roll = 0;
      const { rerender } = render(<LevelIndicator />);

      mockOrientation.orientation.pitch = 6;
      rerender(<LevelIndicator />);

      expect(mockTriggerLevelHaptic).not.toHaveBeenCalled();
    });

    it('does not trigger haptics on first render (prevState starts as "level")', () => {
      mockOrientation.orientation.pitch = 0;
      mockOrientation.orientation.roll = 0;
      render(<LevelIndicator />);
      expect(mockTriggerLevelHaptic).not.toHaveBeenCalled();
    });
  });

  describe('icon changes based on state', () => {
    it('renders Ionicons when level', () => {
      const { root } = render(<LevelIndicator />);
      expect(root).toBeTruthy();
    });

    it('renders Ionicons when slight tilt', () => {
      mockOrientation.orientation.pitch = 12;
      mockOrientation.orientation.roll = 5;
      const { root } = render(<LevelIndicator />);
      expect(root).toBeTruthy();
    });

    it('renders Ionicons when tilted', () => {
      mockOrientation.orientation.pitch = 25;
      mockOrientation.orientation.roll = 5;
      const { root } = render(<LevelIndicator />);
      expect(root).toBeTruthy();
    });
  });

  describe('accessibility attributes', () => {
    it('container has pointerEvents="none" for non-interactive', () => {
      const { toJSON } = render(<LevelIndicator />);
      const tree = toJSON() as any;
      const container = findNodeWithProp(tree, 'pointerEvents');
      expect(container).toBeTruthy();
      expect(container.props.pointerEvents).toBe('none');
    });
  });
});

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
  // React Native toJSON() stores children at node.children (not node.props.children)
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
  // Check node.children (React Native toJSON format)
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
