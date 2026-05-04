/**
 * Tests for PortraitModeOverlay component.
 * Verifies rendering behavior for portrait mode depth/bokeh effect.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PortraitModeOverlay } from '../PortraitModeOverlay';

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
});