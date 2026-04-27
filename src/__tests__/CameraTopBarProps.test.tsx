import type { CameraTopBarProps } from '../types';

// Helper to create a minimal valid props object for type-level assertions
function makeCameraTopBarProps(overrides: Partial<CameraTopBarProps> = {}): CameraTopBarProps {
  return {
    gridVariant: 'grid-3x3',
    showGridModal: false,
    onGridPress: () => {},
    onGridSelect: () => {},
    onGridModalClose: () => {},
    showHistogram: false,
    onHistogramToggle: () => {},
    onHistogramPressIn: () => {},
    onHistogramPressOut: () => {},
    showLevel: false,
    onLevelToggle: () => {},
    showSunOverlay: false,
    onSunToggle: () => {},
    showFocusGuide: false,
    onFocusGuideToggle: () => {},
    showFocusPeaking: false,
    onFocusPeakingToggle: () => {},
    voiceEnabled: false,
    onVoiceToggle: () => {},
    rawMode: false,
    rawSupported: false,
    onRawToggle: () => {},
    challengeMode: false,
    onChallengeToggle: () => {},
    timerDuration: 0,
    countdownActive: false,
    onTimerPress: () => {},
    onCancelCountdown: () => {},
    lastCapturedUri: null,
    onSaveToFavorites: () => {},
    suggestions: [],
    lastCapturedScore: null,
    lastCapturedScoreReason: null,
    showKeypoints: false,
    onComparePress: () => {},
    burstActive: false,
    ...overrides,
  };
}

describe('CameraTopBarProps', () => {
  it('accepts all valid grid props', () => {
    const props = makeCameraTopBarProps({
      gridVariant: 'grid-golden',
      showGridModal: true,
      onGridPress: () => {},
      onGridSelect: () => {},
      onGridModalClose: () => {},
    });
    expect(props.gridVariant).toBe('grid-golden');
    expect(props.showGridModal).toBe(true);
  });

  it('accepts all valid histogram props', () => {
    const props = makeCameraTopBarProps({
      showHistogram: true,
      onHistogramToggle: () => {},
      onHistogramPressIn: () => {},
      onHistogramPressOut: () => {},
    });
    expect(props.showHistogram).toBe(true);
  });

  it('accepts level props', () => {
    const props = makeCameraTopBarProps({
      showLevel: true,
      onLevelToggle: () => {},
    });
    expect(props.showLevel).toBe(true);
  });

  it('accepts sun overlay props', () => {
    const props = makeCameraTopBarProps({
      showSunOverlay: true,
      onSunToggle: () => {},
    });
    expect(props.showSunOverlay).toBe(true);
  });

  it('accepts focus guide props', () => {
    const props = makeCameraTopBarProps({
      showFocusGuide: true,
      onFocusGuideToggle: () => {},
    });
    expect(props.showFocusGuide).toBe(true);
  });

  it('accepts focus peaking props', () => {
    const props = makeCameraTopBarProps({
      showFocusPeaking: true,
      onFocusPeakingToggle: () => {},
    });
    expect(props.showFocusPeaking).toBe(true);
  });

  it('accepts voice props', () => {
    const props = makeCameraTopBarProps({
      voiceEnabled: true,
      onVoiceToggle: () => {},
    });
    expect(props.voiceEnabled).toBe(true);
  });

  it('accepts RAW props', () => {
    const props = makeCameraTopBarProps({
      rawMode: true,
      rawSupported: true,
      onRawToggle: () => {},
    });
    expect(props.rawMode).toBe(true);
    expect(props.rawSupported).toBe(true);
  });

  it('accepts challenge props', () => {
    const props = makeCameraTopBarProps({
      challengeMode: true,
      onChallengeToggle: () => {},
    });
    expect(props.challengeMode).toBe(true);
  });

  it('accepts timer props', () => {
    const props = makeCameraTopBarProps({
      timerDuration: 3,
      countdownActive: true,
      onTimerPress: () => {},
      onCancelCountdown: () => {},
    });
    expect(props.timerDuration).toBe(3);
    expect(props.countdownActive).toBe(true);
  });

  it('accepts photo/save props', () => {
    const props = makeCameraTopBarProps({
      lastCapturedUri: 'file:///photo.jpg',
      onSaveToFavorites: () => {},
    });
    expect(props.lastCapturedUri).toBe('file:///photo.jpg');
  });

  it('accepts suggestions/score props', () => {
    const props = makeCameraTopBarProps({
      suggestions: ['rule-of-thirds', 'leading-lines'],
      lastCapturedScore: 85,
      lastCapturedScoreReason: 'Great composition',
    });
    expect(props.suggestions).toHaveLength(2);
    expect(props.lastCapturedScore).toBe(85);
  });

  it('accepts keypoints/compare props', () => {
    const props = makeCameraTopBarProps({
      showKeypoints: true,
      onComparePress: () => {},
    });
    expect(props.showKeypoints).toBe(true);
  });

  it('accepts burst props', () => {
    const props = makeCameraTopBarProps({
      burstActive: true,
    });
    expect(props.burstActive).toBe(true);
  });

  it('does NOT have showSceneRecognition prop (removed)', () => {
    // @ts-expect-error — showSceneRecognition does not exist on CameraTopBarProps
    const _props: CameraTopBarProps['showSceneRecognition'] = undefined;
    expect(_props).toBeUndefined();
  });

  it('does NOT have onSceneRecognitionToggle prop (removed)', () => {
    // @ts-expect-error — onSceneRecognitionToggle does not exist
    const _props: CameraTopBarProps['onSceneRecognitionToggle'] = undefined;
    expect(_props).toBeUndefined();
  });

  it('does NOT have onSettings prop (removed)', () => {
    // @ts-expect-error — onSettings does not exist on CameraTopBarProps
    const _props: CameraTopBarProps['onSettings'] = undefined;
    expect(_props).toBeUndefined();
  });
});
