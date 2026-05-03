/**
 * Tests for CountdownOverlay reduced motion accessibility support
 */

import React from 'react';

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
}));

import { render } from '@testing-library/react-native';
import { CountdownOverlay } from '../components/CountdownOverlay';

describe('CountdownOverlay reduced motion', () => {
  const defaultProps = {
    count: 3,
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useAccessibilityReducedMotion when reducedMotion=true', () => {
    mockReducedMotion.mockReturnValueOnce(true);
    render(<CountdownOverlay {...defaultProps} />);
    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('calls useAccessibilityReducedMotion when reducedMotion=false', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    render(<CountdownOverlay {...defaultProps} />);
    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders countdown number regardless of reducedMotion setting', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const { getByText } = render(<CountdownOverlay {...defaultProps} count={2} />);
    expect(getByText('2')).toBeTruthy();
  });

  it('does not throw when count changes with reducedMotion=true', () => {
    mockReducedMotion.mockReturnValue(true);
    const { rerender } = render(<CountdownOverlay {...defaultProps} count={3} />);
    expect(() => rerender(<CountdownOverlay {...defaultProps} count={2} />)).not.toThrow();
    expect(() => rerender(<CountdownOverlay {...defaultProps} count={1} />)).not.toThrow();
  });
});