/**
 * Unit tests for src/components/CameraToolbar.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CameraToolbar } from '../CameraToolbar';

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text testID={`icon-${name}`}>{name}</Text>,
  };
});

// Mock ThemeContext
const mockColors = {
  overlayBg: 'rgba(0,0,0,0.55)',
  text: '#FFFFFF',
  background: '#000000',
  border: 'rgba(255,255,255,0.15)',
  error: '#FF5252',
  primary: '#000000',
};
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: mockColors }),
}));

// Mock useAccessibilityButton
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityButton: ({ label, hint, role }: { label: string; hint: string; role: string }) => ({
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
  }),
}));

const defaultProps = {
  onGallery: jest.fn(),
  onAskAI: jest.fn(),
  onSwitchCamera: jest.fn(),
};

describe('CameraToolbar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all three toolbar buttons', () => {
    const { getByTestId } = render(<CameraToolbar {...defaultProps} />);
    expect(getByTestId('icon-images-outline')).toBeTruthy();
    expect(getByTestId('icon-camera-reverse-outline')).toBeTruthy();
  });

  it('calls onGallery when gallery button is pressed', () => {
    const onGallery = jest.fn();
    const { getByTestId } = render(<CameraToolbar {...defaultProps} onGallery={onGallery} />);
    fireEvent.press(getByTestId('icon-images-outline').parent!);
    expect(onGallery).toHaveBeenCalledTimes(1);
  });

  it('calls onSwitchCamera when switch camera button is pressed', () => {
    const onSwitchCamera = jest.fn();
    const { getByTestId } = render(<CameraToolbar {...defaultProps} onSwitchCamera={onSwitchCamera} />);
    fireEvent.press(getByTestId('icon-camera-reverse-outline').parent!);
    expect(onSwitchCamera).toHaveBeenCalledTimes(1);
  });

  it('calls onAskAI when shutter is pressed without onQuickCapture', () => {
    const onAskAI = jest.fn();
    const { getByLabelText } = render(<CameraToolbar {...defaultProps} onAskAI={onAskAI} />);
    fireEvent.press(getByLabelText('AI摄影'));
    expect(onAskAI).toHaveBeenCalledTimes(1);
  });

  it('renders in video mode with recording indicator', () => {
    const { getByTestId } = render(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={false}
        onStartRecording={jest.fn()}
        onStopRecording={jest.fn()}
      />
    );
    expect(getByTestId('icon-circle-fill')).toBeTruthy();
  });

  it('renders stop icon when isRecording is true in video mode', () => {
    const { getByTestId } = render(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={true}
        onStartRecording={jest.fn()}
        onStopRecording={jest.fn()}
      />
    );
    expect(getByTestId('icon-stop-fill')).toBeTruthy();
  });

  it('calls onStartRecording when recording not active', () => {
    const onStartRecording = jest.fn();
    const { getAllByTestId } = render(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={false}
        onStartRecording={onStartRecording}
        onStopRecording={jest.fn()}
      />
    );
    const icons = getAllByTestId(/^icon-/);
    const shutter = icons[1].parent!.parent;
    fireEvent.press(shutter);
    expect(onStartRecording).toHaveBeenCalledTimes(1);
  });

  it('calls onStopRecording when recording is active', () => {
    const onStopRecording = jest.fn();
    const { getAllByTestId } = render(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={true}
        onStartRecording={jest.fn()}
        onStopRecording={onStopRecording}
      />
    );
    const icons = getAllByTestId(/^icon-/);
    const shutter = icons[1].parent!.parent;
    fireEvent.press(shutter);
    expect(onStopRecording).toHaveBeenCalledTimes(1);
  });

  it('gallery button has correct accessibility label', () => {
    const { getByLabelText } = render(<CameraToolbar {...defaultProps} />);
    expect(getByLabelText('相册')).toBeTruthy();
  });

  it('switch camera button has correct accessibility label', () => {
    const { getByLabelText } = render(<CameraToolbar {...defaultProps} />);
    expect(getByLabelText('切换摄像头')).toBeTruthy();
  });

  it('renders with default photo mode', () => {
    const { queryByTestId } = render(<CameraToolbar {...defaultProps} />);
    expect(queryByTestId('icon-circle-fill')).toBeNull();
    expect(queryByTestId('icon-stop-fill')).toBeNull();
  });

  it('renders without onQuickCapture prop (calls onAskAI instead)', () => {
    const onAskAI = jest.fn();
    const { getByLabelText } = render(<CameraToolbar {...defaultProps} onAskAI={onAskAI} />);
    fireEvent.press(getByLabelText('AI摄影'));
    expect(onAskAI).toHaveBeenCalled();
  });
});
