/**
 * Tests for SceneTagOverlay reduced motion accessibility support
 */

import React from 'react';

// Track withTiming calls for inspection
const withTimingCalls: Array<{ value: unknown; config?: { duration?: number } }> = [];

// Mock reanimated + worklets (same pattern as existing tests in this project)
jest.mock('react-native-reanimated', () => {
  const mockView = (props: React.PropsWithChildren) => props.children;
  const mockText = (props: React.PropsWithChildren) => props.children;
  return {
    __esModule: true,
    default: { View: mockView, Text: mockText },
    useSharedValue: jest.fn((initial: unknown) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value: unknown, config?: { duration?: number }) => {
      withTimingCalls.push({ value, config });
      return value;
    }),
    Easing: {},
  };
});
jest.mock('react-native-worklets');

// Mock the accessibility hook
const mockReducedMotion = jest.fn(() => false);
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
}));

import { render } from '@testing-library/react-native';
import { SceneTagOverlay } from '../SceneTagOverlay';

describe('SceneTagOverlay reduced motion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withTimingCalls.length = 0;
  });

  describe('useAccessibilityReducedMotion integration', () => {
    it('calls useAccessibilityReducedMotion', () => {
      render(<SceneTagOverlay tag="风光" visible={true} />);
      expect(mockReducedMotion).toHaveBeenCalled();
    });

    it('respects reducedMotion=true setting', () => {
      mockReducedMotion.mockReturnValueOnce(true);
      render(<SceneTagOverlay tag="风光" visible={true} />);
      expect(mockReducedMotion).toHaveReturnedWith(true);
    });

    it('respects reducedMotion=false setting', () => {
      mockReducedMotion.mockReturnValueOnce(false);
      render(<SceneTagOverlay tag="人像" visible={false} />);
      expect(mockReducedMotion).toHaveReturnedWith(false);
    });
  });

  describe('withTiming duration behavior', () => {
    it('passes duration=0 when reducedMotion=true and visible=true (fade in)', () => {
      mockReducedMotion.mockReturnValueOnce(true);
      render(<SceneTagOverlay tag="风光" visible={true} />);

      const fadeInCall = withTimingCalls.find(call => call.value === 1);
      expect(fadeInCall).toBeDefined();
      expect(fadeInCall!.config).toEqual(expect.objectContaining({ duration: 0 }));
    });

    it('passes duration=0 when reducedMotion=true and visible=false (fade out)', () => {
      mockReducedMotion.mockReturnValueOnce(true);
      render(<SceneTagOverlay tag="风光" visible={false} />);

      const fadeOutCall = withTimingCalls.find(call => call.value === 0);
      expect(fadeOutCall).toBeDefined();
      expect(fadeOutCall!.config).toEqual(expect.objectContaining({ duration: 0 }));
    });

    it('passes duration=200 when reducedMotion=false and visible=true (fade in)', () => {
      mockReducedMotion.mockReturnValueOnce(false);
      render(<SceneTagOverlay tag="风光" visible={true} />);

      const fadeInCall = withTimingCalls.find(call => call.value === 1);
      expect(fadeInCall).toBeDefined();
      expect(fadeInCall!.config).toEqual(expect.objectContaining({ duration: 200 }));
    });

    it('passes duration=300 when reducedMotion=false and visible=false (fade out)', () => {
      mockReducedMotion.mockReturnValueOnce(false);
      render(<SceneTagOverlay tag="风光" visible={false} />);

      const fadeOutCall = withTimingCalls.find(call => call.value === 0);
      expect(fadeOutCall).toBeDefined();
      expect(fadeOutCall!.config).toEqual(expect.objectContaining({ duration: 300 }));
    });
  });

  describe('render behavior', () => {
    it('renders nothing when tag is null', () => {
      mockReducedMotion.mockReturnValueOnce(false);
      const { queryByText } = render(<SceneTagOverlay tag={null} visible={true} />);
      expect(queryByText('风光')).toBeNull();
    });
  });
});