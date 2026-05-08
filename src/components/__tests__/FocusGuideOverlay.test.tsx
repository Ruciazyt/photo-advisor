/**
 * Unit tests for src/components/FocusGuideOverlay.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FocusGuideOverlay } from '../FocusGuideOverlay';
import { FOCUS_ZONES } from '../FocusGuideOverlay';

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000000',
      cardBg: '#1a1a1a',
      border: '#333333',
      text: '#ffffff',
      textSecondary: '#888888',
      accent: '#e8d5b7',
      background: '#000000',
      warning: '#ff9800',
      sunColor: '#ffd700',
    },
  }),
}));

// Mock useAccessibilityReducedMotion
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: false })),
  useAccessibilityButton: jest.fn(() => ({
    accessibilityLabel: 'mock-label',
    accessibilityHint: 'mock-hint',
    accessibilityRole: 'button',
  })),
}));

// Mock useHaptics
const mockMediumImpact = jest.fn();
const mockErrorNotification = jest.fn();
const mockWarningNotification = jest.fn();
jest.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    lightImpact: jest.fn(),
    mediumImpact: mockMediumImpact,
    heavyImpact: jest.fn(),
    successNotification: jest.fn(),
    warningNotification: mockWarningNotification,
    errorNotification: mockErrorNotification,
  }),
}));

// Mock useAnimationFrameTimer to avoid real intervals
jest.mock('../../hooks/useAnimationFrameTimer', () => ({
  useAnimationFrameTimer: jest.fn(),
}));

describe('FocusGuideOverlay', () => {
  const mockOnSelect = jest.fn();
  const mockShowToast = jest.fn();

  const createMockCameraRef = (zoom: number = 1.0, supportFocusDepth: boolean = true) => ({
    current: supportFocusDepth
      ? {
          zoom,
          focusDepth: jest.fn(),
        }
      : {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when visible=false', () => {
    const cameraRef = createMockCameraRef();
    const { toJSON } = render(
      <FocusGuideOverlay
        visible={false}
        cameraRef={cameraRef}
        showToast={mockShowToast}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders zoom indicator and DOF warning when visible=true and zoom >= 2.0', () => {
    const cameraRef = createMockCameraRef(2.5);
    const { getByText } = render(
      <FocusGuideOverlay
        visible={true}
        cameraRef={cameraRef}
        showToast={mockShowToast}
      />
    );

    // Zoom indicator shows the zoom value
    expect(getByText('2.5x')).toBeTruthy();
    expect(getByText('变焦')).toBeTruthy();
    // DOF warning is shown
    expect(getByText('⚠️ DOF变浅')).toBeTruthy();
  });

  it('shows all three focus zone buttons (远景/标准/近拍)', () => {
    const cameraRef = createMockCameraRef(1.5);
    const { getByText } = render(
      <FocusGuideOverlay
        visible={true}
        cameraRef={cameraRef}
        showToast={mockShowToast}
      />
    );

    expect(getByText('远景')).toBeTruthy();
    expect(getByText('标准')).toBeTruthy();
    expect(getByText('近拍')).toBeTruthy();
  });

  it('does NOT show DOF warning when zoom < 2.0', () => {
    const cameraRef = createMockCameraRef(1.5);
    const { queryByText } = render(
      <FocusGuideOverlay
        visible={true}
        cameraRef={cameraRef}
        showToast={mockShowToast}
      />
    );

    expect(queryByText('⚠️ DOF变浅')).toBeNull();
  });

  it('handleFocusZonePress calls onSelect callback via camera focusDepth', () => {
    const cameraRef = createMockCameraRef(1.5);
    const { getByText } = render(
      <FocusGuideOverlay
        visible={true}
        cameraRef={cameraRef}
        showToast={mockShowToast}
      />
    );

    // Press the first focus zone button (远景)
    fireEvent.press(getByText('远景'));

    // Verify focusDepth was called with correct depth
    const cam = cameraRef.current as any;
    expect(cam.focusDepth).toHaveBeenCalledWith(FOCUS_ZONES[0].depth);
    // And haptics was triggered
    expect(mockMediumImpact).toHaveBeenCalled();
  });

  it('tap-to-focus creates a focus ring at tap location', () => {
    const cameraRef = createMockCameraRef(1.5);
    const { root } = render(
      <FocusGuideOverlay
        visible={true}
        cameraRef={cameraRef}
        showToast={mockShowToast}
      />
    );

    // Find the outer View (TouchableWithoutFeedback wraps the container)
    // The component structure is: TouchableWithoutFeedback > View (container)
    const outerView = root.findAllByType('View')[0];

    // Simulate tap with nativeEvent containing location
    fireEvent(outerView, 'press', {
      nativeEvent: {
        locationX: 150,
        locationY: 200,
      },
    });

    // After tap, a focus ring View should be present
    // FocusRing renders at (x-30, y-30) = (120, 170) with width/height 60
    // Look for a View with the focusRing style (position: absolute, width: 60, height: 60)
    const allViews = root.findAllByType('View', { deep: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ringViews = allViews.filter((view: any) => {
      const props = view.props;
      const style = Array.isArray(props?.style) ? props.style : [props?.style].filter(Boolean);
      const hasPositionAbsolute = style.some((s: any) => s?.position === 'absolute');
      const hasWidth60 = style.some((s: any) => s?.width === 60);
      return hasPositionAbsolute && hasWidth60;
    });
    expect(ringViews.length).toBeGreaterThan(0);
  });

  it('shows toast when camera does not support focusDepth', () => {
    const cameraRef = createMockCameraRef(1.5, false);
    const { getByText } = render(
      <FocusGuideOverlay
        visible={true}
        cameraRef={cameraRef}
        showToast={mockShowToast}
      />
    );

    fireEvent.press(getByText('远景'));

    expect(mockShowToast).toHaveBeenCalledWith('当前设备不支持手动对焦');
    expect(mockWarningNotification).toHaveBeenCalled();
  });

  it('renders zoom indicator with correct value at zoom=2.0', () => {
    const cameraRef = createMockCameraRef(2.0);
    const { getByText } = render(
      <FocusGuideOverlay
        visible={true}
        cameraRef={cameraRef}
        showToast={mockShowToast}
      />
    );

    expect(getByText('2.0x')).toBeTruthy();
  });
});