/**
 * Tests for BurstSuggestionOverlay reduced motion accessibility support
 */

import React from 'react';

// Mock reanimated + worklets (same pattern as existing tests in this project)
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: ({ name, size, color }: { name: string; size: number; color: string }) =>
      React.createElement('MockIonicons', { name, size, color }),
  };
});

// Mock the accessibility hook
const mockReducedMotion = jest.fn(() => false);
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: jest.fn(() => ({
    announce: jest.fn(),
    isScreenReaderEnabled: false,
  })),
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
}));

import { render } from '@testing-library/react-native';
import { BurstSuggestionOverlay } from '../components/BurstSuggestionOverlay';

describe('BurstSuggestionOverlay reduced motion', () => {
  const defaultProps = {
    visible: true,
    suggestion: '检测到精彩画面',
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and calls useAccessibilityReducedMotion when reducedMotion=true', () => {
    mockReducedMotion.mockReturnValueOnce(true);

    render(<BurstSuggestionOverlay {...defaultProps} visible={true} />);

    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders and calls useAccessibilityReducedMotion when reducedMotion=false', () => {
    mockReducedMotion.mockReturnValueOnce(false);

    render(<BurstSuggestionOverlay {...defaultProps} visible={true} />);

    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders correctly with title and buttons regardless of reducedMotion setting', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const { getByText } = render(<BurstSuggestionOverlay {...defaultProps} visible={true} />);

    expect(getByText('建议连拍')).toBeTruthy();
    expect(getByText('开始连拍')).toBeTruthy();
    expect(getByText('忽略')).toBeTruthy();
  });

  it('does not throw when toggling visible with reducedMotion=true', () => {
    mockReducedMotion.mockReturnValue(true);

    const { unmount } = render(<BurstSuggestionOverlay {...defaultProps} visible={false} />);
    expect(() => unmount()).not.toThrow();

    const { rerender } = render(<BurstSuggestionOverlay {...defaultProps} visible={false} />);
    expect(() => rerender(<BurstSuggestionOverlay {...defaultProps} visible={true} />)).not.toThrow();
  });
});