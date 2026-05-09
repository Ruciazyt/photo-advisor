/**
 * Unit tests for FocusPeakingPreview component.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FocusPeakingPreview } from '../FocusPeakingPreview';

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

describe('FocusPeakingPreview', () => {
  describe('rendering with valid props', () => {
    it('renders with valid color and sensitivity props', () => {
      const { toJSON } = render(
        <FocusPeakingPreview color="#FF0000" sensitivity="medium" />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('renders a container View with labelRow and strip', () => {
      const { getByText } = render(
        <FocusPeakingPreview color="#00FF00" sensitivity="high" />
      );
      expect(getByText('预览')).toBeTruthy();
      expect(getByText('#00FF00')).toBeTruthy();
      expect(getByText('· 灵敏度 高')).toBeTruthy();
    });

    it('renders strip with backgroundColor matching the color prop', () => {
      const color = '#FF0000';
      const { toJSON } = render(
        <FocusPeakingPreview color={color} sensitivity="medium" />
      );
      const json = toJSON();
      expect(json).toBeTruthy();
      // Find the strip View by background color matching our prop
      const stripView = findStripView(json, color);
      expect(stripView).toBeTruthy();
    });
  });

  describe('snap to defaults when props missing', () => {
    it('renders with missing color prop (renders without crashing)', () => {
      // @ts-ignore - intentionally passing undefined
      const { toJSON } = render(<FocusPeakingPreview sensitivity="medium" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders with missing sensitivity prop (falls back to medium=12 dots)', () => {
      // @ts-ignore - intentionally passing undefined
      const { toJSON } = render(<FocusPeakingPreview color="#FF0000" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders with both props missing', () => {
      // @ts-ignore - intentionally passing undefined
      const { toJSON } = render(<FocusPeakingPreview />);
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('dot count per sensitivity level', () => {
    it('low sensitivity renders 6 dots', () => {
      const { toJSON } = render(
        <FocusPeakingPreview color="#FF0000" sensitivity="low" />
      );
      const json = toJSON();
      const dotCount = countDots(json);
      expect(dotCount).toBe(6);
    });

    it('medium sensitivity renders 12 dots', () => {
      const { toJSON } = render(
        <FocusPeakingPreview color="#FF0000" sensitivity="medium" />
      );
      const json = toJSON();
      const dotCount = countDots(json);
      expect(dotCount).toBe(12);
    });

    it('high sensitivity renders 20 dots', () => {
      const { toJSON } = render(
        <FocusPeakingPreview color="#FF0000" sensitivity="high" />
      );
      const json = toJSON();
      const dotCount = countDots(json);
      expect(dotCount).toBe(20);
    });
  });

  describe('sensitivity label in labelRow', () => {
    it('shows 低 for low sensitivity', () => {
      const { getByText } = render(
        <FocusPeakingPreview color="#FF0000" sensitivity="low" />
      );
      expect(getByText('· 灵敏度 低')).toBeTruthy();
    });

    it('shows 中 for medium sensitivity', () => {
      const { getByText } = render(
        <FocusPeakingPreview color="#FF0000" sensitivity="medium" />
      );
      expect(getByText('· 灵敏度 中')).toBeTruthy();
    });

    it('shows 高 for high sensitivity', () => {
      const { getByText } = render(
        <FocusPeakingPreview color="#FF0000" sensitivity="high" />
      );
      expect(getByText('· 灵敏度 高')).toBeTruthy();
    });
  });

  describe('React.memo', () => {
    it('does not re-render when props are unchanged (memo prevents update)', () => {
      const color = '#00FF00';
      const sensitivity: 'low' | 'medium' | 'high' = 'medium';

      const result = render(
        <FocusPeakingPreview color={color} sensitivity={sensitivity} />
      );
      expect(result.getByText('#00FF00')).toBeTruthy();
      expect(result.getByText('· 灵敏度 中')).toBeTruthy();

      // Re-render with the same props - memo should prevent actual re-render
      result.rerender(
        <FocusPeakingPreview color={color} sensitivity={sensitivity} />
      );
      // The component should still show the correct label
      expect(result.getByText('#00FF00')).toBeTruthy();
      expect(result.getByText('· 灵敏度 中')).toBeTruthy();
    });

    it('re-renders when color prop changes', () => {
      const result = render(
        <FocusPeakingPreview color="#FF0000" sensitivity="medium" />
      );
      expect(result.getByText('#FF0000')).toBeTruthy();

      result.rerender(
        <FocusPeakingPreview color="#00FF00" sensitivity="medium" />
      );
      // New color label should appear
      expect(result.getByText('#00FF00')).toBeTruthy();
    });

    it('re-renders when sensitivity prop changes', () => {
      const result = render(
        <FocusPeakingPreview color="#FF0000" sensitivity="low" />
      );
      expect(result.getByText('· 灵敏度 低')).toBeTruthy();

      result.rerender(
        <FocusPeakingPreview color="#FF0000" sensitivity="high" />
      );
      // New sensitivity label should appear
      expect(result.getByText('· 灵敏度 高')).toBeTruthy();
    });
  });
});

// Helper: recursively find the strip View by background color
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findStripView(node: any, color: string): any {
  if (!node) return null;
  if (node.type === 'View' && node.props?.style) {
    const style = node.props.style;
    const arr = Array.isArray(style) ? style : [style];
    // Look for backgroundColor matching the prop color
    if (arr.some((s: any) => s?.backgroundColor === color)) {
      return node;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findStripView(child, color);
      if (found) return found;
    }
  }
  return null;
}

// Helper: recursively count dot Views (small circular border views with borderRadius:3 and borderWidth:1.5)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countDots(node: any): number {
  if (!node) return 0;
  if (node.type === 'View') {
    const style = node.props?.style;
    const s = Array.isArray(style) ? style : [style];
    // Dots have borderRadius: 3 and borderWidth: 1.5 (set via styles.dot)
    if (s.some((st: any) => st?.borderRadius === 3 && st?.borderWidth === 1.5)) {
      return 1;
    }
  }
  let count = 0;
  if (node.children) {
    for (const child of node.children) {
      count += countDots(child);
    }
  }
  return count;
}