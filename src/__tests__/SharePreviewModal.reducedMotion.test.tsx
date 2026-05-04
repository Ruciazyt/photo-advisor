/**
 * Tests for SharePreviewModal reduced motion accessibility support
 */

import React from 'react';

jest.mock('react-native-reanimated');
jest.mock('react-native-view-shot');

// Mock the accessibility hook
const mockReducedMotion = jest.fn(() => false);
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: jest.fn(() => ({
    announce: jest.fn(),
    isScreenReaderEnabled: false,
  })),
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
}));

import { render, fireEvent } from '@testing-library/react-native';
import { SharePreviewModal } from '../components/SharePreviewModal';

const defaultProps = {
  visible: true,
  photoUri: 'https://example.com/photo.jpg',
  suggestions: ['主体偏左，建议右移', '前景略显杂乱'],
  gridType: '三分法',
  score: 78,
  gridVariant: 'thirds',
  captionText: '',
  onCaptionChange: jest.fn(),
  onShare: jest.fn(),
  onCancel: jest.fn(),
  photoAspectRatio: 3 / 4,
};

describe('SharePreviewModal reduced motion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useAccessibilityReducedMotion when reducedMotion=true', () => {
    mockReducedMotion.mockReturnValueOnce(true);
    render(<SharePreviewModal {...defaultProps} />);
    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('calls useAccessibilityReducedMotion when reducedMotion=false', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    render(<SharePreviewModal {...defaultProps} />);
    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders modal content regardless of reducedMotion setting', () => {
    mockReducedMotion.mockReturnValue(false);
    const { getByTestId, getByLabelText } = render(<SharePreviewModal {...defaultProps} />);
    expect(getByTestId('caption-input')).toBeTruthy();
    // Verify caption input (label) and share/cancel buttons are rendered
    expect(getByLabelText('分享配文')).toBeTruthy();
    expect(getByLabelText('取消')).toBeTruthy();
    expect(getByLabelText('分享')).toBeTruthy();
  });

  it('does not throw when visible changes with reducedMotion=true', () => {
    mockReducedMotion.mockReturnValue(true);
    const { rerender } = render(<SharePreviewModal {...defaultProps} visible={true} />);
    expect(() => rerender(<SharePreviewModal {...defaultProps} visible={false} />)).not.toThrow();
    expect(() => rerender(<SharePreviewModal {...defaultProps} visible={true} />)).not.toThrow();
  });

  it('cancel button is accessible and triggers onCancel', () => {
    mockReducedMotion.mockReturnValue(false);
    const onCancel = jest.fn();
    const { getByTestId } = render(<SharePreviewModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.press(getByTestId('cancel-btn'));
    expect(onCancel).toHaveBeenCalled();
  });
});
