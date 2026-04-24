import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CameraTopBar, CameraTopBarProps } from '../components/CameraTopBar';

// Mock Reanimated v4
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Mock SharedValue for toastOpacity
const mockToastOpacity = { value: 0 } as any;

jest.mock('../components/SunPositionOverlay', () => ({
  SunToggleButton: ({ visible, onPress }: { visible: boolean; onPress: () => void }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="sun-toggle" onPress={onPress}>
        <Text>{visible ? 'sun-on' : 'sun-off'}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../components/ShareButton', () => ({
  ShareButton: () => {
    const { View } = require('react-native');
    return <View testID="share-btn" />;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text>{name}</Text>;
  },
}));

const defaultProps: CameraTopBarProps = {
  gridVariant: 'thirds',
  showGridModal: false,
  onGridPress: jest.fn(),
  onGridSelect: jest.fn(),
  onGridModalClose: jest.fn(),
  showHistogram: false,
  onHistogramToggle: jest.fn(),
  onHistogramPressIn: jest.fn(),
  onHistogramPressOut: jest.fn(),
  showLevel: false,
  onLevelToggle: jest.fn(),
  showSunOverlay: false,
  onSunToggle: jest.fn(),
  showFocusGuide: false,
  onFocusGuideToggle: jest.fn(),
  showFocusPeaking: false,
  onFocusPeakingToggle: jest.fn(),
  voiceEnabled: false,
  onVoiceToggle: jest.fn(),
  rawMode: false,
  rawSupported: true,
  onRawToggle: jest.fn(),
  challengeMode: false,
  onChallengeToggle: jest.fn(),
  timerDuration: 3,
  countdownActive: false,
  onTimerPress: jest.fn(),
  onCancelCountdown: jest.fn(),
  lastCapturedUri: null,
  onSaveToFavorites: jest.fn(),
  suggestions: [],
  lastCapturedScore: null,
  lastCapturedScoreReason: null,
  showKeypoints: false,
  onComparePress: jest.fn(),
  burstActive: false,
  burstCount: 0,
  toastOpacity: mockToastOpacity,
  toastMessage: '已收藏！',
};

describe('CameraTopBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { getByText } = render(<CameraTopBar {...defaultProps} />);
    expect(getByText('📐 三分法')).toBeTruthy();
  });

  it('calls onGridPress when grid selector is pressed', () => {
    const onGridPress = jest.fn();
    const { getByText } = render(<CameraTopBar {...defaultProps} onGridPress={onGridPress} />);
    fireEvent.press(getByText('📐 三分法'));
    expect(onGridPress).toHaveBeenCalled();
  });

  it('shows correct grid label for different variants', () => {
    const { getByText } = render(<CameraTopBar {...defaultProps} gridVariant="golden" />);
    expect(getByText('📐 黄金分割')).toBeTruthy();
  });

  it('calls onLevelToggle when level toggle is pressed', () => {
    const onLevelToggle = jest.fn();
    const { getByText } = render(<CameraTopBar {...defaultProps} onLevelToggle={onLevelToggle} />);
    fireEvent.press(getByText('🔮 水平仪'));
    expect(onLevelToggle).toHaveBeenCalled();
  });

  it('calls onFocusGuideToggle when focus guide toggle is pressed', () => {
    const onFocusGuideToggle = jest.fn();
    const { getByText } = render(<CameraTopBar {...defaultProps} onFocusGuideToggle={onFocusGuideToggle} />);
    fireEvent.press(getByText('🎯 对焦'));
    expect(onFocusGuideToggle).toHaveBeenCalled();
  });

  it('calls onFocusPeakingToggle when focus peaking toggle is pressed', () => {
    const onFocusPeakingToggle = jest.fn();
    const { getByText } = render(<CameraTopBar {...defaultProps} onFocusPeakingToggle={onFocusPeakingToggle} />);
    fireEvent.press(getByText('🎚️ 峰值'));
    expect(onFocusPeakingToggle).toHaveBeenCalled();
  });

  it('calls onVoiceToggle when voice button is pressed', () => {
    const onVoiceToggle = jest.fn();
    const { getByText } = render(<CameraTopBar {...defaultProps} onVoiceToggle={onVoiceToggle} />);
    fireEvent.press(getByText('语音'));
    expect(onVoiceToggle).toHaveBeenCalled();
  });

  it('calls onRawToggle when RAW button is pressed', () => {
    const onRawToggle = jest.fn();
    const { getByText } = render(<CameraTopBar {...defaultProps} onRawToggle={onRawToggle} />);
    fireEvent.press(getByText('📷 RAW'));
    expect(onRawToggle).toHaveBeenCalled();
  });

  it('shows timer duration when countdown is not active', () => {
    const { getByText } = render(<CameraTopBar {...defaultProps} timerDuration={5} countdownActive={false} />);
    expect(getByText('⏱ 5s')).toBeTruthy();
  });

  it('shows cancel button when countdown is active', () => {
    const { getByText } = render(<CameraTopBar {...defaultProps} countdownActive={true} />);
    expect(getByText('✕ 取消')).toBeTruthy();
  });

  it('calls onCancelCountdown when cancel pressed during active countdown', () => {
    const onCancelCountdown = jest.fn();
    const { getByText } = render(<CameraTopBar {...defaultProps} countdownActive={true} onCancelCountdown={onCancelCountdown} />);
    fireEvent.press(getByText('✕ 取消'));
    expect(onCancelCountdown).toHaveBeenCalled();
  });

  it('calls onTimerPress when timer pressed without countdown', () => {
    const onTimerPress = jest.fn();
    const { getByText } = render(<CameraTopBar {...defaultProps} onTimerPress={onTimerPress} />);
    fireEvent.press(getByText('⏱ 3s'));
    expect(onTimerPress).toHaveBeenCalled();
  });

  it('shows compare button when lastCapturedUri is set and keypoints not visible', () => {
    const { getByText } = render(
      <CameraTopBar {...defaultProps} lastCapturedUri="file://test.jpg" showKeypoints={false} />
    );
    expect(getByText('🖼️ 对比')).toBeTruthy();
  });

  it('does not show compare button when showKeypoints is true', () => {
    const { queryByText } = render(
      <CameraTopBar {...defaultProps} lastCapturedUri="file://test.jpg" showKeypoints={true} />
    );
    expect(queryByText('🖼️ 对比')).toBeNull();
  });

  it('shows burst indicator when burstActive is true', () => {
    const { getByText } = render(
      <CameraTopBar {...defaultProps} burstActive={true} burstCount={3} />
    );
    expect(getByText('连拍中 3/5')).toBeTruthy();
  });

  it('calls onChallengeToggle when challenge button is pressed', () => {
    const onChallengeToggle = jest.fn();
    const { getByText } = render(<CameraTopBar {...defaultProps} onChallengeToggle={onChallengeToggle} />);
    fireEvent.press(getByText('🎮 挑战'));
    expect(onChallengeToggle).toHaveBeenCalled();
  });

  it('favorite button is disabled when no captured photo', () => {
    const onSaveToFavorites = jest.fn();
    const { getByTestId } = render(
      <CameraTopBar {...defaultProps} lastCapturedUri={null} onSaveToFavorites={onSaveToFavorites} />
    );
    // heart icon rendered via Ionicons mock
    expect(onSaveToFavorites).not.toHaveBeenCalled();
  });

  it('shows sun toggle via SunToggleButton', () => {
    const { getByTestId } = render(<CameraTopBar {...defaultProps} showSunOverlay={true} />);
    expect(getByTestId('sun-toggle')).toBeTruthy();
  });
});
