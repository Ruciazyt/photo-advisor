/**
 * Tests for src/components/ShareCard.tsx
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ShareCard } from '../components/ShareCard';

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      accent: '#E8D5B7',
      primary: '#000',
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
      bubbleBg: 'rgba(0,0,0,0.4)',
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
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

describe('ShareCard', () => {
  const defaultProps = {
    photoUri: 'file:///test/photo.jpg',
    suggestions: ['[左上] 将主体放在左侧三分线附近', '[右下] 留出空间平衡画面'],
    gridType: '三分法',
    score: 85,
    gridVariant: 'thirds',
  };

  it('displays scoreReason text beside the score number', () => {
    const { getByText } = render(
      <ShareCard {...defaultProps} score={75} scoreReason="主体偏左，建议右移" />
    );
    expect(getByText('主体偏左，建议右移')).toBeTruthy();
  });

  it('does not render scoreReason when score is undefined', () => {
    const { queryByText } = render(
      <ShareCard {...defaultProps} score={undefined} scoreReason="some reason" />
    );
    expect(queryByText('some reason')).toBeNull();
  });

  it('renders without crashing', () => {
    const { UNSAFE_getByType } = render(<ShareCard {...defaultProps} />);
    expect(UNSAFE_getByType(ShareCard)).toBeTruthy();
  });

  it('displays the grid label for thirds variant', () => {
    render(<ShareCard {...defaultProps} gridVariant="thirds" />);
    // gridLabel '三分法' and gridTypeTag '三分法' both rendered → getAllByText
    expect(screen.getAllByText('三分法').length).toBeGreaterThan(0);
  });

  it('displays the grid label for golden ratio variant', () => {
    render(<ShareCard {...defaultProps} gridVariant="golden" gridType="黄金分割" />);
    expect(screen.getAllByText('黄金分割').length).toBeGreaterThan(0);
  });

  it('displays diagonal grid label', () => {
    render(<ShareCard {...defaultProps} gridVariant="diagonal" gridType="对角线构图" />);
    expect(screen.getAllByText('对角线构图').length).toBeGreaterThan(0);
  });

  it('displays spiral grid label', () => {
    render(<ShareCard {...defaultProps} gridVariant="spiral" gridType="螺旋构图" />);
    expect(screen.getAllByText('螺旋构图').length).toBeGreaterThan(0);
  });

  it('displays the score as stars and number', () => {
    render(<ShareCard {...defaultProps} score={85} />);
    expect(screen.getByText('★★★★☆')).toBeTruthy();
    expect(screen.getByText('(85分)')).toBeTruthy();
  });

  it('displays 5 stars for score >= 90', () => {
    render(<ShareCard {...defaultProps} score={92} />);
    expect(screen.getByText('★★★★★')).toBeTruthy();
  });

  it('displays 1 star for low score', () => {
    render(<ShareCard {...defaultProps} score={35} />);
    expect(screen.getByText('★☆☆☆☆')).toBeTruthy();
  });

  it('does not show score row when score is undefined', () => {
    const { queryByText } = render(<ShareCard {...defaultProps} score={undefined} />);
    expect(queryByText('★')).toBeNull();
  });

  it('displays AI suggestions header', () => {
    render(<ShareCard {...defaultProps} />);
    expect(screen.getByText('💡 AI 建议')).toBeTruthy();
  });

  it('displays suggestion text without region tags', () => {
    render(<ShareCard {...defaultProps} />);
    expect(screen.getByText('• 将主体放在左侧三分线附近')).toBeTruthy();
    expect(screen.getByText('• 留出空间平衡画面')).toBeTruthy();
  });

  it('displays footer text', () => {
    render(<ShareCard {...defaultProps} />);
    expect(screen.getByText('📸 由拍摄参谋生成')).toBeTruthy();
  });

  it('handles empty suggestions', () => {
    const { queryByText } = render(
      <ShareCard {...defaultProps} suggestions={[]} />
    );
    expect(queryByText('💡 AI 建议')).toBeNull();
  });

  it('uses default grid label for unknown variant', () => {
    render(<ShareCard {...defaultProps} gridVariant="unknown" gridType="自定义" />);
    expect(screen.getByText('自定义')).toBeTruthy();
  });

  it('renders with light theme', () => {
    const { useTheme } = require('../contexts/ThemeContext');
    useTheme.mockReturnValueOnce({
      theme: 'light',
      colors: {
        accent: '#C4A35A',
        primary: '#FFFFFF',
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
        countdownBorder: 'rgba(0,0,0,0.2)',
        countdownText: '#000000',
        scoreS: '#E5A500',
        scoreA: '#9E9E9E',
        scoreB: '#B87333',
        scoreC: '#7A6A55',
        scoreD: '#444444',
        scoreOverlayBg: 'rgba(0,0,0,0.45)',
        scoreHintText: 'rgba(0,0,0,0.35)',
        scoreCardBg: 'rgba(250,250,250,0.97)',
        scoreCardBorder: 'rgba(0,0,0,0.1)',
        scoreLabelText: 'rgba(0,0,0,0.55)',
        scoreBarBg: 'rgba(0,0,0,0.08)',
        modeSelectorBg: 'rgba(0,0,0,0.15)',
        modeSelectorUnselected: 'rgba(0,0,0,0.6)',
        overlayBg: 'rgba(0,0,0,0.55)',
        topBarBg: 'rgba(0,0,0,0.35)',
        topBarText: '#1A1A1A',
        topBarTextSecondary: 'rgba(0,0,0,0.6)',
        topBarBorderInactive: 'rgba(0,0,0,0.15)',
        topBarBorderActive: 'rgba(0,0,0,0.3)',
        topBarSelectorBgActive: 'rgba(196,163,90,0.35)',
        topBarSelectorBorderActive: 'rgba(196,163,90,0.6)',
        bubbleBg: 'rgba(0,0,0,0.1)',
        timerActiveBg: 'rgba(255,82,82,0.6)',
        timerActiveBorder: 'rgba(0,0,0,0.3)',
        timerPreviewBg: 'rgba(0,0,0,0.15)',
        timerBorder: 'rgba(0,0,0,0.2)',
        timerUnitText: 'rgba(0,0,0,0.5)',
        challengeActiveBg: 'rgba(255,215,0,0.15)',
        challengeActiveBorder: 'rgba(255,215,0,0.6)',
        challengeActiveText: '#E5A500',
        rawActiveBg: 'rgba(0,200,100,0.2)',
        rawActiveBorder: 'rgba(0,200,100,0.6)',
        rawActiveText: '#00A050',
        focusGuideActiveBg: 'rgba(255,220,0,0.15)',
        focusGuideActiveBorder: 'rgba(255,220,0,0.5)',
        focusGuideActiveText: '#D4A500',
        voiceActiveBg: 'rgba(196,163,90,0.2)',
        burstIndicatorBg: 'rgba(255,215,0,0.85)',
        burstIndicatorText: '#000000',
        burstSuggestionBg: 'rgba(250,245,230,0.97)',
        burstSuggestionBorder: 'rgba(200,160,80,0.4)',
        toastBg: 'rgba(255,107,138,0.9)',
        favoriteIcon: '#E85A7A',
        shareButtonBg: 'rgba(0,0,0,0.55)',
        shareButtonBorder: 'rgba(255,255,255,0.15)',
        shareButtonDisabledText: 'rgba(255,255,255,0.3)',
        drawerBg: '#F5F5F5',
        drawerHandle: '#CCCCCC',
        drawerTextSecondary: '#AAAAAA',
        gridCardDisabledText: '#AAAAAA',
        sparkleColors: ['#FFD700', '#C0C0C0', '#FF69B4', '#87CEEB', '#98FB98'],
        starGreen: '#7CB342',
        starYellow: '#F9A825',
        starOrange: '#FB8C00',
      },
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    });

    const { getAllByText } = render(<ShareCard {...defaultProps} />);
    expect(getAllByText('三分法').length).toBeGreaterThan(0);
  });
});
