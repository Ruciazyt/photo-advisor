/**
 * Tests for FocusGuideOverlay reduced motion accessibility support
 */

import React from 'react';

jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Mock hooks used by FocusGuideOverlay
const mockReducedMotion = jest.fn(() => false);
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
  useAccessibilityAnnouncement: jest.fn(() => ({ announce: jest.fn(), isScreenReaderEnabled: false })),
}));

jest.mock('../hooks/useAnimationFrameTimer', () => ({
  useAnimationFrameTimer: jest.fn(),
}));

jest.mock('../hooks/useHaptics', () => ({
  useHaptics: jest.fn(() => ({
    mediumImpact: jest.fn(),
    errorNotification: jest.fn(),
    warningNotification: jest.fn(),
    lightImpact: jest.fn(),
  })),
}));

// Mock FocusZoneButton
jest.mock('../components/FocusZoneButton', () => {
  const React = require('react');
  const { TouchableOpacity, View, Text } = require('react-native');
  return {
    FocusZoneButton: ({ zone, onPress }: any) =>
      React.createElement(TouchableOpacity, { onPress, testID: `focus-zone-${zone.label}` },
        React.createElement(View, null,
          React.createElement(Text, null, zone.label)
        )
      ),
  };
});

import { render } from '@testing-library/react-native';
import { FocusGuideOverlay } from '../components/FocusGuideOverlay';

describe('FocusGuideOverlay reduced motion', () => {
  const defaultProps = {
    visible: true,
    cameraRef: { current: null },
    showToast: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useAccessibilityReducedMotion when reducedMotion=true', () => {
    mockReducedMotion.mockReturnValueOnce(true);
    render(<FocusGuideOverlay {...defaultProps} />);
    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('calls useAccessibilityReducedMotion when reducedMotion=false', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    render(<FocusGuideOverlay {...defaultProps} />);
    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders focus zone buttons regardless of reducedMotion setting', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const { getByTestId } = render(<FocusGuideOverlay {...defaultProps} visible={true} />);
    expect(getByTestId('focus-zone-远景')).toBeTruthy();
    expect(getByTestId('focus-zone-标准')).toBeTruthy();
    expect(getByTestId('focus-zone-近拍')).toBeTruthy();
  });

  it('does not throw when toggling visibility with reducedMotion=true', () => {
    mockReducedMotion.mockReturnValue(true);
    const { rerender } = render(<FocusGuideOverlay {...defaultProps} visible={false} />);
    expect(() => rerender(<FocusGuideOverlay {...defaultProps} visible={true} />)).not.toThrow();
    expect(() => rerender(<FocusGuideOverlay {...defaultProps} visible={false} />)).not.toThrow();
  });
});