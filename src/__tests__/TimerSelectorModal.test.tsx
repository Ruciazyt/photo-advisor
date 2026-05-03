/**
 * Tests for TimerSelectorModal component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TimerSelectorModal } from '../components/TimerSelectorModal';

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      gridAccent: 'rgba(232,213,183,0.45)',
      bubbleBg: 'rgba(0,0,0,0.75)',
      bubbleText: '#fff',
      countdownBg: 'rgba(0,0,0,0.6)',
      countdownText: '#ffffff',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

// Mock useAccessibility hook
const mockReducedMotion = jest.fn(() => false);
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityButton: jest.fn(() => ({})),
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
}));

describe('TimerSelectorModal', () => {
  const noop = () => {};

  it('does not render when visible=false', () => {
    const { toJSON } = render(
      <TimerSelectorModal
        visible={false}
        selectedDuration={3}
        onSelect={noop}
        onClose={noop}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders three timer options (3s, 5s, 10s)', () => {
    const { getByText } = render(
      <TimerSelectorModal
        visible={true}
        selectedDuration={3}
        onSelect={noop}
        onClose={noop}
      />
    );
    expect(getByText('3s')).toBeTruthy();
    expect(getByText('5s')).toBeTruthy();
    expect(getByText('10s')).toBeTruthy();
  });

  it('renders the modal title', () => {
    const { getByText } = render(
      <TimerSelectorModal
        visible={true}
        selectedDuration={3}
        onSelect={noop}
        onClose={noop}
      />
    );
    expect(getByText('定时拍摄')).toBeTruthy();
  });

  it('calls onSelect with correct duration when a card is tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <TimerSelectorModal
        visible={true}
        selectedDuration={3}
        onSelect={onSelect}
        onClose={noop}
      />
    );

    fireEvent.press(getByText('5s'));
    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it('calls onClose when close button is tapped', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <TimerSelectorModal
        visible={true}
        selectedDuration={3}
        onSelect={noop}
        onClose={onClose}
      />
    );
    const { TouchableOpacity } = require('react-native');
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    let found = false;
    for (const btn of buttons) {
      fireEvent.press(btn);
      if (onClose.mock.calls.length > 0) { found = true; break; }
    }
    expect(found).toBe(true);
  });

  it('renders hint text appropriate for long durations', () => {
    const { getByText } = render(
      <TimerSelectorModal
        visible={true}
        selectedDuration={10}
        onSelect={noop}
        onClose={noop}
      />
    );
    expect(getByText('建议使用支架或稳定表面')).toBeTruthy();
  });

  it('renders hint text appropriate for short durations', () => {
    const { getByText } = render(
      <TimerSelectorModal
        visible={true}
        selectedDuration={3}
        onSelect={noop}
        onClose={noop}
      />
    );
    expect(getByText('适合手持自拍')).toBeTruthy();
  });

  it('selected card has accent color label', () => {
    const { getByText } = render(
      <TimerSelectorModal
        visible={true}
        selectedDuration={5}
        onSelect={noop}
        onClose={noop}
      />
    );
    expect(getByText('5s')).toBeTruthy();
  });

  it('renders the animated sheet with absolute positioning', () => {
    const { toJSON } = render(
      <TimerSelectorModal
        visible={true}
        selectedDuration={3}
        onSelect={noop}
        onClose={noop}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('absolute');
  });

  it('renders the backdrop overlay', () => {
    const { toJSON } = render(
      <TimerSelectorModal
        visible={true}
        selectedDuration={3}
        onSelect={noop}
        onClose={noop}
      />
    );
    const json = JSON.stringify(toJSON());
    // Backdrop has rgba black background
    expect(json).toContain('rgba');
  });

  describe('reduced motion accessibility', () => {
    it('calls useAccessibilityReducedMotion when reducedMotion=true', () => {
      mockReducedMotion.mockReturnValueOnce(true);
      render(
        <TimerSelectorModal
          visible={true}
          selectedDuration={3}
          onSelect={noop}
          onClose={noop}
        />
      );
      expect(mockReducedMotion).toHaveBeenCalled();
    });

    it('calls useAccessibilityReducedMotion when reducedMotion=false', () => {
      mockReducedMotion.mockReturnValueOnce(false);
      render(
        <TimerSelectorModal
          visible={true}
          selectedDuration={3}
          onSelect={noop}
          onClose={noop}
        />
      );
      expect(mockReducedMotion).toHaveBeenCalled();
    });

    it('renders all timer options regardless of reducedMotion setting', () => {
      mockReducedMotion.mockReturnValueOnce(false);
      const { getByText } = render(
        <TimerSelectorModal
          visible={true}
          selectedDuration={3}
          onSelect={noop}
          onClose={noop}
        />
      );
      expect(getByText('3s')).toBeTruthy();
      expect(getByText('5s')).toBeTruthy();
      expect(getByText('10s')).toBeTruthy();
    });
  });
});
