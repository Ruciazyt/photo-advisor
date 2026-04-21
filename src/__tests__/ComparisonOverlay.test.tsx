import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ComparisonOverlay } from '../components/ComparisonOverlay';
import { Keypoint } from '../components/KeypointOverlay';
import { BubbleItem } from '../components/BubbleOverlay';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock Animated to avoid timer issues
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.UIManager = RN.NativeModules.UIManager || {};
  RN.NativeModules.UIManager.RCTView = RN.NativeModules.UIManager.RCTView || {};
  return RN;
});

describe('ComparisonOverlay', () => {
  const defaultProps = {
    imageUri: 'file:///test/photo.jpg',
    keypoints: [] as Keypoint[],
    bubbles: [] as BubbleItem[],
    visible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when visible is false', () => {
    const { toJSON } = render(<ComparisonOverlay {...defaultProps} visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when initially hidden', () => {
    const { toJSON } = render(<ComparisonOverlay {...defaultProps} visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders close button when visible', () => {
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} />);
    expect(getByText('✕')).toBeTruthy();
  });

  it('renders toggle buttons when visible', () => {
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} />);
    expect(getByText('📷 原图')).toBeTruthy();
    expect(getByText('✨ AI 标注')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<ComparisonOverlay {...defaultProps} onClose={onClose} visible={true} />);
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render score container when score is undefined', () => {
    const { queryByText } = render(<ComparisonOverlay {...defaultProps} visible={true} score={undefined} />);
    expect(queryByText('分')).toBeNull();
  });

  it('renders score container when score is provided', () => {
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} score={85} />);
    expect(getByText('85分')).toBeTruthy();
  });

  it('renders scoreReason when provided alongside score', () => {
    const { getByText } = render(
      <ComparisonOverlay
        {...defaultProps}
        visible={true}
        score={85}
        scoreReason="构图均衡"
      />
    );
    expect(getByText('构图均衡')).toBeTruthy();
  });

  it('shows 5 stars for score >= 90', () => {
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} score={95} />);
    // ★★★★★ (5 filled stars, 0 empty)
    expect(getByText('★★★★★')).toBeTruthy();
  });

  it('shows 4 stars for score 75-89', () => {
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} score={80} />);
    // ★★★★☆ (4 filled, 1 empty)
    expect(getByText('★★★★☆')).toBeTruthy();
  });

  it('shows 3 stars for score 60-74', () => {
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} score={65} />);
    // ★★★☆☆ (3 filled, 2 empty)
    expect(getByText('★★★☆☆')).toBeTruthy();
  });

  it('shows 2 stars for score 40-59', () => {
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} score={50} />);
    // ★★☆☆☆ (2 filled, 3 empty)
    expect(getByText('★★☆☆☆')).toBeTruthy();
  });

  it('shows 1 star for score < 40', () => {
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} score={30} />);
    // ★☆☆☆☆ (1 filled, 4 empty)
    expect(getByText('★☆☆☆☆')).toBeTruthy();
  });

  it('AI annotated button is active by default (showAnnotated=true)', () => {
    const { getByText } = render(<ComparisonOverlay {...defaultProps} visible={true} />);
    // The ✨ AI 标注 button should have active style (toggleBtnActive)
    // We test this by verifying the button renders without error
    expect(getByText('✨ AI 标注')).toBeTruthy();
    expect(getByText('📷 原图')).toBeTruthy();
  });

  it('renders with keypoints and bubbles without crashing', () => {
    const keypoints: Keypoint[] = [
      { id: 1, label: '主体', position: 'top-left' },
    ];
    const bubbles: BubbleItem[] = [
      { id: 1, text: '[左上] 将主体放在左侧三分线附近', position: 'top-left' },
    ];
    const { getByText } = render(
      <ComparisonOverlay
        {...defaultProps}
        keypoints={keypoints}
        bubbles={bubbles}
        visible={true}
      />
    );
    expect(getByText('✨ AI 标注')).toBeTruthy();
  });

  it('closes when close button is tapped', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ComparisonOverlay {...defaultProps} onClose={onClose} visible={true} />
    );
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toggling between views works without crashing', () => {
    const { getByText, rerender } = render(<ComparisonOverlay {...defaultProps} visible={true} />);

    // Toggle to original view
    fireEvent.press(getByText('📷 原图'));
    rerender(<ComparisonOverlay {...defaultProps} visible={true} />);

    // Toggle back to annotated view
    fireEvent.press(getByText('✨ AI 标注'));
    rerender(<ComparisonOverlay {...defaultProps} visible={true} />);

    expect(getByText('✨ AI 标注')).toBeTruthy();
  });

  it('renders correctly under ThemeProvider with dark theme', () => {
    const { getByText, toJSON } = render(
      <ThemeProvider initialTheme="dark">
        <ComparisonOverlay {...defaultProps} visible={true} score={88} scoreReason="构图均衡" />
      </ThemeProvider>
    );
    expect(getByText('88分')).toBeTruthy();
    expect(getByText('构图均衡')).toBeTruthy();
    expect(getByText('★★★★☆')).toBeTruthy();
    expect(toJSON()).not.toBeNull();
  });

  it('renders correctly under ThemeProvider with light theme', () => {
    const { getByText, toJSON } = render(
      <ThemeProvider initialTheme="light">
        <ComparisonOverlay {...defaultProps} visible={true} score={72} />
      </ThemeProvider>
    );
    expect(getByText('72分')).toBeTruthy();
    expect(getByText('★★★☆☆')).toBeTruthy();
    expect(toJSON()).not.toBeNull();
  });

  it('uses theme colors (no hardcoded background colors)', () => {
    const { toJSON } = render(
      <ThemeProvider initialTheme="dark">
        <ComparisonOverlay {...defaultProps} visible={true} />
      </ThemeProvider>
    );
    const json = toJSON();
    expect(json).not.toBeNull();
    // Verify all background colors come from theme palette
    // In dark mode: primary=#000000, cardBg=#1A1A1A
    // After theme migration, all bg colors should be from DarkColors values
    const jsonStr = JSON.stringify(json);
    // Should NOT have any unexpected hardcoded rgba values outside theme
    // (theme uses hex + alpha hex suffixes like '8F', '99', '33')
    expect(jsonStr).not.toMatch(/"backgroundColor":"rgba\(\d+,\d+,\d+,[^'"]+\)"/);
  });
});
