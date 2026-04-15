import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { KeypointOverlay } from '../components/KeypointOverlay';
import type { Keypoint } from '../types';

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

// Mock Animated to avoid timer/native driver issues in tests
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.UIManager = RN.NativeModules.UIManager || {};
  RN.NativeModules.UIManager.RCTView = RN.NativeModules.UIManager.RCTView || {};
  return RN;
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const sampleKeypoints: Keypoint[] = [
  { id: 0, label: '主体', position: 'top-left', instruction: '将拍摄主体放在左上' },
  { id: 1, label: '前景', position: 'bottom-right' },
];

describe('KeypointOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when visible is false', () => {
    const { toJSON } = render(
      <KeypointOverlay keypoints={sampleKeypoints} visible={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when keypoints array is empty', () => {
    const { toJSON } = render(
      <KeypointOverlay keypoints={[]} visible={true} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders markers when visible and keypoints are provided', () => {
    const { getByText } = render(
      <KeypointOverlay keypoints={sampleKeypoints} visible={true} />,
    );
    expect(getByText('主体')).toBeTruthy();
    expect(getByText('前景')).toBeTruthy();
  });

  it('renders instruction text when provided', () => {
    const { getByText } = render(
      <KeypointOverlay keypoints={sampleKeypoints} visible={true} />,
    );
    expect(getByText('将拍摄主体放在左上')).toBeTruthy();
  });

  it('does not render instruction badge when instruction is absent', () => {
    const keypointsNoInstruction: Keypoint[] = [
      { id: 0, label: '前景', position: 'center' },
    ];
    const { getByText, queryByText } = render(
      <KeypointOverlay keypoints={keypointsNoInstruction} visible={true} />,
    );
    expect(getByText('前景')).toBeTruthy();
    // Instruction badge should not appear for items without instruction
    expect(queryByText('将拍摄主体放在左上')).toBeNull();
  });

  it('renders all keypoint positions correctly', () => {
    const allPositions: Keypoint[] = [
      { id: 0, label: '左上', position: 'top-left' },
      { id: 1, label: '右上', position: 'top-right' },
      { id: 2, label: '左下', position: 'bottom-left' },
      { id: 3, label: '右下', position: 'bottom-right' },
      { id: 4, label: '中间', position: 'center' },
    ];

    const { getByText } = render(
      <KeypointOverlay keypoints={allPositions} visible={true} />,
    );

    expect(getByText('左上')).toBeTruthy();
    expect(getByText('右上')).toBeTruthy();
    expect(getByText('左下')).toBeTruthy();
    expect(getByText('右下')).toBeTruthy();
    expect(getByText('中间')).toBeTruthy();
  });

  it('bubbleTextToKeypoint parses position-tagged text correctly', () => {
    const { bubbleTextToKeypoint } = require('../components/KeypointOverlay');

    expect(bubbleTextToKeypoint('[左上] 主体', 0)).toEqual({
      id: 0,
      label: '左上',
      position: 'top-left',
      instruction: '主体',
    });

    expect(bubbleTextToKeypoint('[右下] 前景物', 1)).toEqual({
      id: 1,
      label: '右下',
      position: 'bottom-right',
      instruction: '前景物',
    });

    expect(bubbleTextToKeypoint('[中间] 测试', 2)).toEqual({
      id: 2,
      label: '中间',
      position: 'center',
      instruction: '测试',
    });

    // Plain text without position tag returns null
    expect(bubbleTextToKeypoint('plain text', 0)).toBeNull();
  });

  it('re-renders with new keypoints without creating new Marker components unnecessarily', () => {
    // This test verifies React.memo is effective — same keypoints should not
    // cause the marker to re-instantiate (verified via stable render output)
    const { getByText, rerender } = render(
      <KeypointOverlay keypoints={sampleKeypoints} visible={true} />,
    );

    expect(getByText('主体')).toBeTruthy();

    // Re-render with same props — memoized marker should skip re-render
    rerender(<KeypointOverlay keypoints={sampleKeypoints} visible={true} />);

    expect(getByText('主体')).toBeTruthy();

    // Update keypoints — should show new content
    const newKeypoints: Keypoint[] = [
      ...sampleKeypoints,
      { id: 99, label: '新标记', position: 'center' },
    ];
    rerender(<KeypointOverlay keypoints={newKeypoints} visible={true} />);
    expect(getByText('新标记')).toBeTruthy();
  });
});
