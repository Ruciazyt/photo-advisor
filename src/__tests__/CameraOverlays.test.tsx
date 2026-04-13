import React from 'react';
import { render } from '@testing-library/react-native';
import { CameraOverlays, CameraOverlaysProps } from '../components/CameraOverlays';
import { CompositionScoreResult } from '../hooks/useCompositionScore';

// Mock all child overlay components
jest.mock('../components/ConfigWarning', () => ({
  ConfigWarning: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="config-warning" /> : null;
  },
}));
jest.mock('../components/GridOverlay', () => ({
  GridOverlay: ({ variant }: { variant: string }) => {
    const { View } = require('react-native');
    return <View testID={`grid-${variant}`} />;
  },
}));
jest.mock('../components/GridSelectorModal', () => ({
  GridSelectorModal: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="grid-modal" /> : null;
  },
}));
jest.mock('../components/LevelIndicator', () => ({
  LevelIndicator: () => {
    const { View } = require('react-native');
    return <View testID="level-indicator" />;
  },
}));
jest.mock('../components/HistogramOverlay', () => ({
  HistogramOverlay: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="histogram-overlay" /> : null;
  },
}));
jest.mock('../components/FocusGuideOverlay', () => ({
  FocusGuideOverlay: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="focus-guide" /> : null;
  },
}));
jest.mock('../components/FocusPeakingOverlay', () => ({
  FocusPeakingOverlay: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="focus-peaking" /> : null;
  },
}));
jest.mock('../components/SunPositionOverlay', () => ({
  SunPositionOverlay: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="sun-overlay" /> : null;
  },
}));
jest.mock('../components/BurstSuggestionOverlay', () => ({
  BurstSuggestionOverlay: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="burst-suggestion" /> : null;
  },
}));
jest.mock('../components/KeypointOverlay', () => ({
  KeypointOverlay: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="keypoint-overlay" /> : null;
  },
}));
jest.mock('../components/CompositionScoreOverlay', () => ({
  CompositionScoreOverlay: () => {
    const { View } = require('react-native');
    return <View testID="score-overlay" />;
  },
}));
jest.mock('../components/SceneTagOverlay', () => ({
  SceneTagOverlay: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="scene-tag" /> : null;
  },
}));
jest.mock('../components/CountdownOverlay', () => ({
  CountdownOverlay: () => {
    const { View } = require('react-native');
    return <View testID="countdown-overlay" />;
  },
}));
jest.mock('../components/ComparisonOverlay', () => ({
  ComparisonOverlay: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return visible ? <View testID="comparison-overlay" /> : null;
  },
}));

const mockCameraRef = { current: null } as React.RefObject<any>;

const defaultProps: CameraOverlaysProps = {
  apiConfigured: true,
  gridVariant: 'thirds',
  showGridModal: false,
  onGridSelect: jest.fn(),
  onGridModalClose: jest.fn(),
  showLevel: false,
  showHistogram: false,
  histogramData: [],
  showFocusGuide: false,
  cameraRef: mockCameraRef,
  peakPoints: [],
  screenWidth: 375,
  screenHeight: 812,
  showSunOverlay: false,
  showBurstSuggestion: false,
  burstSuggestionText: '',
  onBurstSuggestionAccept: jest.fn(),
  onBurstSuggestionDismiss: jest.fn(),
  burstActive: false,
  showKeypoints: false,
  keypoints: [],
  showScoreOverlay: false,
  scoreOverlayResult: null,
  challengeMode: false,
  challengeSession: null,
  onScoreDismiss: jest.fn(),
  sceneTag: null,
  sceneTagVisible: false,
  countdownActive: false,
  countdownCount: 3,
  onCountdownComplete: jest.fn(),
  lastCapturedUri: null,
  bubbleItems: [],
  showComparison: false,
  lastCapturedScore: null,
  lastCapturedScoreReason: null,
  onComparisonClose: jest.fn(),
};

describe('CameraOverlays', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { getByTestId } = render(<CameraOverlays {...defaultProps} />);
    expect(getByTestId('grid-thirds')).toBeTruthy();
  });

  it('shows ConfigWarning when apiConfigured is false', () => {
    const { getByTestId } = render(<CameraOverlays {...defaultProps} apiConfigured={false} />);
    expect(getByTestId('config-warning')).toBeTruthy();
  });

  it('hides ConfigWarning when apiConfigured is true', () => {
    const { queryByTestId } = render(<CameraOverlays {...defaultProps} apiConfigured={true} />);
    expect(queryByTestId('config-warning')).toBeNull();
  });

  it('shows LevelIndicator when showLevel is true', () => {
    const { getByTestId } = render(<CameraOverlays {...defaultProps} showLevel={true} />);
    expect(getByTestId('level-indicator')).toBeTruthy();
  });

  it('hides LevelIndicator when showLevel is false', () => {
    const { queryByTestId } = render(<CameraOverlays {...defaultProps} showLevel={false} />);
    expect(queryByTestId('level-indicator')).toBeNull();
  });

  it('shows histogram overlay when showHistogram is true', () => {
    const { getByTestId } = render(<CameraOverlays {...defaultProps} showHistogram={true} />);
    expect(getByTestId('histogram-overlay')).toBeTruthy();
  });

  it('shows focus guide when showFocusGuide is true', () => {
    const { getByTestId } = render(<CameraOverlays {...defaultProps} showFocusGuide={true} />);
    expect(getByTestId('focus-guide')).toBeTruthy();
    expect(getByTestId('focus-peaking')).toBeTruthy();
  });

  it('shows sun overlay when showSunOverlay is true', () => {
    const { getByTestId } = render(<CameraOverlays {...defaultProps} showSunOverlay={true} />);
    expect(getByTestId('sun-overlay')).toBeTruthy();
  });

  it('shows burst suggestion when visible and not burst active', () => {
    const { getByTestId } = render(
      <CameraOverlays {...defaultProps} showBurstSuggestion={true} burstActive={false} />
    );
    expect(getByTestId('burst-suggestion')).toBeTruthy();
  });

  it('hides burst suggestion when burst is active', () => {
    const { queryByTestId } = render(
      <CameraOverlays {...defaultProps} showBurstSuggestion={true} burstActive={true} />
    );
    expect(queryByTestId('burst-suggestion')).toBeNull();
  });

  it('shows keypoint overlay when showKeypoints is true', () => {
    const { getByTestId } = render(
      <CameraOverlays {...defaultProps} showKeypoints={true} keypoints={[]} />
    );
    expect(getByTestId('keypoint-overlay')).toBeTruthy();
  });

  it('shows score overlay when showScoreOverlay is true and result is provided', () => {
    const mockResult: CompositionScoreResult = {
      score: 75,
      grade: 'B',
      label: '良好',
      reason: '构图不错',
      tips: [],
    };
    const { getByTestId } = render(
      <CameraOverlays {...defaultProps} showScoreOverlay={true} scoreOverlayResult={mockResult} />
    );
    expect(getByTestId('score-overlay')).toBeTruthy();
  });

  it('hides score overlay when result is null', () => {
    const { queryByTestId } = render(
      <CameraOverlays {...defaultProps} showScoreOverlay={true} scoreOverlayResult={null} />
    );
    expect(queryByTestId('score-overlay')).toBeNull();
  });

  it('shows scene tag when visible', () => {
    const { getByTestId } = render(
      <CameraOverlays {...defaultProps} sceneTagVisible={true} sceneTag="风光" />
    );
    expect(getByTestId('scene-tag')).toBeTruthy();
  });

  it('shows countdown when countdownActive is true', () => {
    const { getByTestId } = render(
      <CameraOverlays {...defaultProps} countdownActive={true} countdownCount={3} />
    );
    expect(getByTestId('countdown-overlay')).toBeTruthy();
  });

  it('shows grid modal when showGridModal is true', () => {
    const { getByTestId } = render(
      <CameraOverlays {...defaultProps} showGridModal={true} />
    );
    expect(getByTestId('grid-modal')).toBeTruthy();
  });

  it('shows comparison overlay when showComparison is true', () => {
    const { getByTestId } = render(
      <CameraOverlays {...defaultProps} showComparison={true} lastCapturedUri="file://test.jpg" />
    );
    expect(getByTestId('comparison-overlay')).toBeTruthy();
  });

  it('renders golden grid variant correctly', () => {
    const { getByTestId } = render(<CameraOverlays {...defaultProps} gridVariant="golden" />);
    expect(getByTestId('grid-golden')).toBeTruthy();
  });
});
