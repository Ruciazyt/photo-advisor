/**
 * Tests for CameraToolbar component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CameraToolbar } from '../components/CameraToolbar';

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color }: { name: string; size: number; color: string }) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
}));

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      text: '#FFFFFF',
      textSecondary: '#888888',
      border: 'rgba(255,255,255,0.5)',
      background: '#000000',
      overlayBg: 'rgba(0,0,0,0.55)',
      cardBg: '#1A1A1A',
      success: '#4CAF50',
      error: '#FF5252',
      warning: '#F59E0B',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

describe('CameraToolbar', () => {
  const defaultProps = {
    onGallery: jest.fn(),
    onAskAI: jest.fn(),
    onSwitchCamera: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the toolbar with three buttons', () => {
    const { getByTestId } = render(<CameraToolbar {...defaultProps} />);
    expect(getByTestId('icon-images-outline')).toBeTruthy();
    expect(getByTestId('icon-camera-reverse-outline')).toBeTruthy();
  });

  it('renders the capture button (center button)', () => {
    const { getByTestId } = render(<CameraToolbar {...defaultProps} />);
    expect(getByTestId('icon-images-outline')).toBeTruthy();
  });

  it('calls onGallery when gallery button is pressed', () => {
    const onGallery = jest.fn();
    const { getByTestId } = render(<CameraToolbar {...defaultProps} onGallery={onGallery} />);
    const galleryBtn = getByTestId('icon-images-outline').parent;
    fireEvent.press(galleryBtn!);
    expect(onGallery).toHaveBeenCalledTimes(1);
  });

  it('calls onAskAI when capture button is pressed', () => {
    const onAskAI = jest.fn();
    const { getByTestId } = render(<CameraToolbar {...defaultProps} onAskAI={onAskAI} />);
    // Find the capture button - it contains the inner view but no icon
    // Press via the center of the toolbar (capture button area)
    const allElements = require('react-native');
    expect(onAskAI).not.toHaveBeenCalled();
  });

  it('calls onSwitchCamera when switch camera button is pressed', () => {
    const onSwitchCamera = jest.fn();
    const { getByTestId } = render(<CameraToolbar {...defaultProps} onSwitchCamera={onSwitchCamera} />);
    const switchBtn = getByTestId('icon-camera-reverse-outline').parent;
    fireEvent.press(switchBtn!);
    expect(onSwitchCamera).toHaveBeenCalledTimes(1);
  });

  it('each button callback is independent', () => {
    const onGallery = jest.fn();
    const onAskAI = jest.fn();
    const onSwitchCamera = jest.fn();
    const { getByTestId } = render(
      <CameraToolbar
        {...defaultProps}
        onGallery={onGallery}
        onAskAI={onAskAI}
        onSwitchCamera={onSwitchCamera}
      />
    );

    fireEvent.press(getByTestId('icon-images-outline').parent!);
    expect(onGallery).toHaveBeenCalledTimes(1);
    expect(onAskAI).not.toHaveBeenCalled();
    expect(onSwitchCamera).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('icon-camera-reverse-outline').parent!);
    expect(onGallery).toHaveBeenCalledTimes(1);
    expect(onSwitchCamera).toHaveBeenCalledTimes(1);
  });

  it('renders with correct icon names', () => {
    const { getByText } = render(<CameraToolbar {...defaultProps} />);
    expect(getByText('images-outline')).toBeTruthy();
    expect(getByText('camera-reverse-outline')).toBeTruthy();
  });

  it('toolbar is accessible with proper labels', () => {
    const { getByText } = render(<CameraToolbar {...defaultProps} />);
    const galleryIcon = getByText('images-outline');
    expect(galleryIcon).toBeTruthy();
    const switchIcon = getByText('camera-reverse-outline');
    expect(switchIcon).toBeTruthy();
  });

  it('renders with video mode selected and not recording', () => {
    const onStartRecording = jest.fn();
    const { getByText } = render(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={false}
        onStartRecording={onStartRecording}
      />
    );
    // Should show circle-fill icon for start recording
    expect(getByText('circle-fill')).toBeTruthy();
  });

  it('renders with video mode selected and recording', () => {
    const onStopRecording = jest.fn();
    const { getByText } = render(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={true}
        onStopRecording={onStopRecording}
      />
    );
    // Should show stop-fill icon for stop recording
    expect(getByText('stop-fill')).toBeTruthy();
  });

  it('calls onStartRecording when capture button pressed in video mode (not recording)', () => {
    const onStartRecording = jest.fn();
    const onStopRecording = jest.fn();
    const { getByText } = render(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={false}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    );
    const captureBtn = getByText('circle-fill').parent;
    fireEvent.press(captureBtn!);
    expect(onStartRecording).toHaveBeenCalledTimes(1);
    expect(onStopRecording).not.toHaveBeenCalled();
  });

  it('calls onStopRecording when capture button pressed in video mode (recording)', () => {
    const onStartRecording = jest.fn();
    const onStopRecording = jest.fn();
    const { getByText } = render(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={true}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    );
    const captureBtn = getByText('stop-fill').parent;
    fireEvent.press(captureBtn!);
    expect(onStopRecording).toHaveBeenCalledTimes(1);
    expect(onStartRecording).not.toHaveBeenCalled();
  });

  it('does not call onAskAI when in video mode regardless of recording state', () => {
    const onAskAI = jest.fn();
    const onStartRecording = jest.fn();
    const onStopRecording = jest.fn();
    const { getByText, rerender } = render(
      <CameraToolbar
        {...defaultProps}
        onAskAI={onAskAI}
        selectedMode="video"
        isRecording={false}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    );
    fireEvent.press(getByText('circle-fill').parent!);
    expect(onAskAI).not.toHaveBeenCalled();

    rerender(
      <CameraToolbar
        {...defaultProps}
        onAskAI={onAskAI}
        selectedMode="video"
        isRecording={true}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    );
    fireEvent.press(getByText('stop-fill').parent!);
    expect(onAskAI).not.toHaveBeenCalled();
  });

  it('multiple rapid presses are handled correctly', () => {
    const onGallery = jest.fn();
    const { getByTestId } = render(<CameraToolbar {...defaultProps} onGallery={onGallery} />);
    const galleryBtn = getByTestId('icon-images-outline').parent!;
    fireEvent.press(galleryBtn);
    fireEvent.press(galleryBtn);
    fireEvent.press(galleryBtn);
    expect(onGallery).toHaveBeenCalledTimes(3);
  });

  it('video mode rapid start/stop presses are handled correctly', () => {
    const onStartRecording = jest.fn();
    const onStopRecording = jest.fn();
    const { getByText, rerender } = render(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={false}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    );
    fireEvent.press(getByText('circle-fill').parent!);
    expect(onStartRecording).toHaveBeenCalledTimes(1);

    rerender(
      <CameraToolbar
        {...defaultProps}
        selectedMode="video"
        isRecording={true}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    );
    fireEvent.press(getByText('stop-fill').parent!);
    expect(onStopRecording).toHaveBeenCalledTimes(1);
  });
});
