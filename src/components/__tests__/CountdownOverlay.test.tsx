/**
 * Unit tests for src/components/CountdownOverlay.tsx
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CountdownOverlay } from '../CountdownOverlay';

// Mock reanimated + worklets (same pattern as existing tests in this project)
jest.mock('react-native-reanimated', () => {
  const mockView = (props: React.PropsWithChildren) => props.children;
  const mockText = (props: React.PropsWithChildren) => props.children;
  return {
    __esModule: true,
    default: { View: mockView, Text: mockText },
    useSharedValue: jest.fn((initial: unknown) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value: unknown) => value),
    cancelAnimation: jest.fn(),
    Easing: { out: jest.fn(), ease: jest.fn() },
  };
});
jest.mock('react-native-worklets');

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      overlayBg: 'rgba(0,0,0,0.6)',
      countdownBg: '#1a1a1a',
      countdownBorder: '#e8d5b7',
      countdownText: '#ffffff',
    },
  }),
}));

// Mock useAccessibility
const mockAnnounce = jest.fn();
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: () => ({ announce: mockAnnounce }),
  useAccessibilityReducedMotion: () => ({ reducedMotion: false }),
}));

describe('CountdownOverlay', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders count number as text', () => {
    const { getByText } = render(
      <CountdownOverlay count={3} onComplete={mockOnComplete} />
    );
    expect(getByText('3')).toBeTruthy();
  });

  it('renders different count values correctly', () => {
    const { getByText, rerender } = render(
      <CountdownOverlay count={3} onComplete={mockOnComplete} />
    );
    expect(getByText('3')).toBeTruthy();

    rerender(<CountdownOverlay count={2} onComplete={mockOnComplete} />);
    expect(getByText('2')).toBeTruthy();

    rerender(<CountdownOverlay count={1} onComplete={mockOnComplete} />);
    expect(getByText('1')).toBeTruthy();
  });

  it('announces count change via accessibility', () => {
    const { rerender } = render(
      <CountdownOverlay count={3} onComplete={mockOnComplete} />
    );
    expect(mockAnnounce).toHaveBeenCalledWith('3秒', 'assertive');
    mockAnnounce.mockClear();

    rerender(<CountdownOverlay count={2} onComplete={mockOnComplete} />);
    expect(mockAnnounce).toHaveBeenCalledWith('2秒', 'assertive');

    rerender(<CountdownOverlay count={1} onComplete={mockOnComplete} />);
    expect(mockAnnounce).toHaveBeenCalledWith('1秒', 'assertive');
  });

  it('does not re-announce when count stays the same (via prevCountRef)', () => {
    const { rerender } = render(
      <CountdownOverlay count={3} onComplete={mockOnComplete} />
    );
    expect(mockAnnounce).toHaveBeenCalledTimes(1);

    rerender(<CountdownOverlay count={3} onComplete={mockOnComplete} />);
    // Still only called once — prevCountRef prevents re-announce
    expect(mockAnnounce).toHaveBeenCalledTimes(1);
  });

  it('renders with correct container accessibility role', () => {
    const { getByLabelText } = render(
      <CountdownOverlay count={3} onComplete={mockOnComplete} />
    );
    // accessibilityLabel={`倒计时 ${count} 秒`}
    expect(getByLabelText('倒计时 3 秒')).toBeTruthy();
  });

  it('renders countdown bubble with number inside', () => {
    const { getByText } = render(
      <CountdownOverlay count={3} onComplete={mockOnComplete} />
    );
    // The number appears inside a circular bubble
    expect(getByText('3')).toBeTruthy();
  });

  it('renders count=0 does not crash', () => {
    const { getByText } = render(
      <CountdownOverlay count={0} onComplete={mockOnComplete} />
    );
    expect(getByText('0')).toBeTruthy();
  });
});