/**
 * Tests for BubbleOverlay reduced motion accessibility support
 */

import React from 'react';

// Mock reanimated + worklets (same pattern as existing tests in this project)
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Mock the accessibility hook
const mockReducedMotion = jest.fn(() => false);
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: jest.fn(() => ({
    announce: jest.fn(),
    isScreenReaderEnabled: false,
  })),
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
  useAccessibilityButton: jest.fn(() => ({ accessibilityLabel: '', accessibilityHint: '' })),
}));

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      bubbleBg: 'rgba(0,0,0,0.75)',
      bubbleText: '#fff',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

import { render } from '@testing-library/react-native';
import { BubbleOverlay } from '../components/BubbleOverlay';
import type { BubbleItem } from '../types';

describe('BubbleOverlay reduced motion', () => {
  const defaultProps = {
    visibleItems: [
      { id: 1, text: '构图不错', position: 'top-left' as const },
      { id: 2, text: '稍微往左', position: 'top-left' as const },
    ],
    loading: false,
    onDismiss: jest.fn(),
    onDismissAll: jest.fn(),
    onBubbleAppear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and calls useAccessibilityReducedMotion when reducedMotion=true', () => {
    mockReducedMotion.mockReturnValueOnce(true);

    render(<BubbleOverlay {...defaultProps} />);

    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders and calls useAccessibilityReducedMotion when reducedMotion=false', () => {
    mockReducedMotion.mockReturnValueOnce(false);

    render(<BubbleOverlay {...defaultProps} />);

    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders bubble items correctly regardless of reducedMotion setting', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const { getByText } = render(<BubbleOverlay {...defaultProps} />);

    expect(getByText('构图不错')).toBeTruthy();
    expect(getByText('稍微往左')).toBeTruthy();
  });

  it('does not throw when toggling visible with reducedMotion=true', () => {
    mockReducedMotion.mockReturnValue(true);

    const { unmount } = render(<BubbleOverlay {...defaultProps} visibleItems={[]} />);
    expect(() => unmount()).not.toThrow();

    const { rerender } = render(<BubbleOverlay {...defaultProps} visibleItems={[]} />);
    expect(() =>
      rerender(
        <BubbleOverlay
          {...defaultProps}
          visibleItems={[{ id: 1, text: '新建议', position: 'top-left' as const }]}
        />
      )
    ).not.toThrow();
  });

  it('renders dismiss all button when multiple items regardless of reducedMotion', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const { getByText } = render(<BubbleOverlay {...defaultProps} />);

    expect(getByText('清除全部')).toBeTruthy();
  });

  it('calls onBubbleAppear when bubble appears regardless of reducedMotion', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const onBubbleAppear = jest.fn();

    render(<BubbleOverlay {...defaultProps} onBubbleAppear={onBubbleAppear} />);

    // onBubbleAppear is called from within useEffect after mount
    expect(onBubbleAppear).toHaveBeenCalledWith('构图不错');
  });
});