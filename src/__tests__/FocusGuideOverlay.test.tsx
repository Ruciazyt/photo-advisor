/**
 * Tests for FocusGuideOverlay component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FocusGuideOverlay } from '../components/FocusGuideOverlay';

describe('FocusGuideOverlay', () => {
  const mockCameraRef = { current: null };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when visible=false', () => {
    const { toJSON } = render(
      <FocusGuideOverlay visible={false} cameraRef={mockCameraRef} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders zoom indicator and 3 focus zone buttons when visible=true', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={mockCameraRef} />);

    // Zoom label should be visible
    expect(screen.getByText('变焦')).toBeTruthy();
    // Zoom value (starts at 1.0x)
    expect(screen.getByText('1.0x')).toBeTruthy();

    // All three focus zone buttons
    expect(screen.getByText('远景')).toBeTruthy();
    expect(screen.getByText('标准')).toBeTruthy();
    expect(screen.getByText('近拍')).toBeTruthy();
  });

  it('renders DOF warning when zoom >= 2.0', async () => {
    const camWithZoom = { zoom: 2.5, focusDepth: jest.fn() };
    const refWithZoom = { current: camWithZoom };

    render(<FocusGuideOverlay visible={true} cameraRef={refWithZoom} />);

    // Wait for the poll interval to pick up the zoom value
    await new Promise(r => setTimeout(r, 400));
    expect(screen.getByText('⚠️ DOF变浅')).toBeTruthy();
  });

  it('does NOT render DOF warning when zoom < 2.0', async () => {
    const camWithZoom = { zoom: 1.5, focusDepth: jest.fn() };
    const refWithZoom = { current: camWithZoom };

    render(<FocusGuideOverlay visible={true} cameraRef={refWithZoom} />);

    await new Promise(r => setTimeout(r, 400));
    expect(screen.queryByText('⚠️ DOF变浅')).toBeNull();
  });

  it('calls cameraRef.focusDepth with correct depth when a focus zone button is pressed', () => {
    const focusDepthMock = jest.fn();
    const cam = { zoom: 1.0, focusDepth: focusDepthMock };
    const ref = { current: cam };

    render(<FocusGuideOverlay visible={true} cameraRef={ref} />);

    // Tap "远景" (far/infinity, depth 0.95)
    fireEvent.press(screen.getByText('远景'));
    expect(focusDepthMock).toHaveBeenCalledWith(0.95);

    // Tap "标准" (standard, depth 0.5)
    fireEvent.press(screen.getByText('标准'));
    expect(focusDepthMock).toHaveBeenCalledWith(0.5);

    // Tap "近拍" (macro, depth 0.1)
    fireEvent.press(screen.getByText('近拍'));
    expect(focusDepthMock).toHaveBeenCalledWith(0.1);
  });

  it('does NOT call focusDepth when device does not support it', () => {
    // Simulate no focusDepth method
    const cam = { zoom: 1.0 };
    const ref = { current: cam };

    render(<FocusGuideOverlay visible={true} cameraRef={ref} />);

    fireEvent.press(screen.getByText('标准'));
    // Should not crash and should not call focusDepth
  });

  it('does NOT call focusDepth on tap (tap triggers visual feedback only)', () => {
    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    const ref = { current: cam };

    const { UNSAFE_root } = render(
      <FocusGuideOverlay visible={true} cameraRef={ref} />
    );

    // Tap on the overlay (simulate touch)
    fireEvent(UNSAFE_root, 'touchEnd', {
      nativeEvent: { locationX: 100, locationY: 200 },
    });

    // Tap-to-focus does NOT call focusDepth (it's visual-only)
    expect(cam.focusDepth).not.toHaveBeenCalled();
  });
});
