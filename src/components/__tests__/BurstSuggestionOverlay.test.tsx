/**
 * Unit tests for src/components/BurstSuggestionOverlay.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BurstSuggestionOverlay, detectBurstMoment } from '../BurstSuggestionOverlay';

const mockAnnounce = jest.fn();
const mockMediumImpact = jest.fn();
const mockSuccessNotification = jest.fn();

jest.mock('react-native-reanimated', () => {
  const mockView = (props: React.PropsWithChildren) => props.children;
  const mockText = (props: React.PropsWithChildren) => props.children;
  return {
    __esModule: true,
    default: { View: mockView, Text: mockText },
    useSharedValue: jest.fn((initial: unknown) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn((value: unknown) => value),
    withTiming: jest.fn((value: unknown) => value),
    cancelAnimation: jest.fn(),
    Easing: { out: jest.fn(), ease: jest.fn() },
  };
});
jest.mock('react-native-worklets');

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      burstSuggestionBg: 'rgba(20,20,20,0.95)',
      burstSuggestionBorder: '#e8d5b7',
      challengeActiveText: '#ffd700',
      text: '#ffffff',
      textSecondary: '#888888',
      modeSelectorBg: '#2a2a2a',
      burstIndicatorText: '#000000',
    },
  }),
}));

jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: () => ({ announce: mockAnnounce }),
  useAccessibilityReducedMotion: () => ({ reducedMotion: false }),
}));

jest.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    lightImpact: jest.fn(),
    mediumImpact: mockMediumImpact,
    heavyImpact: jest.fn(),
    successNotification: mockSuccessNotification,
    warningNotification: jest.fn(),
    errorNotification: jest.fn(),
  }),
}));

describe('BurstSuggestionOverlay', () => {
  const mockOnAccept = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectBurstMoment', () => {
    it('returns false for empty array', () => {
      expect(detectBurstMoment([])).toBe(false);
    });

    it('returns false when fewer than 2 trigger keywords found', () => {
      expect(detectBurstMoment(['这是一张普通照片'])).toBe(false);
      expect(detectBurstMoment(['还不错', '建议连拍'])).toBe(false);
    });

    it('returns true when 2 or more trigger keywords found', () => {
      expect(detectBurstMoment(['完美光线', '绝佳构图'])).toBe(true);
    });

    it('returns true when multiple keywords in single string', () => {
      expect(detectBurstMoment(['完美光线和绝佳构图时机'])).toBe(true);
    });

    it('returns true with 3 different trigger keywords', () => {
      expect(detectBurstMoment(['黄金时刻', '优秀', '推荐'])).toBe(true);
    });

    it('returns false when only 1 trigger keyword found', () => {
      // '完美光线' contains '完' (from '完美') AND '美' → 2 matches, so returns true
      // Use string with only 1 keyword that doesn't compound
      expect(detectBurstMoment(['这是一张普通照片'])).toBe(false);
      expect(detectBurstMoment(['风景不错'])).toBe(false);
    });

    it('returns true for high trigger count', () => {
      expect(detectBurstMoment(['完美', '精彩', '理想', '绝佳', '优秀'])).toBe(true);
    });
  });

  describe('render', () => {
    it('renders nothing when visible=false', () => {
      const { toJSON } = render(
        <BurstSuggestionOverlay
          visible={false}
          suggestion="完美光线"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders panel when visible=true', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="完美光线"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(getByText('建议连拍')).toBeTruthy();
      expect(getByText('完美光线')).toBeTruthy();
    });

    it('shows flash icon and title', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="检测到精彩画面"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(getByText('建议连拍')).toBeTruthy();
    });

    it('displays suggestion message text', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="黄金光线时刻"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(getByText('黄金光线时刻')).toBeTruthy();
    });

    it('shows dismiss and accept buttons', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="测试建议"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(getByText('忽略')).toBeTruthy();
      expect(getByText('开始连拍')).toBeTruthy();
    });

    it('uses default message when suggestion is empty', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion=""
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(getByText('检测到精彩画面，建议开启连拍捕捉更多瞬间！')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('announces on mount when visible becomes true', () => {
      render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="完美光线"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(mockAnnounce).toHaveBeenCalledWith('建议连拍: 完美光线', 'polite');
    });

    it('announces when visible becomes true again after being false', () => {
      // announcedRef resets when visible transitions from false→true
      const { rerender } = render(
        <BurstSuggestionOverlay
          visible={false}
          suggestion="完美光线"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(mockAnnounce).not.toHaveBeenCalled();

      rerender(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="完美光线"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(mockAnnounce).toHaveBeenCalledTimes(1);
    });

    it('does not announce when visible=false', () => {
      render(
        <BurstSuggestionOverlay
          visible={false}
          suggestion="完美光线"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(mockAnnounce).not.toHaveBeenCalled();
    });
  });

  describe('interactions', () => {
    it('calls onAccept when accept button is pressed', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="完美光线"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      fireEvent.press(getByText('开始连拍'));
      expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="完美光线"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      fireEvent.press(getByText('忽略'));
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('animation', () => {
    it('calls withSpring and withTiming on mount (reducedMotion=false)', () => {
      const { rerender } = render(
        <BurstSuggestionOverlay
          visible={false}
          suggestion=""
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      const reanimated = require('react-native-reanimated');
      reanimated.withSpring.mockClear();
      reanimated.withTiming.mockClear();

      rerender(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="测试"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(reanimated.withSpring).toHaveBeenCalled();
      expect(reanimated.withTiming).toHaveBeenCalled();
    });
  });
});