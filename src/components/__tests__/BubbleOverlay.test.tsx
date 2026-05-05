/**
 * Unit tests for src/components/BubbleOverlay.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { BubbleOverlay } from '../BubbleOverlay';
import type { BubbleItem } from '../../types';

// Mock reanimated + worklets (same pattern as existing tests in this project)
jest.mock('react-native-reanimated', () => {
  const mockView = (props: React.PropsWithChildren) => props.children;
  const mockText = (props: React.PropsWithChildren) => props.children;
  return {
    __esModule: true,
    default: { View: mockView, Text: mockText },
    useSharedValue: jest.fn((initial: unknown) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value: unknown) => value),
    Easing: { out: jest.fn(), ease: jest.fn() },
  };
});
jest.mock('react-native-worklets');

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark' as const,
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
      bubbleBg: 'rgba(0,0,0,0.4)',
      bubbleText: '#FFFFFF',
      countdownBg: 'rgba(232,213,183,0.9)',
      countdownBorder: 'rgba(255,255,255,0.4)',
      countdownText: '#000000',
      scoreS: '#FFD700',
      scoreA: '#C0C0C0',
      scoreB: '#CD7F32',
      scoreC: '#8B7355',
      scoreD: '#555555',
      scoreOverlayBg: 'rgba(0,0,0,0.65)',
      scoreHintText: 'rgba(255,255,255,0.4)',
      scoreCardBg: 'rgba(28,28,28,0.95)',
      scoreCardBorder: 'rgba(255,255,255,0.1)',
      scoreLabelText: 'rgba(255,255,255,0.6)',
      scoreBarBg: 'rgba(255,255,255,0.1)',
      modeSelectorBg: 'rgba(0,0,0,0.4)',
      modeSelectorUnselected: 'rgba(255,255,255,0.7)',
      overlayBg: 'rgba(0,0,0,0.55)',
      topBarBg: 'rgba(0,0,0,0.55)',
      topBarText: '#FFFFFF',
      topBarTextSecondary: 'rgba(255,255,255,0.6)',
      topBarBorderInactive: 'rgba(255,255,255,0.15)',
      topBarBorderActive: 'rgba(255,255,255,0.3)',
      topBarSelectorBgActive: 'rgba(232,213,183,0.35)',
      topBarSelectorBorderActive: 'rgba(232,213,183,0.6)',
      timerActiveBg: 'rgba(255,82,82,0.6)',
      timerActiveBorder: 'rgba(255,255,255,0.3)',
      timerPreviewBg: 'rgba(0,0,0,0.5)',
      timerBorder: 'rgba(255,255,255,0.25)',
      timerUnitText: 'rgba(255,255,255,0.5)',
      challengeActiveBg: 'rgba(255,215,0,0.15)',
      challengeActiveBorder: 'rgba(255,215,0,0.6)',
      challengeActiveText: '#FFD700',
      rawActiveBg: 'rgba(0,200,100,0.2)',
      rawActiveBorder: 'rgba(0,200,100,0.6)',
      rawActiveText: '#00C864',
      focusGuideActiveBg: 'rgba(255,220,0,0.15)',
      focusGuideActiveBorder: 'rgba(255,220,0,0.5)',
      focusGuideActiveText: '#FFDC00',
      voiceActiveBg: 'rgba(232,213,183,0.2)',
      burstIndicatorBg: 'rgba(255,215,0,0.85)',
      burstIndicatorText: '#000000',
      burstSuggestionBg: 'rgba(20,16,8,0.92)',
      burstSuggestionBorder: 'rgba(255,215,0,0.35)',
      histogramBg: 'rgba(0,0,0,0.65)',
      histogramBorder: 'rgba(255,255,255,0.12)',
      sunPanelBg: '#1A1A1A',
      sunPanelBorder: 'rgba(255,255,255,0.1)',
      sunCompassBg: 'rgba(0,0,0,0.3)',
      sunCompassText: 'rgba(255,255,255,0.5)',
      sunCompassCenter: 'rgba(255,255,255,0.3)',
      sunToggleActiveBg: 'rgba(255,184,0,0.15)',
      sunToggleActiveBorder: 'rgba(255,184,0,0.5)',
      toastBg: 'rgba(255,107,138,0.9)',
      favoriteIcon: '#FF6B8A',
      shareButtonBg: 'rgba(0,0,0,0.55)',
      shareButtonBorder: 'rgba(255,255,255,0.15)',
      shareButtonDisabledText: 'rgba(255,255,255,0.3)',
      drawerBg: '#1A1A1A',
      drawerHandle: '#666666',
      drawerTextSecondary: '#999999',
      gridCardDisabledText: '#AAAAAA',
      sparkleColors: ['#FFD700', '#C0C0C0', '#FF69B4', '#87CEEB', '#98FB98'],
      starGreen: '#8BC34A',
      starYellow: '#FFC107',
      starOrange: '#FF9800',
    },
    toggleTheme: jest.fn(),
    setTheme: jest.fn(),
  })),
}));

// Mock useAccessibility hook
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityButton: jest.fn(() => ({})),
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: false })),
}));

function makeBubble(overrides: Partial<BubbleItem> = {}): BubbleItem {
  return {
    id: 1,
    text: '构图建议：尝试三分法',
    position: 'top-left',
    ...overrides,
  };
}

describe('BubbleOverlay', () => {
  const mockOnDismiss = jest.fn();
  const mockOnDismissAll = jest.fn();
  const mockOnBubbleAppear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when hidden=true', () => {
    const { queryByText } = render(
      <BubbleOverlay
        visibleItems={[makeBubble()]}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
        hidden={true}
      />
    );
    expect(queryByText('构图建议：尝试三分法')).toBeNull();
  });

  it('renders nothing when no items and not loading', () => {
    const { queryByText } = render(
      <BubbleOverlay
        visibleItems={[]}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(queryByText('分析中...')).toBeNull();
  });

  it('renders loading text when loading=true', () => {
    const { getByText } = render(
      <BubbleOverlay
        visibleItems={[]}
        loading={true}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(getByText('分析中...')).toBeTruthy();
  });

  it('renders single bubble item', () => {
    const bubble = makeBubble({ id: 5, text: '试试把主体放在右上角' });
    const { getByText } = render(
      <BubbleOverlay
        visibleItems={[bubble]}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(getByText('试试把主体放在右上角')).toBeTruthy();
  });

  it('renders multiple bubble items', () => {
    const bubbles = [
      makeBubble({ id: 1, text: '第一条建议' }),
      makeBubble({ id: 2, text: '第二条建议' }),
      makeBubble({ id: 3, text: '第三条建议' }),
    ];
    const { getByText } = render(
      <BubbleOverlay
        visibleItems={bubbles}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(getByText('第一条建议')).toBeTruthy();
    expect(getByText('第二条建议')).toBeTruthy();
    expect(getByText('第三条建议')).toBeTruthy();
  });

  it('shows dismiss-all button when multiple items and not loading', () => {
    const bubbles = [
      makeBubble({ id: 1, text: 'A' }),
      makeBubble({ id: 2, text: 'B' }),
    ];
    const { getByText } = render(
      <BubbleOverlay
        visibleItems={bubbles}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(getByText('清除全部')).toBeTruthy();
  });

  it('does not show dismiss-all button when single item', () => {
    const bubbles = [makeBubble({ id: 1, text: '唯一建议' })];
    const { queryByText } = render(
      <BubbleOverlay
        visibleItems={bubbles}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(queryByText('清除全部')).toBeNull();
  });

  it('does not show dismiss-all button when loading', () => {
    const bubbles = [makeBubble({ id: 1, text: 'A' }), makeBubble({ id: 2, text: 'B' })];
    const { queryByText } = render(
      <BubbleOverlay
        visibleItems={bubbles}
        loading={true}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(queryByText('清除全部')).toBeNull();
  });

  it('calls onDismiss when individual bubble dismiss is pressed', () => {
    const bubble = makeBubble({ id: 7, text: '可关闭的建议' });
    const { UNSAFE_getAllByType } = render(
      <BubbleOverlay
        visibleItems={[bubble]}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    const closeButtons = UNSAFE_getAllByType(TouchableOpacity);
    // The last TouchableOpacity rendered is the close (X) button inside the bubble
    fireEvent.press(closeButtons[closeButtons.length - 1]);
    expect(mockOnDismiss).toHaveBeenCalledWith(7);
  });

  it('calls onDismissAll when dismiss-all button is pressed', () => {
    const bubbles = [
      makeBubble({ id: 1, text: 'A' }),
      makeBubble({ id: 2, text: 'B' }),
    ];
    const { getByText } = render(
      <BubbleOverlay
        visibleItems={bubbles}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    fireEvent.press(getByText('清除全部'));
    expect(mockOnDismissAll).toHaveBeenCalledTimes(1);
  });

  it('renders bubble with top-left position', () => {
    const bubble = makeBubble({ position: 'top-left', text: '左上位置' });
    const { getByText } = render(
      <BubbleOverlay
        visibleItems={[bubble]}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(getByText('左上位置')).toBeTruthy();
  });

  it('renders bubble with bottom-right position', () => {
    const bubble = makeBubble({ position: 'bottom-right', text: '右下位置' });
    const { getByText } = render(
      <BubbleOverlay
        visibleItems={[bubble]}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(getByText('右下位置')).toBeTruthy();
  });

  it('renders bubble with center position', () => {
    const bubble = makeBubble({ position: 'center', text: '居中位置' });
    const { getByText } = render(
      <BubbleOverlay
        visibleItems={[bubble]}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(getByText('居中位置')).toBeTruthy();
  });

  it('calls onBubbleAppear when bubble appears', () => {
    const bubble = makeBubble({ id: 9, text: '出现时通知' });
    render(
      <BubbleOverlay
        visibleItems={[bubble]}
        loading={false}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
        onBubbleAppear={mockOnBubbleAppear}
      />
    );
    expect(mockOnBubbleAppear).toHaveBeenCalledWith('出现时通知');
  });

  it('renders both loading and items when loading=true with visibleItems', () => {
    const bubble = makeBubble({ id: 1, text: '同时加载中的建议' });
    const { getByText } = render(
      <BubbleOverlay
        visibleItems={[bubble]}
        loading={true}
        onDismiss={mockOnDismiss}
        onDismissAll={mockOnDismissAll}
      />
    );
    expect(getByText('分析中...')).toBeTruthy();
    expect(getByText('同时加载中的建议')).toBeTruthy();
  });
});
