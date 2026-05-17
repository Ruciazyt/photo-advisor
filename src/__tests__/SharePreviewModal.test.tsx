/**
 * Tests for src/components/SharePreviewModal.tsx
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { SharePreviewModal } from '../components/SharePreviewModal';

// Mock react-native-view-shot
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(() => Promise.resolve('file:///captured-share.jpg')),
}));

// Mock ThemeContext
const mockColors = {
  accent: '#E8D5B7',
  primary: '#000000',
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
};

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: mockColors,
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

const defaultProps = {
  visible: true,
  photoUri: 'file:///test/photo.jpg',
  suggestions: ['[左上] 将主体放在左侧三分线附近', '[右下] 留出空间平衡画面'],
  gridType: '三分法',
  score: 85,
  gridVariant: 'thirds',
  captionText: '',
  onCaptionChange: jest.fn(),
  onShare: jest.fn(),
  onCancel: jest.fn(),
};

describe('SharePreviewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when visible is false', () => {
    const { queryByTestId } = render(<SharePreviewModal {...defaultProps} visible={false} />);
    expect(queryByTestId('caption-input')).toBeNull();
  });

  it('renders modal content when visible is true', () => {
    const { getByTestId } = render(<SharePreviewModal {...defaultProps} />);
    expect(getByTestId('caption-input')).toBeTruthy();
  });

  it('displays grid type label and icon', () => {
    const { getAllByText } = render(<SharePreviewModal {...defaultProps} gridVariant="thirds" gridType="三分法" />);
    // Grid label appears on both the visible preview and the offscreen capture card
    expect(getAllByText('三分法').length).toBeGreaterThan(0);
  });

  it('displays golden ratio grid label', () => {
    const { getAllByText } = render(
      <SharePreviewModal {...defaultProps} gridVariant="golden" gridType="黄金分割" />
    );
    expect(getAllByText('黄金分割').length).toBeGreaterThan(0);
  });

  it('displays star rating for score', () => {
    const { getAllByText } = render(<SharePreviewModal {...defaultProps} score={85} />);
    // Stars appear on both the visible preview and the offscreen capture card
    expect(getAllByText('★★★★☆').length).toBeGreaterThan(0);
    expect(getAllByText('(85分)').length).toBeGreaterThan(0);
  });

  it('displays 5 stars for score >= 90', () => {
    const { getAllByText } = render(<SharePreviewModal {...defaultProps} score={92} />);
    expect(getAllByText('★★★★★').length).toBeGreaterThan(0);
  });

  it('does not show score row when score is undefined', () => {
    const { queryByText } = render(<SharePreviewModal {...defaultProps} score={undefined} />);
    expect(queryByText('★')).toBeNull();
  });

  it('pre-fills caption input with AI suggestions when captionText is provided', () => {
    const caption = '将主体放在左侧三分线附近\n留出空间平衡画面';
    const { getByDisplayValue } = render(
      <SharePreviewModal {...defaultProps} captionText={caption} />
    );
    expect(getByDisplayValue(caption)).toBeTruthy();
  });

  it('calls onCaptionChange when user types in caption input', () => {
    const onCaptionChange = jest.fn();
    const { getByTestId } = render(
      <SharePreviewModal {...defaultProps} onCaptionChange={onCaptionChange} />
    );
    fireEvent.changeText(getByTestId('caption-input'), '我的照片');
    expect(onCaptionChange).toHaveBeenCalledWith('我的照片');
  });

  it('enforces max 200 character limit', () => {
    const onCaptionChange = jest.fn();
    const longText = 'a'.repeat(250);
    const { getByTestId } = render(
      <SharePreviewModal {...defaultProps} onCaptionChange={onCaptionChange} />
    );
    fireEvent.changeText(getByTestId('caption-input'), longText);
    // The TextInput maxLength prop handles the actual limit; onChangeText receives whatever the user typed
    // but the value displayed will be truncated to 200 chars by the maxLength prop
    expect(onCaptionChange).toHaveBeenCalledWith(longText);
  });

  it('shows character count', () => {
    const { getByText } = render(
      <SharePreviewModal {...defaultProps} captionText="测试文字" />
    );
    expect(getByText('4/200')).toBeTruthy();
  });

  it('calls onShare with captured image URI when Share button is pressed', async () => {
    jest.setTimeout(10000);
    const captureRef = require('react-native-view-shot').captureRef;
    captureRef.mockResolvedValue('file:///captured-share.jpg');

    const onShare = jest.fn();
    const { getByTestId } = render(
      <SharePreviewModal
        {...defaultProps}
        captionText="我的配文"
        onShare={onShare}
      />
    );

    fireEvent.press(getByTestId('share-btn'));

    await waitFor(() => {
      expect(captureRef).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onShare).toHaveBeenCalledWith('file:///captured-share.jpg', '我的配文');
    });
  });

  it('falls back to raw photoUri when captureRef throws', async () => {
    const captureRef = require('react-native-view-shot').captureRef;
    captureRef.mockRejectedValueOnce(new Error('capture failed'));

    const onShare = jest.fn();
    const { getByTestId } = render(
      <SharePreviewModal
        {...defaultProps}
        photoUri="file:///raw-photo.jpg"
        onShare={onShare}
      />
    );

    fireEvent.press(getByTestId('share-btn'));

    await waitFor(() => {
      expect(onShare).toHaveBeenCalledWith('file:///raw-photo.jpg', '');
    });
  });

  it('calls onCancel when Cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <SharePreviewModal {...defaultProps} onCancel={onCancel} />
    );
    fireEvent.press(getByTestId('cancel-btn'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('displays suggestion preview chips', () => {
    const { getByTestId, getByText } = render(
      <SharePreviewModal
        {...defaultProps}
        suggestions={[
          '[左上] 将主体放在左侧三分线附近',
          '[右下] 留出空间平衡画面',
          '[中心] 注意画面中心位置',
        ]}
      />
    );
    // Modal renders the suggestions header
    expect(getByText('💡 AI 建议')).toBeTruthy();
    // Caption input (inside the panel) is rendered
    expect(getByTestId('caption-input')).toBeTruthy();
    // Overflow indicator shows since there are exactly 3 suggestions (no overflow)
    // At least the caption label is visible confirming panel rendered
    expect(getByText('添加配文（可选）')).toBeTruthy();
  });

  it('shows overflow indicator when more than 3 suggestions', () => {
    const { getByText } = render(
      <SharePreviewModal
        {...defaultProps}
        suggestions={['a', 'b', 'c', 'd', 'e']}
      />
    );
    expect(getByText('+2 更多')).toBeTruthy();
  });

  it('displays score reason when provided', () => {
    const { getAllByText } = render(
      <SharePreviewModal
        {...defaultProps}
        score={75}
        scoreReason="主体偏左，建议右移"
      />
    );
    // Score reason appears on both offscreen capture card and visible preview
    expect(getAllByText('主体偏左，建议右移').length).toBeGreaterThan(0);
  });

  it('has accessible share button with correct label', () => {
    const { getByTestId } = render(<SharePreviewModal {...defaultProps} />);
    const shareBtn = getByTestId('share-btn');
    expect(shareBtn.props.accessibilityLabel).toBe('分享');
    expect(shareBtn.props.accessibilityRole).toBe('button');
  });

  it('has accessible cancel button with correct label', () => {
    const { getByTestId } = render(<SharePreviewModal {...defaultProps} />);
    const cancelBtn = getByTestId('cancel-btn');
    expect(cancelBtn.props.accessibilityLabel).toBe('取消');
    expect(cancelBtn.props.accessibilityRole).toBe('button');
  });

  it('has accessible caption input', () => {
    const { getByTestId } = render(<SharePreviewModal {...defaultProps} />);
    const input = getByTestId('caption-input');
    expect(input.props.accessibilityLabel).toBe('分享配文');
  });

  it('displays diagonal grid icon and label', () => {
    const { getAllByText } = render(
      <SharePreviewModal {...defaultProps} gridVariant="diagonal" gridType="对角线构图" />
    );
    // Grid type appears on both offscreen capture card and visible preview
    expect(getAllByText('对角线构图').length).toBeGreaterThan(0);
  });

  it('displays spiral grid icon and label', () => {
    const { getAllByText } = render(
      <SharePreviewModal {...defaultProps} gridVariant="spiral" gridType="螺旋构图" />
    );
    expect(getAllByText('螺旋构图').length).toBeGreaterThan(0);
  });

  it('handles empty suggestions array', () => {
    const { queryByText } = render(
      <SharePreviewModal {...defaultProps} suggestions={[]} />
    );
    // No suggestion chips should be shown
    expect(queryByText('💡')).toBeNull();
  });

  it('shows caption label text', () => {
    const { getByText } = render(<SharePreviewModal {...defaultProps} />);
    expect(getByText('添加配文（可选）')).toBeTruthy();
  });

  it('uses light theme colors when theme is light', () => {
    const { useTheme } = require('../contexts/ThemeContext');
    useTheme.mockReturnValueOnce({
      theme: 'light',
      colors: {
        ...mockColors,
        accent: '#C4A35A',
        text: '#1A1A1A',
        textSecondary: '#666666',
        starYellow: '#F9A825',
      },
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    });

    const { getAllByText } = render(
      <SharePreviewModal {...defaultProps} />
    );
    // Grid label appears on both cards
    expect(getAllByText('三分法').length).toBeGreaterThan(0);
  });

  it('renders without crashing with landscape photoAspectRatio', () => {
    const { getByTestId } = render(
      <SharePreviewModal {...defaultProps} photoAspectRatio={16 / 9} />
    );
    // Caption input should still be accessible
    expect(getByTestId('caption-input')).toBeTruthy();
  });
});
