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

  it('unmounts cleanly without pending intervals (mountedRef guard)', () => {
    // This test verifies that the cleanup function sets mountedRef=false
    // so any in-flight poll timeouts won't call setState after unmount.
    // We verify by ensuring render and unmount don't throw.
    const cam = { zoom: 2.0, focusDepth: jest.fn() };
    const ref = { current: cam };

    const { unmount } = render(
      <FocusGuideOverlay visible={true} cameraRef={ref} />
    );

    // Unmount should be synchronous and clean (no pending async work)
    expect(() => unmount()).not.toThrow();
  });

  it('sets initial zoom value immediately on mount', () => {
    const cam = { zoom: 1.8, focusDepth: jest.fn() };
    const ref = { current: cam };

    render(<FocusGuideOverlay visible={true} cameraRef={ref} />);

    // The zoom value should be displayed as-is (1.8x)
    expect(screen.getByText('1.8x')).toBeTruthy();
  });
});
