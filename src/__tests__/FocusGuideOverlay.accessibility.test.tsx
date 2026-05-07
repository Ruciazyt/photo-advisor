/**
 * Accessibility tests for FocusGuideOverlay component.
 * Covers screen reader labels, accessibilityRole, accessibilityState,
 * accessibilityHint, and VoiceOver/TalkBack support for key interactions.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { FocusGuideOverlay } from '../components/FocusGuideOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Spy on useAccessibilityButton — track calls without changing behaviour
const mockA11yButton = jest.fn();
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityButton: (...args: unknown[]) => mockA11yButton(...args),
  useAccessibilityAnnouncement: () => ({
    announce: jest.fn(),
    isScreenReaderEnabled: true,
  }),
  useAccessibilityReducedMotion: () => ({ reducedMotion: false }),
}));

jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Control the poll callback from outside
let pollCallback: (() => void) | null = null;
let pollEnabled = false;
jest.mock('../hooks/useAnimationFrameTimer', () => ({
  useAnimationFrameTimer: jest.fn(({ onTick, enabled }: { onTick: () => void; enabled: boolean }) => {
    pollCallback = onTick;
    pollEnabled = enabled;
  }),
}));

jest.mock('../hooks/useHaptics', () => ({
  useHaptics: () => ({
    mediumImpact: jest.fn(),
    errorNotification: jest.fn(),
    warningNotification: jest.fn(),
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

function triggerPoll() {
  act(() => { pollCallback?.(); });
}

// ---------------------------------------------------------------------------
// Tests — screen reader labels & roles for focus zone buttons
// ---------------------------------------------------------------------------

describe('FocusGuideOverlay accessibility — focus zone button labels & roles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pollCallback = null;
    pollEnabled = false;
    // Return realistic a11y props from the spy
    mockA11yButton.mockImplementation(
      (opts: { label: string; hint?: string; role?: string; enabled?: boolean }) => ({
        accessibilityLabel: opts.label,
        accessibilityRole: opts.role ?? 'button',
        accessibilityState: { disabled: !(opts.enabled ?? true) },
        ...(opts.hint ? { accessibilityHint: opts.hint } : {}),
      })
    );
  });

  it('calls useAccessibilityButton with correct label for 远景', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(mockA11yButton).toHaveBeenNthCalledWith(1, {
      label: '对焦区域：远景',
      hint: '切换到远景对焦（无穷远），适合风景和建筑',
      role: 'button',
      enabled: true,
    });
  });

  it('calls useAccessibilityButton with correct label for 标准', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(mockA11yButton).toHaveBeenNthCalledWith(2, {
      label: '对焦区域：标准',
      hint: '切换到标准对焦（约3米），适合人文和抓拍',
      role: 'button',
      enabled: true,
    });
  });

  it('calls useAccessibilityButton with correct label for 近拍', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(mockA11yButton).toHaveBeenNthCalledWith(3, {
      label: '对焦区域：近拍',
      hint: '切换到近拍对焦（约0.5米），适合微距和特写',
      role: 'button',
      enabled: true,
    });
  });

  it('each focus zone button receives accessibilityRole="button"', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    // All 3 calls should have role: 'button'
    mockA11yButton.mock.calls.forEach(([opts]) => {
      expect(opts.role).toBe('button');
    });
  });

  it('each focus zone button receives accessibilityState with disabled=false', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    mockA11yButton.mock.calls.forEach(([opts]) => {
      expect(opts.enabled).toBe(true);
    });
  });

  it('all three zone buttons are rendered with useAccessibilityButton a11y props spread', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(screen.getByText('远景')).toBeTruthy();
    expect(screen.getByText('标准')).toBeTruthy();
    expect(screen.getByText('近拍')).toBeTruthy();
    expect(mockA11yButton).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// Tests — zoom indicator accessibility
// ---------------------------------------------------------------------------

describe('FocusGuideOverlay accessibility — zoom indicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pollCallback = null;
    pollEnabled = false;
    mockA11yButton.mockImplementation(
      (opts: { label: string; hint?: string; role?: string; enabled?: boolean }) => ({
        accessibilityLabel: opts.label,
        accessibilityRole: opts.role ?? 'button',
        accessibilityState: { disabled: !(opts.enabled ?? true) },
        ...(opts.hint ? { accessibilityHint: opts.hint } : {}),
      })
    );
  });

  it('zoom indicator shows correct initial zoom value', () => {
    const cam = { zoom: 1.8, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    expect(screen.getByText('1.8x')).toBeTruthy();
  });

  it('zoom indicator text is readable by screen readers via existing label', () => {
    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    // The zoom label "变焦" and value "1.0x" are rendered as Text nodes;
    // the parent View serves as the accessible container.
    expect(screen.getByText('变焦')).toBeTruthy();
    expect(screen.getByText('1.0x')).toBeTruthy();
  });

  it('polling updates zoom display — screen reader can detect changed value', () => {
    const cam = { zoom: 1.0, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);

    expect(screen.getByText('1.0x')).toBeTruthy();

    cam.zoom = 2.5;
    triggerPoll();

    expect(screen.getByText('2.5x')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tests — DOF warning accessibility
// ---------------------------------------------------------------------------

describe('FocusGuideOverlay accessibility — DOF warning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pollCallback = null;
    pollEnabled = false;
    mockA11yButton.mockImplementation(
      (opts: { label: string; hint?: string; role?: string; enabled?: boolean }) => ({
        accessibilityLabel: opts.label,
        accessibilityRole: opts.role ?? 'button',
        accessibilityState: { disabled: !(opts.enabled ?? true) },
        ...(opts.hint ? { accessibilityHint: opts.hint } : {}),
      })
    );
  });

  it('DOF warning is shown when zoom >= 2.0x', () => {
    const cam = { zoom: 2.5, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    expect(screen.getByText('⚠️ DOF变浅')).toBeTruthy();
  });

  it('DOF warning text contains alert information for screen readers', () => {
    const cam = { zoom: 2.5, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    // The warning text is descriptive and self-contained for VoiceOver/TalkBack
    expect(screen.getByText('⚠️ DOF变浅')).toBeTruthy();
  });

  it('DOF warning is hidden when zoom < 2.0x', () => {
    const cam = { zoom: 1.8, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);
    expect(screen.queryByText('⚠️ DOF变浅')).toBeNull();
  });

  it('DOF warning appears dynamically when zoom crosses 2.0x threshold', () => {
    const cam = { zoom: 1.5, focusDepth: jest.fn() };
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />);

    expect(screen.queryByText('⚠️ DOF变浅')).toBeNull();

    cam.zoom = 2.1;
    triggerPoll();

    expect(screen.getByText('⚠️ DOF变浅')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tests — tap-to-focus accessibility (visual feedback layer)
// ---------------------------------------------------------------------------

describe('FocusGuideOverlay accessibility — tap-to-focus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pollCallback = null;
    pollEnabled = false;
    mockA11yButton.mockImplementation(
      (opts: { label: string; hint?: string; role?: string; enabled?: boolean }) => ({
        accessibilityLabel: opts.label,
        accessibilityRole: opts.role ?? 'button',
        accessibilityState: { disabled: !(opts.enabled ?? true) },
        ...(opts.hint ? { accessibilityHint: opts.hint } : {}),
      })
    );
  });

  it('tap-to-focus adds a focus ring without calling camera focusDepth', () => {
    const focusDepthMock = jest.fn();
    const cam = { zoom: 1.0, focusDepth: focusDepthMock };
    const { UNSAFE_root } = render(
      <FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />
    );

    fireEvent(UNSAFE_root, 'touchEnd', {
      nativeEvent: { locationX: 150, locationY: 200 },
    });

    // Tap-to-focus is visual-only; it should NOT trigger hardware focus
    expect(focusDepthMock).not.toHaveBeenCalled();
  });

  it('focus zone buttons remain interactive after tap-to-focus interactions', () => {
    const focusDepthMock = jest.fn();
    const cam = { zoom: 1.0, focusDepth: focusDepthMock };
    const { UNSAFE_root } = render(
      <FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />
    );

    // Perform tap
    fireEvent(UNSAFE_root, 'touchEnd', {
      nativeEvent: { locationX: 150, locationY: 200 },
    });

    // Buttons should still work
    fireEvent.press(screen.getByText('远景'));
    expect(focusDepthMock).toHaveBeenCalledWith(0.95);
  });
});

// ---------------------------------------------------------------------------
// Tests — visible=false renders nothing (no a11y tree noise)
// ---------------------------------------------------------------------------

describe('FocusGuideOverlay accessibility — conditional rendering', () => {
  it('renders nothing when visible=false — no accessibility tree emitted', () => {
    const { toJSON } = render(
      <FocusGuideOverlay visible={false} cameraRef={{ current: null }} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders full overlay when visible=true', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(screen.getByText('变焦')).toBeTruthy();
    expect(screen.getByText('远景')).toBeTruthy();
    expect(screen.getByText('标准')).toBeTruthy();
    expect(screen.getByText('近拍')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tests — keyboard / accessibility navigation order hints
// ---------------------------------------------------------------------------

describe('FocusGuideOverlay accessibility — navigation order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pollCallback = null;
    pollEnabled = false;
    mockA11yButton.mockImplementation(
      (opts: { label: string; hint?: string; role?: string; enabled?: boolean }) => ({
        accessibilityLabel: opts.label,
        accessibilityRole: opts.role ?? 'button',
        accessibilityState: { disabled: !(opts.enabled ?? true) },
        ...(opts.hint ? { accessibilityHint: opts.hint } : {}),
      })
    );
  });

  it('useAnimationFrameTimer is enabled only when overlay is visible', () => {
    render(<FocusGuideOverlay visible={true} cameraRef={{ current: null }} />);
    expect(pollEnabled).toBe(true);

    const { rerender } = render(
      <FocusGuideOverlay visible={false} cameraRef={{ current: null }} />
    );
    // Module-level pollEnabled from the new render call
    expect(pollEnabled).toBe(false);
  });

  it('useAnimationFrameTimer does not poll after unmount (mountedRef guard)', () => {
    const cam = { zoom: 2.0, focusDepth: jest.fn() };
    const { unmount } = render(
      <FocusGuideOverlay visible={true} cameraRef={{ current: cam }} />
    );
    const cb = pollCallback;
    unmount();
    // Must not throw — mountedRef guard prevents setState after unmount
    expect(() => { cb?.(); }).not.toThrow();
  });
});
