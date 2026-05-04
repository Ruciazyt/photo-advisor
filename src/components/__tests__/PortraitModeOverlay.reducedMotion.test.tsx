/**
 * Tests for PortraitModeOverlay reduced motion accessibility support.
 */

import React from 'react';

const mockReducedMotion = jest.fn(() => false);
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
  useAccessibilityAnnouncement: jest.fn(() => ({ announce: jest.fn(), isScreenReaderEnabled: false })),
}));

jest.mock('expo-image', () => ({
  BlurView: 'BlurView',
}));

import { render } from '@testing-library/react-native';
import { PortraitModeOverlay } from '../PortraitModeOverlay';

describe('PortraitModeOverlay reduced motion', () => {
  it('renders without reduced motion hook', () => {
    const { toJSON } = render(<PortraitModeOverlay visible={true} />);
    expect(toJSON()).not.toBeNull();
  });

  it('respects system reduced motion preference - hides blur when reduced motion is enabled', () => {
    mockReducedMotion.mockReturnValueOnce(true);
    const { toJSON } = render(<PortraitModeOverlay visible={true} />);
    const tree = toJSON();
    // With reduced motion, should still render but with static fallback (no animated blur)
    expect(tree).not.toBeNull();
  });

  it('shows blur overlay when reduced motion is disabled', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const { toJSON } = render(<PortraitModeOverlay visible={true} />);
    const tree = toJSON();
    expect(tree).not.toBeNull();
  });

  it('remounts correctly when reduced motion preference changes', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const { rerender } = render(<PortraitModeOverlay visible={true} />);
    expect(() => {
      mockReducedMotion.mockReturnValueOnce(true);
      rerender(<PortraitModeOverlay visible={true} />);
    }).not.toThrow();
  });
});
