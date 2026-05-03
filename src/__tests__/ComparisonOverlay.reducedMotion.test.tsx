/**
 * Tests for ComparisonOverlay reduced motion accessibility support
 */

import React from 'react';

jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Mock the accessibility hook
const mockReducedMotion = jest.fn(() => false);
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
}));

// Mock Image to avoid file system issues
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.UIManager = RN.NativeModules.UIManager || {};
  RN.NativeModules.UIManager.RCTView = RN.NativeModules.UIManager.RCTView || {};
  return RN;
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: ({ name, size, color }: { name: string; size: number; color: string }) =>
      React.createElement('MockIonicons', { name, size, color }),
  };
});

import { render, fireEvent } from '@testing-library/react-native';
import { ComparisonOverlay } from '../components/ComparisonOverlay';
import { Keypoint } from '../components/KeypointOverlay';
import { BubbleItem } from '../components/BubbleOverlay';

describe('ComparisonOverlay reduced motion', () => {
  const defaultProps = {
    imageUri: 'file:///test/photo.jpg',
    keypoints: [] as Keypoint[],
    bubbles: [] as BubbleItem[],
    visible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useAccessibilityReducedMotion when reducedMotion=true', () => {
    mockReducedMotion.mockReturnValueOnce(true);
    render(<ComparisonOverlay {...defaultProps} />);
    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('calls useAccessibilityReducedMotion when reducedMotion=false', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    render(<ComparisonOverlay {...defaultProps} />);
    expect(mockReducedMotion).toHaveBeenCalled();
  });

  it('renders close and toggle buttons regardless of reducedMotion setting', () => {
    mockReducedMotion.mockReturnValueOnce(false);
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} />);
    expect(getByText('✕')).toBeTruthy();
    expect(getByText('📷 原图')).toBeTruthy();
    expect(getByText('✨ AI 标注')).toBeTruthy();
  });

  it('does not throw when toggling visibility with reducedMotion=true', () => {
    mockReducedMotion.mockReturnValue(true);
    const { rerender } = render(<ComparisonOverlay {...defaultProps} visible={false} />);
    expect(() => rerender(<ComparisonOverlay {...defaultProps} visible={true} />)).not.toThrow();
    expect(() => rerender(<ComparisonOverlay {...defaultProps} visible={false} />)).not.toThrow();
  });
});
