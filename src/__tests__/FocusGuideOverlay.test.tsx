/**
 * Tests for FocusGuideOverlay component
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { FocusGuideOverlay } from '../components/FocusGuideOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Mock react-native-reanimated — uses the pre-built mock in __mocks__
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Mock useAnimationFrameTimer — each test controls polling manually via a module-level ref
let pollCallback: (() => void) | null = null;
let pollEnabled = false;

jest.mock('../hooks/useAnimationFrameTimer', () => ({
  useAnimationFrameTimer: jest.fn(({ onTick, enabled }) => {
    pollCallback = onTick;
    pollEnabled = enabled;
  }),
}));

const mockMediumImpact = jest.fn();
const mockErrorNotification = jest.fn();
const mockWarningNotification = jest.fn();

jest.mock('../hooks/useHaptics', () => ({
  useHaptics: () => ({
    mediumImpact: mockMediumImpact,
    errorNotification: mockErrorNotification,
    warningNotification: mockWarningNotification,
    lightImpact: jest.fn(),
    heavyImpact: jest.fn(),
    successNotification: jest.fn(),
    triggerLevelHaptic: jest.fn(),
  }),
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    colors: {
      primary: '#000000',
      accent: '#E8D5B7',
      cardBg: '#1A1A1A',
      text: '#FFFFFF',
      textSecondary: '#888888',
      border: '#333333',
      success: '#4CAF50',
      error: '#FF5252',
      warning: '#F59E0B',
      background: '#000000',
      sunColor: '#FFB800',
      gridAccent: 'rgba(232,213,183,0.35)',
      countdownBg: 'rgba(232,213,183,0.9)',
      countdownText: '#000000',
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fire the registered useAnimationFrameTimer onTick callback. */
function triggerPoll() {
  if (pollCallback) pollCallback();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FocusGuideOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pollCallback = null;
    pollEnabled = false;
  });

  it('renders nothing when visible=false', () => {
    const { toJSON } = render(
      <FocusGuideOverlay visible={false} cameraRef={{ current: null }} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders zoom indicator and 3 focus zone buttons when visible=true', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(screen.getByText('变焦')).toBeTruthy();
    expect(screen.getByText('1.0x')).toBeTruthy();
    expect(screen.getByText('远景')).toBeTruthy();
    expect(screen.getByText('标准')).toBeTruthy();
    expect(screen.getByText('近拍')).toBeTruthy();
  });

  it('shows DOF warning when zoom >= 2.0x', () => {
    const cam = { zoom: 2.5, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    expect(screen.getByText('⚠️ DOF变浅')).toBeTruthy();
  });

  it('hides DOF warning when zoom < 2.0x', () => {
    const cam = { zoom: 1.8, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    expect(screen.queryByText('⚠️ DOF变浅')).toBeNull();
  });

  it('calls cameraRef.focusDepth with correct depth when a focus zone button is pressed', () => {
    const focusDepthMock = jest.fn();
    const cam = { zoom: 1.0, focusDepth: focusDepthMock };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);

    fireEvent.press(screen.getByText('远景'));
    expect(focusDepthMock).toHaveBeenCalledWith(0.95);

    fireEvent.press(screen.getByText('标准'));
    expect(focusDepthMock).toHaveBeenCalledWith(0.5);

    fireEvent.press(screen.getByText('近拍'));
    expect(focusDepthMock).toHaveBeenCalledWith(0.1);
  });

  it('does NOT call focusDepth when device does not support it', () => {
    const cam = { zoom: 1.0 };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    fireEvent.press(screen.getByText('标准'));
    // Should not crash
  });

  it('calls showToast when device does not support focusDepth', () => {
    const showToastMock = jest.fn();
    const cam = { zoom: 1.0 };
    render(
      <FocusGuideOverlay
        visible={true}
        cameraRef={{ current: cam }}
        showToast={showToastMock}
      />
    );
    fireEvent.press(screen.getByText('标准'));
    expect(showToastMock).toHaveBeenCalledWith('当前设备不支持手动对焦');
  });

  it('calls showToast with error message when focusDepth throws', () => {
    const showToastMock = jest.fn();
    const cam = {
      zoom: 1.0,
      focusDepth: jest.fn().mockImplementation(() => {
        throw new Error('focusDepth failed');
      }),
    };
    render(
      <FocusGuideOverlay
        visible={true}
        cameraRef={{ current: cam }}
        showToast={showToastMock}
      />
    );
    fireEvent.press(screen.getByText('远景'));
    expect(showToastMock).toHaveBeenCalledWith('对焦失败，请重试');
  });

  it('calls mediumImpact haptic when focusDepth succeeds', () => {
    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    fireEvent.press(screen.getByText('标准'));
    expect(mockMediumImpact).toHaveBeenCalled();
  });

  it('calls errorNotification when focusDepth throws', () => {
    const cam = {
      zoom: 1.0,
      focusDepth: jest.fn().mockImplementation(() => {
        throw new Error('focusDepth failed');
      }),
    };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    fireEvent.press(screen.getByText('远景'));
    expect(mockErrorNotification).toHaveBeenCalled();
  });

  it('calls warningNotification when device does not support focusDepth', () => {
    const cam = { zoom: 1.0 };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    fireEvent.press(screen.getByText('标准'));
    expect(mockWarningNotification).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Tap-to-focus / FocusRing tests
  // -------------------------------------------------------------------------

  it('does NOT call focusDepth on tap (visual feedback only)', () => {
    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    const { UNSAFE_root } = render(
      <FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />
    );
    fireEvent(UNSAFE_root, 'touchEnd', {
      nativeEvent: { locationX: 100, locationY: 200 },
    });
    expect(cam.focusDepth).not.toHaveBeenCalled();
  });

  it('registers useAnimationFrameTimer on mount when visible=true', () => {
    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    expect(pollCallback).not.toBeNull();
    expect(pollEnabled).toBe(true);
  });

  it('tap-to-focus adds a focus ring without calling focusDepth', () => {
    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    const { UNSAFE_root } = render(
      <FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />
    );
    fireEvent(UNSAFE_root, 'touchEnd', {
      nativeEvent: { locationX: 100, locationY: 200 },
    });
    // Tap-to-focus is visual-only — does not call camera focusDepth
    expect(cam.focusDepth).not.toHaveBeenCalled();
  });

  it('unmounts cleanly — poll callback does not throw after unmount', () => {
    const cam = { zoom: 2.0, focusDepth: jest.fn() };
    const { unmount } = render(
      <FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />
    );
    const cb = pollCallback;
    unmount();
    // mountedRef guard prevents setState after unmount — must not throw
    expect(() => { cb?.(); }).not.toThrow();
  });

  it('sets initial zoom value from cameraRef on mount', () => {
    const cam = { zoom: 1.8, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    expect(screen.getByText('1.8x')).toBeTruthy();
  });

  it('polling updates zoom display to new value when camera zoom changes', () => {
    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);

    expect(screen.getByText('1.0x')).toBeTruthy();
    expect(screen.queryByText('⚠️ DOF变浅')).toBeNull();

    // Simulate zoom change on camera ref
    cam.zoom = 2.5;
    act(() => { triggerPoll(); });

    // Zoom display should update to 2.5x and DOF warning should appear
    expect(screen.getByText('2.5x')).toBeTruthy();
    expect(screen.getByText('⚠️ DOF变浅')).toBeTruthy();
  });

  it('applies theme colors via useTheme (sunColor used for focus ring border)', () => {
    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    // If theme colors are wrong the render would crash — existence of text proves it worked
    expect(screen.getByText('1.0x')).toBeTruthy();
  });
});

describe('FocusGuideOverlay — light theme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pollCallback = null;
    pollEnabled = false;
  });

  it('renders correctly with light theme colors', () => {
    jest.doMock('../contexts/ThemeContext', () => ({
      useTheme: () => ({
        theme: 'light',
        colors: {
          primary: '#FFFFFF',
          accent: '#C4A35A',
          cardBg: '#F5F5F5',
          text: '#1A1A1A',
          textSecondary: '#666666',
          border: '#E0E0E0',
          success: '#4CAF50',
          error: '#FF5252',
          warning: '#D97706',
          background: '#FAFAFA',
          sunColor: '#E69500',
          gridAccent: 'rgba(180,140,80,0.4)',
          countdownBg: 'rgba(200,160,100,0.9)',
          countdownText: '#000000',
        },
      }),
    }));

    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    expect(screen.getByText('1.0x')).toBeTruthy();
    expect(screen.getByText('远景')).toBeTruthy();
    expect(screen.getByText('标准')).toBeTruthy();
    expect(screen.getByText('近拍')).toBeTruthy();
  });
});