/**
 * Unit tests for BurstSuggestionOverlay component.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BurstSuggestionOverlay, detectBurstMoment } from '../BurstSuggestionOverlay';

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
      challengeActiveText: '#e8d5b7',
      burstSuggestionBg: '#1a1a1a',
      burstSuggestionBorder: '#3d3d3d',
      burstIndicatorText: '#000000',
      modeSelectorBg: '#2a2a2a',
    },
  }),
}));

// Mock useAccessibilityAnnouncement
const mockAnnounce = jest.fn();
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: jest.fn(() => ({ announce: mockAnnounce, isScreenReaderEnabled: false })),
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: false })),
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('BurstSuggestionOverlay', () => {
  const mockOnAccept = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('render conditions', () => {
    it('renders nothing when visible=false', () => {
      const { toJSON } = render(
        <BurstSuggestionOverlay
          visible={false}
          suggestion="测试建议"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders panel when visible=true', () => {
      const { toJSON } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="测试建议"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('shows "建议连拍" title with flash icon', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="测试建议"
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
          suggestion="检测到精彩画面，建议开启连拍捕捉更多瞬间！"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(getByText('检测到精彩画面，建议开启连拍捕捉更多瞬间！')).toBeTruthy();
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
  });

  describe('detectBurstMoment', () => {
    it('returns true when 2+ trigger keywords found in suggestions', () => {
      expect(detectBurstMoment(['完美构图', '黄金时机', '精彩瞬间'])).toBe(true);
      expect(detectBurstMoment(['推荐抓拍', '时机很好'])).toBe(true);
      expect(detectBurstMoment(['绝佳', '棒'])).toBe(true);
      // Same keyword counted once only
      expect(detectBurstMoment(['完美', '完美', '完美'])).toBe(false);
    });

    it('returns false when fewer than 2 trigger keywords', () => {
      expect(detectBurstMoment(['完美'])).toBe(false);
      expect(detectBurstMoment(['推荐'])).toBe(false);
      expect(detectBurstMoment(['不错'])).toBe(false);
      // Empty suggestion (no keywords)
      expect(detectBurstMoment([''])).toBe(false);
      expect(detectBurstMoment(['普通文字'])).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(detectBurstMoment([])).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('announces on mount when visible=true', () => {
      render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="检测到精彩画面"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(mockAnnounce).toHaveBeenCalledWith('建议连拍: 检测到精彩画面', 'polite');
    });

    it('announces only once for same suggestion', () => {
      const { rerender } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="检测到精彩画面"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      mockAnnounce.mockClear();
      rerender(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="检测到精彩画面"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(mockAnnounce).not.toHaveBeenCalled();
    });

    it('does not reset announcedRef when suggestion changes (ref persists across renders)', () => {
      // announcedRef.current is set to true on first announcement and never reset,
      // so on subsequent renders with different suggestion, announce is NOT called again.
      // This mirrors the actual component behavior: ref persists for the session lifetime.
      const { rerender } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="第一次建议"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(mockAnnounce).toHaveBeenCalledWith('建议连拍: 第一次建议', 'polite');
      mockAnnounce.mockClear();

      rerender(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="第二次建议"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      // announcedRef.current is still true — no re-announcement
      expect(mockAnnounce).not.toHaveBeenCalled();
    });

    it('does not announce when visible=false', () => {
      render(
        <BurstSuggestionOverlay
          visible={false}
          suggestion="测试建议"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(mockAnnounce).not.toHaveBeenCalled();
    });
  });

  describe('animation', () => {
    it('uses no-coverage animation for reducedMotion=true', () => {
      // Test that the component still renders correctly with reducedMotion
      jest.doMock('../../hooks/useAccessibility', () => ({
        useAccessibilityAnnouncement: jest.fn(() => ({ announce: mockAnnounce, isScreenReaderEnabled: false })),
        useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: true })),
      }));

      const { toJSON, rerender } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="测试建议"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      expect(toJSON()).not.toBeNull();

      // Reset mock to normal
      jest.doMock('../../hooks/useAccessibility', () => ({
        useAccessibilityAnnouncement: jest.fn(() => ({ announce: mockAnnounce, isScreenReaderEnabled: false })),
        useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: false })),
      }));
    });
  });

  describe('button interactions', () => {
    it('onAccept called when accept button pressed', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="测试建议"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      fireEvent.press(getByText('开始连拍'));
      expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });

    it('onDismiss called when dismiss button pressed', () => {
      const { getByText } = render(
        <BurstSuggestionOverlay
          visible={true}
          suggestion="测试建议"
          onAccept={mockOnAccept}
          onDismiss={mockOnDismiss}
        />
      );
      fireEvent.press(getByText('忽略'));
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('default suggestion text', () => {
    it('shows fallback text when suggestion is empty', () => {
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
});