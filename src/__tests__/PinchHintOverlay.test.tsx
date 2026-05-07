/**
 * PinchHintOverlay unit tests.
 */

import React from 'react';

// Use the pre-built __mocks__/react-native-reanimated which provides Animated.View etc.
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

// Mock the theme context
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      overlayBg: '#000000cc',
      text: '#ffffff',
      accent: '#ff9500',
    },
  })),
}));

import { render } from '@testing-library/react-native';
import { PinchHintOverlay } from '../components/PinchHintOverlay';

describe('PinchHintOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders hint text when visible is true', () => {
    const { getByText } = render(<PinchHintOverlay visible={true} onDismiss={jest.fn()} />);
    expect(getByText('Pinch to zoom')).toBeTruthy();
  });

  it('auto-dismisses after 3 seconds when visible', () => {
    const onDismiss = jest.fn();
    render(<PinchHintOverlay visible={true} onDismiss={onDismiss} />);

    // Before 3 seconds, should not have dismissed
    jest.advanceTimersByTime(2000);
    expect(onDismiss).not.toHaveBeenCalled();

    // After 3 seconds, should have dismissed
    jest.advanceTimersByTime(1500);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss when visible becomes false before timer fires', () => {
    const onDismiss = jest.fn();
    const { rerender } = render(<PinchHintOverlay visible={true} onDismiss={onDismiss} />);

    // Hide the overlay before auto-dismiss fires
    rerender(<PinchHintOverlay visible={false} onDismiss={onDismiss} />);
    jest.advanceTimersByTime(5000);

    // onDismiss should not be called because the overlay was hidden
    expect(onDismiss).not.toHaveBeenCalled();
  });
});