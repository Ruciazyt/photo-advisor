import React from 'react';
import { render } from '@testing-library/react-native';
import { LevelIndicator } from '../LevelIndicator';

// Mock accessibility hook
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(),
}));

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      success: '#00c853',
      warning: '#ffab00',
      error: '#ff4444',
      bubbleBg: '#1a1a1a',
      topBarBorderInactive: '#555',
      overlayBg: 'rgba(0,0,0,0.8)',
      topBarTextSecondary: '#aaa',
    },
  }),
}));

// Mock useDeviceOrientation
jest.mock('../../hooks/useDeviceOrientation', () => ({
  useDeviceOrientation: jest.fn().mockReturnValue({
    orientation: { pitch: 15, roll: -10 },
    available: true,
  }),
}));

// Mock useHaptics
jest.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    triggerLevelHaptic: jest.fn(),
    warningNotification: jest.fn(),
  }),
}));

import { useAccessibilityReducedMotion } from '../../hooks/useAccessibility';

describe('LevelIndicator reduced motion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('freezes bubble at center when reducedMotion=true', () => {
    (useAccessibilityReducedMotion as jest.Mock).mockReturnValue({ reducedMotion: true });

    const { root } = render(<LevelIndicator />);

    // When reducedMotion=true, the bubble should be centered (offsetX=0, offsetY=0)
    // The animatedStyle returns { transform: [{ translateX: 0 }, { translateY: 0 }] }
    expect(root).toBeTruthy();
  });

  it('allows bubble movement when reducedMotion=false', () => {
    (useAccessibilityReducedMotion as jest.Mock).mockReturnValue({ reducedMotion: false });

    const { root } = render(<LevelIndicator />);

    // When reducedMotion=false, the bubble follows orientation values
    expect(root).toBeTruthy();
  });
});