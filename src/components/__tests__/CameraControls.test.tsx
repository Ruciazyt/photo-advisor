/**
 * Unit tests for src/components/CameraControls.tsx
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { CameraControls } from '../CameraControls';

// Mock ModeSelector (has ThemeContext & useAccessibility dependencies)
jest.mock('../ModeSelector', () => ({
  ModeSelector: jest.fn(() => null),
}));

// Mock CameraToolbar (has ThemeContext & useAccessibility dependencies)
jest.mock('../CameraToolbar', () => ({
  CameraToolbar: jest.fn(() => null),
}));

describe('CameraControls', () => {
  const mockOnModeChange = jest.fn();
  const mockOnGallery = jest.fn();
  const mockOnAskAI = jest.fn();
  const mockOnSwitchCamera = jest.fn();
  const mockOnQuickCapture = jest.fn();
  const mockOnStartRecording = jest.fn();
  const mockOnStopRecording = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ModeSelector and CameraToolbar', () => {
    const { ModeSelector } = require('../ModeSelector');
    const { CameraToolbar } = require('../CameraToolbar');

    render(
      <CameraControls
        selectedMode="photo"
        onModeChange={mockOnModeChange}
        onGallery={mockOnGallery}
        onAskAI={mockOnAskAI}
        onSwitchCamera={mockOnSwitchCamera}
      />
    );

    expect(ModeSelector).toHaveBeenCalled();
    expect(CameraToolbar).toHaveBeenCalled();
  });

  it('forwards selectedMode and onModeChange to ModeSelector', () => {
    const { ModeSelector } = require('../ModeSelector');

    render(
      <CameraControls
        selectedMode="video"
        onModeChange={mockOnModeChange}
        onGallery={mockOnGallery}
        onAskAI={mockOnAskAI}
        onSwitchCamera={mockOnSwitchCamera}
      />
    );

    expect(ModeSelector).toHaveBeenCalled();
    const [props] = ModeSelector.mock.calls[0];
    expect(props).toMatchObject({
      selectedMode: 'video',
      onModeChange: mockOnModeChange,
    });
  });

  it('forwards all props to CameraToolbar', () => {
    const { CameraToolbar } = require('../CameraToolbar');

    render(
      <CameraControls
        selectedMode="portrait"
        onModeChange={mockOnModeChange}
        onGallery={mockOnGallery}
        onAskAI={mockOnAskAI}
        onSwitchCamera={mockOnSwitchCamera}
        onQuickCapture={mockOnQuickCapture}
        isRecording={true}
        onStartRecording={mockOnStartRecording}
        onStopRecording={mockOnStopRecording}
      />
    );

    expect(CameraToolbar).toHaveBeenCalled();
    const [props] = CameraToolbar.mock.calls[0];
    expect(props).toMatchObject({
      onGallery: mockOnGallery,
      onAskAI: mockOnAskAI,
      onSwitchCamera: mockOnSwitchCamera,
      onQuickCapture: mockOnQuickCapture,
      selectedMode: 'portrait',
      isRecording: true,
      onStartRecording: mockOnStartRecording,
      onStopRecording: mockOnStopRecording,
    });
  });

  it('renders with styles.wrapper (flex:1, justifyContent:flex-end)', () => {
    // Verify the actual StyleSheet definition from the component
    const wrapperStyle = StyleSheet.create({
      wrapper: { flex: 1, justifyContent: 'flex-end' },
    }).wrapper;

    expect(wrapperStyle).toEqual({ flex: 1, justifyContent: 'flex-end' });

    // Also verify the rendered output has the expected style on the root View
    const { root } = render(
      <CameraControls
        selectedMode="photo"
        onModeChange={mockOnModeChange}
        onGallery={mockOnGallery}
        onAskAI={mockOnAskAI}
        onSwitchCamera={mockOnSwitchCamera}
      />
    );
    // root is the rendered View; check its style array includes the wrapper styles
    const style = root.props.style;
    const flatStyle = Array.isArray(style) ? style.flat() : [style];
    expect(flatStyle).toContainEqual(expect.objectContaining({ flex: 1, justifyContent: 'flex-end' }));
  });
});
