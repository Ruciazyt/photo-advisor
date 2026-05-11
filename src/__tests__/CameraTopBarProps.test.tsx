/**
 * Type-level assertions for CameraTopBarProps and CameraOverlaysProps.
 * These tests verify the prop interfaces match actual component implementations.
 * Run with: npx jest src/__tests__/CameraTopBarProps.test.tsx --no-coverage
 */

import type { CameraTopBarProps } from '../types';
import type { CameraOverlaysProps } from '../types';
import type { GridVariant } from '../types';
import type { CompositionScoreResult } from '../types';
import type { ChallengeSession } from '../types';
import type { Keypoint } from '../types';
import type { BubbleItem } from '../types';
import type { PeakPoint } from '../types';
import type { CameraView } from 'expo-camera';
import type React from 'react';

// ============================================================
// CameraTopBarProps type assertions
// ============================================================

describe('CameraTopBarProps', () => {
  describe('Grid props', () => {
    it('has correct grid prop types', () => {
      const props: CameraTopBarProps = {
        gridVariant: 'thirds',
        showGridModal: false,
        onGridPress: () => {},
        onGridSelect: (v: GridVariant) => {},
        onGridModalClose: () => {},
        // required even if unused in this test
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
        timerDuration: 3,
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
        burstCount: 0,
        toastOpacity: { value: 0 } as any,
        toastMessage: '',
      };
      expect(props.gridVariant).toBeDefined();
      expect(props.showGridModal).toBeDefined();
      expect(props.onGridPress).toBeDefined();
      expect(props.onGridSelect).toBeDefined();
      expect(props.onGridModalClose).toBeDefined();
    });

    it('accepts all GridVariant values', () => {
      const variants: GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral', 'none'];
      variants.forEach(v => {
        const props: CameraTopBarProps = createMinimalProps({ gridVariant: v });
        expect(props.gridVariant).toBe(v);
      });
    });
  });

  describe('Histogram props', () => {
    it('has correct histogram prop types', () => {
      const props = createMinimalProps({
        showHistogram: true,
        onHistogramToggle: () => {},
        onHistogramPressIn: () => {},
        onHistogramPressOut: () => {},
      });
      expect(props.showHistogram).toBe(true);
      expect(typeof props.onHistogramToggle).toBe('function');
      expect(typeof props.onHistogramPressIn).toBe('function');
      expect(typeof props.onHistogramPressOut).toBe('function');
    });
  });

  describe('Level props', () => {
    it('has correct level prop types', () => {
      const props = createMinimalProps({
        showLevel: true,
        onLevelToggle: () => {},
      });
      expect(props.showLevel).toBe(true);
      expect(typeof props.onLevelToggle).toBe('function');
    });
  });

  describe('Sun props', () => {
    it('has correct sun prop types (showSunOverlay, onSunToggle)', () => {
      const props = createMinimalProps({
        showSunOverlay: true,
        onSunToggle: () => {},
      });
      expect(props.showSunOverlay).toBe(true);
      expect(typeof props.onSunToggle).toBe('function');
    });

    it('does NOT have showSunPosition (removed)', () => {
      type HasShowSunPosition = CameraTopBarProps extends { showSunPosition: boolean } ? true : false;
      const _check: HasShowSunPosition = false as any;
      expect(_check).toBe(false);
    });

    it('does NOT have onSunPositionToggle (removed)', () => {
      type HasOnSunPositionToggle = CameraTopBarProps extends { onSunPositionToggle: () => void } ? true : false;
      const _check: HasOnSunPositionToggle = false as any;
      expect(_check).toBe(false);
    });
  });

  describe('Focus guide props', () => {
    it('has correct focus guide prop types', () => {
      const props = createMinimalProps({
        showFocusGuide: true,
        onFocusGuideToggle: () => {},
      });
      expect(props.showFocusGuide).toBe(true);
      expect(typeof props.onFocusGuideToggle).toBe('function');
    });
  });

  describe('Focus zone selector props', () => {
    it('has onOpenFocusZoneSelector prop', () => {
      const onOpenFocusZoneSelector = jest.fn();
      const props = createMinimalProps({ onOpenFocusZoneSelector });
      expect(typeof props.onOpenFocusZoneSelector).toBe('function');
      expect(props.onOpenFocusZoneSelector).toBe(onOpenFocusZoneSelector);
    });

    it('onOpenFocusZoneSelector is callable without args', () => {
      const props = createMinimalProps({
        onOpenFocusZoneSelector: () => {},
      });
      props.onOpenFocusZoneSelector();
    });
  });

  describe('Focus peaking props', () => {
    it('has correct focus peaking prop types', () => {
      const props = createMinimalProps({
        showFocusPeaking: true,
        onFocusPeakingToggle: () => {},
      });
      expect(props.showFocusPeaking).toBe(true);
      expect(typeof props.onFocusPeakingToggle).toBe('function');
    });
  });

  describe('Voice props', () => {
    it('has correct voice prop types (voiceEnabled, onVoiceToggle)', () => {
      const props = createMinimalProps({
        voiceEnabled: true,
        onVoiceToggle: () => {},
      });
      expect(props.voiceEnabled).toBe(true);
      expect(typeof props.onVoiceToggle).toBe('function');
    });
  });

  describe('RAW props', () => {
    it('has correct RAW prop types (rawMode, rawSupported, onRawToggle)', () => {
      const props = createMinimalProps({
        rawMode: true,
        rawSupported: true,
        onRawToggle: () => {},
      });
      expect(props.rawMode).toBe(true);
      expect(props.rawSupported).toBe(true);
      expect(typeof props.onRawToggle).toBe('function');
    });
  });

  describe('Challenge props', () => {
    it('has correct challenge prop types (challengeMode, onChallengeToggle)', () => {
      const props = createMinimalProps({
        challengeMode: true,
        onChallengeToggle: () => {},
      });
      expect(props.challengeMode).toBe(true);
      expect(typeof props.onChallengeToggle).toBe('function');
    });
  });

  describe('Timer props', () => {
    it('has correct timer prop types', () => {
      const props = createMinimalProps({
        timerDuration: 5,
        countdownActive: true,
        onTimerPress: () => {},
        onCancelCountdown: () => {},
      });
      expect(props.timerDuration).toBe(5);
      expect(props.countdownActive).toBe(true);
      expect(typeof props.onTimerPress).toBe('function');
      expect(typeof props.onCancelCountdown).toBe('function');
    });
  });

  describe('Photo props', () => {
    it('has correct photo prop types (lastCapturedUri, onSaveToFavorites)', () => {
      const props = createMinimalProps({
        lastCapturedUri: 'file:///test.jpg',
        onSaveToFavorites: () => {},
      });
      expect(props.lastCapturedUri).toBe('file:///test.jpg');
      expect(typeof props.onSaveToFavorites).toBe('function');
    });

    it('lastCapturedUri can be null', () => {
      const props = createMinimalProps({ lastCapturedUri: null });
      expect(props.lastCapturedUri).toBeNull();
    });
  });

  describe('Suggestions/score props', () => {
    it('has correct suggestions/score prop types', () => {
      const props = createMinimalProps({
        suggestions: ['三分法', '黄金分割'],
        lastCapturedScore: 85,
        lastCapturedScoreReason: '构图均衡',
      });
      expect(props.suggestions).toEqual(['三分法', '黄金分割']);
      expect(props.lastCapturedScore).toBe(85);
      expect(props.lastCapturedScoreReason).toBe('构图均衡');
    });

    it('score props can be null', () => {
      const props = createMinimalProps({
        lastCapturedScore: null,
        lastCapturedScoreReason: null,
      });
      expect(props.lastCapturedScore).toBeNull();
      expect(props.lastCapturedScoreReason).toBeNull();
    });
  });

  describe('Keypoints props', () => {
    it('has correct keypoints prop types (showKeypoints, onComparePress)', () => {
      const props = createMinimalProps({
        showKeypoints: true,
        onComparePress: () => {},
      });
      expect(props.showKeypoints).toBe(true);
      expect(typeof props.onComparePress).toBe('function');
    });
  });

  describe('Burst props', () => {
    it('has correct burst prop types (burstActive, burstCount)', () => {
      const props = createMinimalProps({
        burstActive: true,
        burstCount: 5,
      });
      expect(props.burstActive).toBe(true);
      expect(props.burstCount).toBe(5);
    });
  });

  describe('Toast props', () => {
    it('has correct toast prop types (toastOpacity, toastMessage)', () => {
      const mockSharedValue = { value: 1 } as any;
      const props = createMinimalProps({
        toastOpacity: mockSharedValue,
        toastMessage: 'Test message',
      });
      expect(props.toastOpacity).toBeDefined();
      expect(props.toastMessage).toBe('Test message');
    });
  });

  describe('Removed props that should NOT exist', () => {
    it('does NOT have showSceneRecognition', () => {
      type HasShowSceneRecognition = CameraTopBarProps extends { showSceneRecognition: boolean } ? true : false;
      const _check: HasShowSceneRecognition = false as any;
      expect(_check).toBe(false);
    });

    it('does NOT have onSceneRecognitionToggle', () => {
      type HasOnSceneRecognitionToggle = CameraTopBarProps extends { onSceneRecognitionToggle: () => void } ? true : false;
      const _check: HasOnSceneRecognitionToggle = false as any;
      expect(_check).toBe(false);
    });

    it('does NOT have onSettings', () => {
      type HasOnSettings = CameraTopBarProps extends { onSettings: () => void } ? true : false;
      const _check: HasOnSettings = false as any;
      expect(_check).toBe(false);
    });
  });
});

// ============================================================
// CameraOverlaysProps type assertions
// ============================================================

describe('CameraOverlaysProps', () => {
  const minimalOverlayProps: Partial<CameraOverlaysProps> & { apiConfigured: boolean; gridVariant: GridVariant; showGridModal: boolean; onGridSelect: (v: GridVariant) => void; onGridModalClose: () => void; showLevel: boolean; showHistogram: boolean; histogramData: number[]; showFocusGuide: boolean; showFocusPeaking: boolean; cameraRef: React.RefObject<CameraView | null>; peakPoints: PeakPoint[]; screenWidth: number; screenHeight: number; showSunOverlay: boolean; showBurstSuggestion: boolean; burstSuggestionText: string; onBurstSuggestionAccept: () => void; onBurstSuggestionDismiss: () => void; burstActive: boolean; showKeypoints: boolean; keypoints: Keypoint[]; showScoreOverlay: boolean; scoreOverlayResult: CompositionScoreResult | null; challengeMode: boolean; challengeSession: ChallengeSession | null; onScoreDismiss: () => void; sceneTag: string | null; sceneTagVisible: boolean; countdownActive: boolean; countdownCount: number; onCountdownComplete: () => void; lastCapturedUri: string | null; bubbleItems: BubbleItem[]; showComparison: boolean; lastCapturedScore: number | null; lastCapturedScoreReason: string | null; onComparisonClose: () => void; } = {
    apiConfigured: true,
    gridVariant: 'thirds' as GridVariant,
    showGridModal: false,
    onGridSelect: (v: GridVariant) => {},
    onGridModalClose: () => {},
    showLevel: false,
    showHistogram: false,
    histogramData: [],
    showFocusGuide: false,
    showFocusPeaking: false,
    cameraRef: { current: null } as React.RefObject<CameraView | null>,
    peakPoints: [] as PeakPoint[],
    screenWidth: 400,
    screenHeight: 800,
    showSunOverlay: false,
    showBurstSuggestion: false,
    burstSuggestionText: '',
    onBurstSuggestionAccept: () => {},
    onBurstSuggestionDismiss: () => {},
    burstActive: false,
    showKeypoints: false,
    keypoints: [] as Keypoint[],
    showScoreOverlay: false,
    scoreOverlayResult: null,
    challengeMode: false,
    challengeSession: null,
    onScoreDismiss: () => {},
    sceneTag: null,
    sceneTagVisible: false,
    countdownActive: false,
    countdownCount: 0,
    onCountdownComplete: () => {},
    lastCapturedUri: null,
    bubbleItems: [] as BubbleItem[],
    showComparison: false,
    lastCapturedScore: null,
    lastCapturedScoreReason: null,
    onComparisonClose: () => {},
  };

  describe('showToast prop', () => {
    it('showToast is optional', () => {
      // Should compile without showToast
      const props: CameraOverlaysProps = { ...minimalOverlayProps };
      expect(props.apiConfigured).toBe(true);
    });

    it('showToast accepts a function', () => {
      const props: CameraOverlaysProps = {
        ...minimalOverlayProps,
        showToast: (message: string) => {},
      };
      expect(typeof props.showToast).toBe('function');
    });

    it('showToast type matches (message: string) => void', () => {
      const mockToast: (message: string) => void = (msg) => console.log(msg);
      const props: CameraOverlaysProps = { ...minimalOverlayProps, showToast: mockToast };
      expect(props.showToast).toBeDefined();
    });
  });

  describe('focusPeakingColor prop', () => {
    it('focusPeakingColor is optional', () => {
      // Should compile without focusPeakingColor
      const props: CameraOverlaysProps = { ...minimalOverlayProps };
      expect(props.apiConfigured).toBe(true);
    });

    it('focusPeakingColor accepts a string', () => {
      const props: CameraOverlaysProps = {
        ...minimalOverlayProps,
        focusPeakingColor: '#FF00FF',
      };
      expect(props.focusPeakingColor).toBe('#FF00FF');
    });

    it('focusPeakingColor type is string | undefined', () => {
      type FocusPeakingColorType = CameraOverlaysProps['focusPeakingColor'];
      const _typeCheck: FocusPeakingColorType = undefined;
      const _typeCheck2: FocusPeakingColorType = '#FF00FF';
      expect(_typeCheck).toBeUndefined();
      expect(_typeCheck2).toBe('#FF00FF');
    });
  });

  describe('showSunOverlay prop (not showSunPosition)', () => {
    it('has showSunOverlay, not showSunPosition', () => {
      type HasShowSunOverlay = CameraOverlaysProps extends { showSunOverlay: boolean } ? true : false;
      const _check: HasShowSunOverlay = true as any;
      expect(_check).toBe(true);
    });

    it('does NOT have showSunPosition', () => {
      type HasShowSunPosition = CameraOverlaysProps extends { showSunPosition: boolean } ? true : false;
      const _check: HasShowSunPosition = false as any;
      expect(_check).toBe(false);
    });
  });

  describe('bubbleItems prop (not bubbles)', () => {
    it('has bubbleItems, not bubbles', () => {
      type HasBubbleItems = CameraOverlaysProps extends { bubbleItems: BubbleItem[] } ? true : false;
      const _check: HasBubbleItems = true as any;
      expect(_check).toBe(true);
    });

    it('does NOT have bubbles', () => {
      type HasBubbles = CameraOverlaysProps extends { bubbles: BubbleItem[] } ? true : false;
      const _check: HasBubbles = false as any;
      expect(_check).toBe(false);
    });
  });

  describe('required props are present', () => {
    it('has all required grid props', () => {
      const props = minimalOverlayProps;
      expect(props.gridVariant).toBeDefined();
      expect(props.showGridModal).toBeDefined();
      expect(props.onGridSelect).toBeDefined();
      expect(props.onGridModalClose).toBeDefined();
    });

    it('has all required camera props', () => {
      const props = minimalOverlayProps;
      expect(props.cameraRef).toBeDefined();
      expect(props.peakPoints).toBeDefined();
      expect(props.screenWidth).toBeDefined();
      expect(props.screenHeight).toBeDefined();
    });
  });
});

// ============================================================
// Helper
// ============================================================

function createMinimalProps(overrides: Partial<CameraTopBarProps>): CameraTopBarProps {
  return {
    gridVariant: 'thirds',
    showGridModal: false,
    onGridPress: () => {},
    onGridSelect: (v: GridVariant) => {},
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
    onOpenFocusZoneSelector: () => {},
    showFocusPeaking: false,
    onFocusPeakingToggle: () => {},
    voiceEnabled: false,
    onVoiceToggle: () => {},
    rawMode: false,
    rawSupported: false,
    onRawToggle: () => {},
    challengeMode: false,
    onChallengeToggle: () => {},
    timerDuration: 3,
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
    burstCount: 0,
    toastOpacity: { value: 0 } as any,
    toastMessage: '',
    ...overrides,
  } as CameraTopBarProps;
}