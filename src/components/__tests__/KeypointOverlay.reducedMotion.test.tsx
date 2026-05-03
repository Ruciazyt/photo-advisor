/**
 * Tests for KeypointOverlay reduced motion accessibility support
 */

import React from 'react';

// Mock reanimated + worklets (same pattern as existing tests in this project)
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Mock the accessibility hook
const mockReducedMotion = jest.fn(() => false);
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
}));

import { render } from '@testing-library/react-native';
import { KeypointOverlay } from '../KeypointOverlay';
import type { Keypoint } from '../../types';

describe('KeypointOverlay reduced motion', () => {
  const defaultProps = {
    keypoints: [
      {
        id: 1,
        label: 'TOP',
        position: 'top-left' as const,
      } as Keypoint,
    ],
    visible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and calls useAccessibilityReducedMotion when reducedMotion=true', () => {
    mockReducedMotion.mockReturnValueOnce(true);

    render(<KeypointOverlay {...defaultProps} />);

    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders and calls useAccessibilityReducedMotion when reducedMotion=false', () => {
    mockReducedMotion.mockReturnValueOnce(false);

    render(<KeypointOverlay {...defaultProps} />);

    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders keypoint markers regardless of reducedMotion setting', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const { getByText } = render(<KeypointOverlay {...defaultProps} />);

    expect(getByText('TOP')).toBeTruthy();
  });

  it('does not throw when toggling visible with reducedMotion=true', () => {
    mockReducedMotion.mockReturnValue(true);

    const { unmount } = render(<KeypointOverlay {...defaultProps} visible={false} />);
    expect(() => unmount()).not.toThrow();

    const { rerender } = render(<KeypointOverlay {...defaultProps} visible={false} />);
    expect(() => rerender(<KeypointOverlay {...defaultProps} visible={true} />)).not.toThrow();
  });
});