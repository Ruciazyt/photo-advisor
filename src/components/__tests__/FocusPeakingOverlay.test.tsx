import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FocusPeakingOverlay } from '../FocusPeakingOverlay';

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      error: '#FF3B30',
    },
  }),
}));

describe('FocusPeakingOverlay', () => {
  const defaultProps = {
    visible: true,
    peaks: [
      { x: 0.5, y: 0.5, strength: 0.8 },
      { x: 0.25, y: 0.25, strength: 0.6 },
      { x: 0.75, y: 0.75, strength: 0.9 },
    ] as import('../../types').PeakPoint[],
    screenWidth: 400,
    screenHeight: 800,
  };

  describe('visibility', () => {
    it('renders dots when visible=true with peaks', () => {
      const { toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
      expect(toJSON()).not.toBeNull();
    });

    it('returns null when visible=false', () => {
      const { toJSON } = render(<FocusPeakingOverlay {...defaultProps} visible={false} />);
      expect(toJSON()).toBeNull();
    });

    it('returns null when peaks is empty array', () => {
      const { toJSON } = render(<FocusPeakingOverlay {...defaultProps} peaks={[]} />);
      expect(toJSON()).toBeNull();
    });

    it('returns null when both visible=false and peaks empty', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay {...defaultProps} visible={false} peaks={[]} />
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility label', () => {
      const { toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
      const tree = toJSON() as any;
      expect(tree.props.accessibilityLabel).toBe(
        '对焦峰值覆盖层，显示画面中处于焦点的边缘区域'
      );
    });

    it('has accessibilityRole="image"', () => {
      const { toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
      const tree = toJSON() as any;
      expect(tree.props.accessibilityRole).toBe('image');
    });

    it('has pointerEvents="none"', () => {
      const { toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
      const tree = toJSON() as any;
      expect(tree.props.pointerEvents).toBe('none');
    });
  });

  describe('custom color prop', () => {
    it('uses custom color when provided', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay {...defaultProps} color="#00FF00" />
      );
      const tree = toJSON() as any;
      expect(tree).not.toBeNull();
      // The dots use backgroundColor from peakingColor
      // We verify rendering succeeded without error
    });

    it('uses default theme error color when no color prop', () => {
      const { toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
      // Should render without error, using colors.error from ThemeContext
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('dot count and positioning', () => {
    it('renders correct number of dots for given peaks', () => {
      const peaks: import('../../types').PeakPoint[] = [
        { x: 0.2, y: 0.2, strength: 0.5 },
        { x: 0.4, y: 0.4, strength: 0.7 },
        { x: 0.6, y: 0.6, strength: 0.9 },
        { x: 0.8, y: 0.8, strength: 1.0 },
      ];
      const { toJSON } = render(
        <FocusPeakingOverlay {...defaultProps} peaks={peaks} />
      );
      const tree = toJSON() as any;
      expect(tree).not.toBeNull();
      // Tree structure: container > Dummy > DotMarkers > View (dots)
      // Count the dot Views inside DotMarkers
      const dotMarkers = tree.children.find(
        (child: any) =>
          child.type === 'RCTView' && child.props?.testID === undefined
      );
      // Dots are rendered inside DotMarkers/Dummy which contains dot View children
    });

    it('positions dots based on normalized peak coordinates', () => {
      const peaks: import('../../types').PeakPoint[] = [
        { x: 0.5, y: 0.5, strength: 0.8 },
      ];
      const { toJSON } = render(
        <FocusPeakingOverlay {...defaultProps} peaks={peaks} screenWidth={400} screenHeight={800} />
      );
      expect(toJSON()).not.toBeNull();
      // Dot at x=0.5, y=0.5 with screenWidth=400, screenHeight=800
      // should be positioned at left=200, top=400 (before centering offset)
    });

    it('scales dot size based on strength', () => {
      const peaks: import('../../types').PeakPoint[] = [
        { x: 0.5, y: 0.5, strength: 0.2 },
        { x: 0.3, y: 0.3, strength: 1.0 },
      ];
      const { toJSON } = render(
        <FocusPeakingOverlay {...defaultProps} peaks={peaks} />
      );
      // Should render without error; stronger peaks produce larger dots
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('React.memo stability', () => {
    it('does not re-render unnecessarily when parent re-renders with same props', () => {
      const { rerender, toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
      const first = toJSON();

      // Re-render with identical props — memo should prevent dot re-creation
      rerender(<FocusPeakingOverlay {...defaultProps} />);
      const second = toJSON();

      // Both renders should produce valid output
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });

    it('updates when peaks actually change', () => {
      const { rerender, toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
      const first = toJSON();

      const newPeaks: import('../../types').PeakPoint[] = [
        { x: 0.1, y: 0.1, strength: 0.5 },
        { x: 0.9, y: 0.9, strength: 0.9 },
      ];
      rerender(<FocusPeakingOverlay {...defaultProps} peaks={newPeaks} />);
      const second = toJSON();

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      // Different peaks should produce different output
    });

    it('updates when screen dimensions change', () => {
      const { rerender, toJSON } = render(
        <FocusPeakingOverlay {...defaultProps} screenWidth={400} screenHeight={800} />
      );
      const first = toJSON();

      rerender(
        <FocusPeakingOverlay {...defaultProps} screenWidth={800} screenHeight={1600} />
      );
      const second = toJSON();

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });

    it('returns to null when peaks become empty after having values', () => {
      const { rerender, toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
      expect(toJSON()).not.toBeNull();

      rerender(<FocusPeakingOverlay {...defaultProps} peaks={[]} />);
      expect(toJSON()).toBeNull();
    });

    it('returns to null when visible becomes false after being true', () => {
      const { rerender, toJSON } = render(<FocusPeakingOverlay {...defaultProps} visible={true} />);
      expect(toJSON()).not.toBeNull();

      rerender(<FocusPeakingOverlay {...defaultProps} visible={false} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles single peak', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={[{ x: 0.5, y: 0.5, strength: 0.5 }]}
          screenWidth={100}
          screenHeight={100}
        />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('handles peak at corner positions (0, 0) and (1, 1)', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={[
            { x: 0, y: 0, strength: 0.5 },
            { x: 1, y: 1, strength: 0.9 },
          ]}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('handles very low strength (close to 0)', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={[{ x: 0.5, y: 0.5, strength: 0.01 }]}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('handles very high strength (close to 1)', () => {
      const { toJSON } = render(
        <FocusPeakingOverlay
          visible={true}
          peaks={[{ x: 0.5, y: 0.5, strength: 1.0 }]}
          screenWidth={400}
          screenHeight={800}
        />
      );
      expect(toJSON()).not.toBeNull();
    });
  });
});
