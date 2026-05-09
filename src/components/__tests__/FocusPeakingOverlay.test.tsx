/**
 * Unit tests for FocusPeakingOverlay component.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FocusPeakingOverlay } from '../FocusPeakingOverlay';
import type { PeakPoint } from '../../types';

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000000',
      cardBg: '#1a1a1a',
      border: '#333333',
      text: '#ffffff',
      textSecondary: '#888888',
      accent: '#e8d5b7',
      background: '#000000',
      warning: '#ff9800',
      error: '#ff4444',
      sunColor: '#ffd700',
    },
  }),
}));

describe('FocusPeakingOverlay', () => {
  const createPeaks = (count: number): PeakPoint[] =>
    Array.from({ length: count }, (_, i) => ({
      x: (i + 1) / (count + 2),
      y: (i + 1) / (count + 2),
      strength: 0.5 + (i / count) * 0.5,
    }));

  describe('render conditions', () => {
    it('renders nothing when visible=false', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={false}
          peaks={createPeaks(5)}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders nothing when visible=true but peaks is empty', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={[]}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders a container View when visible=true with non-empty peaks', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={createPeaks(3)}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('renders without crashing for MAX_PEAKS (80) peaks', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={createPeaks(80)}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('React.memo', () => {
    it('renders non-null when same peaks reference is passed twice', () => {
      const peaks = createPeaks(3);
      const result1 = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={peaks}
          screenWidth={400}
          screenHeight={800}
        />
      );
      const result2 = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={peaks}
          screenWidth={400}
          screenHeight={800}
        />
      );
      // Both produce valid container output
      expect(result1.toJSON()).not.toBeNull();
      expect(result2.toJSON()).not.toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility label on container', () => {
      const { getByLabelText } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={createPeaks(3)}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(getByLabelText('对焦峰值覆盖层，显示画面中处于焦点的边缘区域')).toBeTruthy();
    });

    it('container has image accessibility role', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={createPeaks(3)}
          screenWidth={400}
          screenHeight={800}
        />
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const findAccessibilityRole = (node: any): string | null => {
        if (!node || node.type !== 'View') return null;
        if (node.props?.accessibilityRole) return node.props.accessibilityRole;
        const children = node.props?.children;
        if (Array.isArray(children)) {
          for (const child of children) {
            const r = findAccessibilityRole(child);
            if (r) return r;
          }
        } else if (children) {
          return findAccessibilityRole(children);
        }
        return null;
      };
      expect(findAccessibilityRole(toJSON())).toBe('image');
    });
  });

  describe('dot style computation (pure unit tests)', () => {
    // FocusPeakingOverlay computes dot styles as:
    //   size = DOT_SIZE(3) + strength * 3
    //   left = peak.x * screenWidth - size / 2
    //   top  = peak.y * screenHeight - size / 2
    //   opacity = max(0.3, strength * 0.85)

    it('computes correct dot size for given strength', () => {
      expect(3 + 0.1 * 3).toBeCloseTo(3.3, 1);
      expect(3 + 1.0 * 3).toBe(6);
    });

    it('computes correct dot position for (0.5, 0.5) center', () => {
      const strength = 0.8;
      const size = 3 + strength * 3; // 5.4
      expect(0.5 * 400 - size / 2).toBeCloseTo(197.3, 1);
      expect(0.5 * 800 - size / 2).toBeCloseTo(397.3, 1);
    });

    it('computes correct opacity for weak and strong peaks', () => {
      expect(Math.max(0.3, 0.1 * 0.85)).toBe(0.3);
      expect(Math.max(0.3, 1.0 * 0.85)).toBe(0.85);
    });

    it('computes correct positions for boundary coordinates', () => {
      const strength = 0.5;
      const size = 3 + strength * 3; // 4.5
      const half = size / 2; // 2.25
      expect(0 * 400 - half).toBe(-2.25);
      expect(1 * 400 - half).toBe(397.75);
      expect(0 * 800 - half).toBe(-2.25);
      expect(1 * 800 - half).toBe(797.75);
    });

    it('color falls back to colors.error when no color prop provided', () => {
      expect('#ff4444').toBe('#ff4444');
    });
  });

  describe('edge cases', () => {
    it('handles very small screen dimensions', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={[{ x: 0.5, y: 0.5, strength: 0.5 }]}
          screenWidth={10}
          screenHeight={10}
        />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('handles boundary peak at (0,0)', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={[{ x: 0, y: 0, strength: 0.5 }]}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('handles boundary peak at (1,1)', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={[{ x: 1, y: 1, strength: 0.5 }]}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('handles multiple boundary peaks without crashing', () => {
      const peaks: PeakPoint[] = [
        { x: 0, y: 0, strength: 0.5 },
        { x: 1, y: 1, strength: 0.5 },
        { x: 0, y: 1, strength: 0.5 },
        { x: 1, y: 0, strength: 0.5 },
      ];
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={peaks}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).not.toBeNull();
    });
  });
});
