import React from 'react';
import { render } from '@testing-library/react-native';
import { GridOverlay } from '../GridOverlay';

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      gridAccent: 'rgba(255,255,255,0.4)',
      accent: '#6297FF',
      textSecondary: 'rgba(255,255,255,0.6)',
    },
  }),
}));

// Mock useAccessibilityAnnouncement
const mockAnnounce = jest.fn();
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: () => ({ announce: mockAnnounce }),
}));

describe('GridOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('variant="none"', () => {
    it('returns null when variant is "none"', () => {
      const { toJSON } = render(<GridOverlay variant="none" />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('variant="thirds"', () => {
    it('renders ThirdsGrid when variant is "thirds"', () => {
      const { toJSON } = render(<GridOverlay variant="thirds" />);
      expect(toJSON()).not.toBeNull();
    });

    it('has correct accessibility label for thirds grid', () => {
      const { toJSON } = render(<GridOverlay variant="thirds" />);
      const tree = toJSON() as any;
      expect(tree.props.accessibilityLabel).toContain('三分法构图网格');
      expect(tree.props.accessibilityLabel).toContain('将画面水平和垂直各分为三等份');
    });

    it('has accessibilityRole="image"', () => {
      const { toJSON } = render(<GridOverlay variant="thirds" />);
      const tree = toJSON() as any;
      expect(tree.props.accessibilityRole).toBe('image');
    });

    it('announces description on variant change', () => {
      const { rerender } = render(<GridOverlay variant="thirds" />);
      rerender(<GridOverlay variant="diagonal" />);
      expect(mockAnnounce).toHaveBeenCalledWith(
        '提供对角线构图引导，适合建筑、风光和动态场景',
        'polite'
      );
    });
  });

  describe('variant="golden"', () => {
    it('renders GoldenSpiral sub-component', () => {
      const { toJSON } = render(<GridOverlay variant="golden" />);
      expect(toJSON()).not.toBeNull();
    });

    it('has correct accessibility label for golden grid', () => {
      const { toJSON } = render(<GridOverlay variant="golden" />);
      const tree = toJSON() as any;
      expect(tree.props.accessibilityLabel).toContain('黄金比例网格');
      expect(tree.props.accessibilityLabel).toContain('黄金分割比例1比1.618');
    });

    it('announces golden grid description', () => {
      const { rerender } = render(<GridOverlay variant="thirds" />);
      mockAnnounce.mockClear();
      rerender(<GridOverlay variant="golden" />);
      expect(mockAnnounce).toHaveBeenCalledWith(
        '基于黄金分割比例1比1.618的网格，帮助创建视觉平衡与和谐',
        'polite'
      );
    });
  });

  describe('variant="diagonal"', () => {
    it('renders diagonal grid with correct accessibility label', () => {
      const { toJSON } = render(<GridOverlay variant="diagonal" />);
      const tree = toJSON() as any;
      expect(tree.props.accessibilityLabel).toContain('对角线网格');
      expect(tree.props.accessibilityLabel).toContain('对角线构图引导');
    });
  });

  describe('variant="spiral"', () => {
    it('renders spiral grid with correct accessibility label', () => {
      const { toJSON } = render(<GridOverlay variant="spiral" />);
      const tree = toJSON() as any;
      expect(tree.props.accessibilityLabel).toContain('斐波那契螺旋网格');
      expect(tree.props.accessibilityLabel).toContain('斐波那契螺旋引导');
    });
  });

  describe('onGridActivate callback', () => {
    it('renders with onGridActivate prop without error', () => {
      const onGridActivate = jest.fn();
      const { toJSON } = render(
        <GridOverlay variant="thirds" onGridActivate={onGridActivate} />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('renders without onGridActivate (default passive mode)', () => {
      const { toJSON } = render(<GridOverlay variant="thirds" />);
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('accessibilityLiveRegion', () => {
    it('sets accessibilityLiveRegion="polite" on the container', () => {
      const { toJSON } = render(<GridOverlay variant="thirds" />);
      const tree = toJSON() as any;
      expect(tree.props.accessibilityLiveRegion).toBe('polite');
    });

    it('does not set live region when variant is "none"', () => {
      const { toJSON } = render(<GridOverlay variant="none" />);
      // variant=none returns null, no live region needed
      expect(toJSON()).toBeNull();
    });
  });

  describe('stability / re-render', () => {
    it('renders without error on repeated re-render with same props', () => {
      const stableVariant: import('../../types').GridVariant = 'thirds';
      const { rerender, toJSON } = render(<GridOverlay variant={stableVariant} />);
      // Multiple re-renders with same props - should not crash
      rerender(<GridOverlay variant={stableVariant} />);
      rerender(<GridOverlay variant={stableVariant} />);
      expect(toJSON()).not.toBeNull();
    });

    it('re-renders correctly when variant changes', () => {
      const { rerender, toJSON } = render(<GridOverlay variant="thirds" />);
      const first = toJSON();
      rerender(<GridOverlay variant="golden" />);
      const second = toJSON();
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });

    it('re-renders correctly when variant changes to "none"', () => {
      const { rerender, toJSON } = render(<GridOverlay variant="thirds" />);
      expect(toJSON()).not.toBeNull();
      rerender(<GridOverlay variant="none" />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('accessibilityLabel completeness', () => {
    it('each variant has a description in its accessibilityLabel', () => {
      const variants: import('../../types').GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral'];
      for (const variant of variants) {
        const { toJSON } = render(<GridOverlay variant={variant} />);
        const tree = toJSON() as any;
        expect(tree.props.accessibilityLabel).toContain('：');
        // Label should contain a description after the colon
        const label = tree.props.accessibilityLabel as string;
        const parts = label.split('：');
        expect(parts[1].length).toBeGreaterThan(5);
      }
    });
  });
});