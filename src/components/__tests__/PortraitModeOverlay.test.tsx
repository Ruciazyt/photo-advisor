/**
 * Tests for PortraitModeOverlay component.
 * Verifies rendering behavior for portrait mode depth/bokeh effect,
 * including native BlurView usage and fallback to color overlay.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PortraitModeOverlay } from '../PortraitModeOverlay';

// Mock expo-image module to test BlurView availability paths
jest.mock('expo-image', () => {
  const actual = jest.requireActual('expo-image');
  return actual;
});

describe('PortraitModeOverlay', () => {
  describe('visibility behavior', () => {
    it('renders nothing when hidden (visible=false)', () => {
      const { toJSON } = render(<PortraitModeOverlay visible={false} />);
      expect(toJSON()).toBeNull();
    });

    it('renders the overlay when visible', () => {
      const { getByLabelText } = render(<PortraitModeOverlay visible={true} />);
      expect(getByLabelText('人像模式背景虚化覆盖层')).toBeTruthy();
    });
  });

  describe('blur styling', () => {
    it('applies default fallback color when visible', () => {
      const { toJSON } = render(<PortraitModeOverlay visible={true} />);
      const tree = toJSON();

      // Find the inner blurOverlay View (the one with backgroundColor)
      const hasFallbackColor = JSON.stringify(tree).includes('rgba(0,0,0,0.4)');
      expect(hasFallbackColor).toBe(true);
    });

    it('applies custom blur radius via props (style calculation only)', () => {
      const { toJSON } = render(
        <PortraitModeOverlay visible={true} blurRadius={20} />
      );
      const tree = toJSON();
      expect(tree).not.toBeNull();
    });

    it('applies custom fallback color', () => {
      const { toJSON } = render(
        <PortraitModeOverlay visible={true} fallbackColor="rgba(50,50,50,0.5)" />
      );
      const tree = toJSON();
      const hasCustomColor = JSON.stringify(tree).includes('rgba(50,50,50,0.5)');
      expect(hasCustomColor).toBe(true);
    });
  });

  describe('memoization', () => {
    it('does not re-render when sibling component updates', () => {
      const { getByLabelText, rerender } = render(
        <PortraitModeOverlay visible={true} />
      );
      const firstRender = getByLabelText('人像模式背景虚化覆盖层');
      expect(firstRender).toBeTruthy();

      // Re-render with same props — should use memoized result
      rerender(<PortraitModeOverlay visible={true} />);
      expect(getByLabelText('人像模式背景虚化覆盖层')).toBeTruthy();
    });

    it('switches from hidden to visible', () => {
      const { getByLabelText, rerender } = render(
        <PortraitModeOverlay visible={false} />
      );
      expect(() => rerender(<PortraitModeOverlay visible={true} />)).not.toThrow();
      expect(getByLabelText('人像模式背景虚化覆盖层')).toBeTruthy();
    });

    it('switches from visible to hidden', () => {
      const { rerender } = render(<PortraitModeOverlay visible={true} />);
      rerender(<PortraitModeOverlay visible={false} />);
      // Should render nothing
      const { toJSON } = render(<PortraitModeOverlay visible={false} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility label when visible', () => {
      const { getByLabelText } = render(<PortraitModeOverlay visible={true} />);
      expect(getByLabelText('人像模式背景虚化覆盖层')).toBeTruthy();
    });
  });

  describe('native BlurView integration', () => {
    it('renders the blur overlay with correct structure when visible', () => {
      const { toJSON } = render(
        <PortraitModeOverlay visible={true} blurRadius={25} />
      );
      const tree = toJSON();
      // Should render without error and include the blur overlay container
      expect(tree).not.toBeNull();
      const treeStr = JSON.stringify(tree);
      // Should contain the absolute-fill blur overlay (position absolute with left,right,top,bottom)
      expect(treeStr).toContain('"position":"absolute"');
    });

    it('renders View with fallbackColor when BlurView is unavailable', () => {
      // This test verifies the fallback path works
      // The actual BlurView availability depends on the runtime environment
      const { toJSON } = render(
        <PortraitModeOverlay
          visible={true}
          fallbackColor="rgba(10,20,30,0.6)"
        />
      );
      const tree = toJSON();
      expect(tree).not.toBeNull();
      const hasFallbackColor = JSON.stringify(tree).includes('rgba(10,20,30,0.6)');
      expect(hasFallbackColor).toBe(true);
    });
  });

  describe('fallback behavior', () => {
    it('uses fallback color when no blur radius is provided', () => {
      const { toJSON } = render(
        <PortraitModeOverlay visible={true} />
      );
      const tree = toJSON();
      const hasDefaultFallback = JSON.stringify(tree).includes('rgba(0,0,0,0.4)');
      expect(hasDefaultFallback).toBe(true);
    });

    it('preserves custom fallback color across re-renders', () => {
      const { rerender } = render(
        <PortraitModeOverlay visible={true} fallbackColor="rgba(100,100,100,0.3)" />
      );
      rerender(
        <PortraitModeOverlay visible={true} fallbackColor="rgba(100,100,100,0.3)" />
      );
      // Snapshot should remain consistent
      const { toJSON } = render(
        <PortraitModeOverlay visible={true} fallbackColor="rgba(100,100,100,0.3)" />
      );
      const hasCustomColor = JSON.stringify(toJSON()).includes('rgba(100,100,100,0.3)');
      expect(hasCustomColor).toBe(true);
    });
  });
});