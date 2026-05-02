import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CameraControls } from '../components/CameraControls';

jest.mock('../components/ModeSelector', () => ({
  ModeSelector: ({ selectedMode, onModeChange }: { selectedMode: string; onModeChange: (m: string) => void }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="mode-selector" onPress={() => onModeChange('scan')}>
        <Text>{selectedMode}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../components/CameraToolbar', () => ({
  CameraToolbar: ({ onGallery, onAskAI, onSwitchCamera, onQuickCapture }: {
    onGallery: () => void; onAskAI: () => void; onSwitchCamera: () => void; onQuickCapture?: () => void;
  }) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View>
        <TouchableOpacity testID="gallery-btn" onPress={onGallery}><Text>Gallery</Text></TouchableOpacity>
        <TouchableOpacity testID="ask-ai-btn" onPress={onAskAI}><Text>AI</Text></TouchableOpacity>
        <TouchableOpacity testID="switch-camera-btn" onPress={onSwitchCamera}><Text>Switch</Text></TouchableOpacity>
        {onQuickCapture && <TouchableOpacity testID="quick-capture-btn" onPress={onQuickCapture}><Text>QuickCapture</Text></TouchableOpacity>}
      </View>
    );
  },
}));

describe('CameraControls', () => {
  const defaultProps = {
    selectedMode: 'photo' as const,
    onModeChange: jest.fn(),
    onGallery: jest.fn(),
    onAskAI: jest.fn(),
    onSwitchCamera: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { getByTestId } = render(<CameraControls {...defaultProps} />);
    expect(getByTestId('mode-selector')).toBeTruthy();
    expect(getByTestId('gallery-btn')).toBeTruthy();
  });

  it('calls onModeChange when mode selector is pressed', () => {
    const onModeChange = jest.fn();
    const { getByTestId } = render(<CameraControls {...defaultProps} onModeChange={onModeChange} />);
    fireEvent.press(getByTestId('mode-selector'));
    expect(onModeChange).toHaveBeenCalledWith('scan');
  });

  it('calls onGallery when gallery button is pressed', () => {
    const onGallery = jest.fn();
    const { getByTestId } = render(<CameraControls {...defaultProps} onGallery={onGallery} />);
    fireEvent.press(getByTestId('gallery-btn'));
    expect(onGallery).toHaveBeenCalled();
  });

  it('calls onAskAI when AI button is pressed', () => {
    const onAskAI = jest.fn();
    const { getByTestId } = render(<CameraControls {...defaultProps} onAskAI={onAskAI} />);
    fireEvent.press(getByTestId('ask-ai-btn'));
    expect(onAskAI).toHaveBeenCalled();
  });

  it('calls onSwitchCamera when switch camera button is pressed', () => {
    const onSwitchCamera = jest.fn();
    const { getByTestId } = render(<CameraControls {...defaultProps} onSwitchCamera={onSwitchCamera} />);
    fireEvent.press(getByTestId('switch-camera-btn'));
    expect(onSwitchCamera).toHaveBeenCalled();
  });

  it('passes selectedMode to ModeSelector', () => {
    const { getByText } = render(<CameraControls {...defaultProps} selectedMode="video" />);
    expect(getByText('video')).toBeTruthy();
  });

  it('passes onQuickCapture to CameraToolbar when provided', () => {
    const onQuickCapture = jest.fn();
    const { getByTestId } = render(<CameraControls {...defaultProps} onQuickCapture={onQuickCapture} />);
    expect(getByTestId('quick-capture-btn')).toBeTruthy();
    fireEvent.press(getByTestId('quick-capture-btn'));
    expect(onQuickCapture).toHaveBeenCalled();
  });

  it('does not render quick-capture button when onQuickCapture is not provided', () => {
    const { queryByTestId } = render(<CameraControls {...defaultProps} />);
    expect(queryByTestId('quick-capture-btn')).toBeNull();
  });
});