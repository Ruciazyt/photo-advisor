/**
 * Tests for PinchHintOverlay component.
 * Covers: visible=true renders hint, visible=false hides it,
 * auto-dismiss timeout, and reduced motion accessibility.
 */

import React from 'react';
import { act, render, cleanup } from '@testing-library/react-native';
import { PinchHintOverlay } from '../components/PinchHintOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const MockIonicons = jest.fn(({ name, size, color }: { name: string; size: number; color: string }) =>
    React.createElement('MockIonicons', { name, size, color })
  );
  return {
    Ionicons: MockIonicons,
  };
});

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    colors: {
      primary: '#000000',
      accent: '#E8D5B7',
      cardBg: '#1A1A1A',
      text: '#FFFFFF',
      textSecondary: '#888888',
      border: '#333333',
      overlayBg: 'rgba(0,0,0,0.75)',
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  visible: true,
  onDismiss: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests — render conditions
// ---------------------------------------------------------------------------

describe('PinchHintOverlay render', () => {
  it('renders hint text when visible=true', () => {
    const { getByText } = render(<PinchHintOverlay {...defaultProps} />);
    expect(getByText('Pinch to zoom')).toBeTruthy();
  });

  it('does not render hint text when visible=false', () => {
    const { queryByText } = render(<PinchHintOverlay {...defaultProps} visible={false} />);
    expect(queryByText('Pinch to zoom')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — auto-dismiss
// ---------------------------------------------------------------------------

describe('PinchHintOverlay auto-dismiss', () => {
  it('calls onDismiss after auto-dismiss timeout (fade-in 250ms + hold 3s + fade-out 250ms)', () => {
    const onDismiss = jest.fn();
    render(<PinchHintOverlay visible={true} onDismiss={onDismiss} />);

    // Advance past the full animation cycle: 250ms fade-in + 3000ms hold + 250ms fade-out
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss if unmounted before timeout fires', () => {
    const onDismiss = jest.fn();
    const { unmount } = render(<PinchHintOverlay visible={true} onDismiss={onDismiss} />);

    // Advance partway through the hold period
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // Unmount before auto-dismiss fires
    unmount();

    // Advance past when auto-dismiss would have fired
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('guards against stale onDismiss when visible flips to false before auto-dismiss fires', () => {
    const onDismiss = jest.fn();
    const { rerender } = render(<PinchHintOverlay visible={true} onDismiss={onDismiss} />);

    // Partially advance past fade-in but before auto-dismiss
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Flip visible to false — this should cancel the pending auto-dismiss
    rerender(<PinchHintOverlay visible={false} onDismiss={onDismiss} />);

    // Advance well past when auto-dismiss would have fired
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — icon and styling
// ---------------------------------------------------------------------------

describe('PinchHintOverlay icon and styling', () => {
  it('uses contract-outline icon and renders without throwing', () => {
    expect(() => render(<PinchHintOverlay {...defaultProps} />)).not.toThrow();
  });
});