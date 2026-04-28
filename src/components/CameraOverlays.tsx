import React from 'react';
import { View } from 'react-native';
import { CameraView } from 'expo-camera';
import { ConfigWarning } from './ConfigWarning';
import { GridOverlay } from './GridOverlay';
import type { GridVariant } from '../types';
import { GridSelectorModal } from './GridSelectorModal';
import { LevelIndicator } from './LevelIndicator';
import { HistogramOverlay } from './HistogramOverlay';
import { FocusGuideOverlay } from './FocusGuideOverlay';
import { FocusPeakingOverlay } from './FocusPeakingOverlay';
import { SunPositionOverlay } from './SunPositionOverlay';
import { BurstSuggestionOverlay } from './BurstSuggestionOverlay';
import { KeypointOverlay } from './KeypointOverlay';
import type { Keypoint } from '../types';
import { CompositionScoreOverlay } from './CompositionScoreOverlay';
import { SceneTagOverlay } from './SceneTagOverlay';
import { CountdownOverlay } from './CountdownOverlay';
import type { BubbleItem } from '../types';
import { ComparisonOverlay } from './ComparisonOverlay';
import type { PeakPoint } from '../types';
import type { CompositionScoreResult, ChallengeSession } from '../types';

export interface CameraOverlaysProps {
  // Config
  apiConfigured: boolean;
  // Grid
  gridVariant: GridVariant;
  showGridModal: boolean;
  onGridSelect: (v: GridVariant) => void;
  onGridModalClose: () => void;
  /** Fires when user taps the active grid overlay directly (not the selector modal) */
  onGridActivate?: (v: GridVariant) => void;
  // Level
  showLevel: boolean;
  // Histogram
  showHistogram: boolean;
  histogramData: number[];
  // Focus
  showFocusGuide: boolean;
  showFocusPeaking: boolean;
  cameraRef: React.RefObject<CameraView | null>;
  peakPoints: PeakPoint[];
  screenWidth: number;
  screenHeight: number;
  showToast?: (message: string) => void;
  // Sun
  showSunOverlay: boolean;
  // Burst
  showBurstSuggestion: boolean;
  burstSuggestionText: string;
  onBurstSuggestionAccept: () => void;
  onBurstSuggestionDismiss: () => void;
  burstActive: boolean;
  // Keypoints
  showKeypoints: boolean;
  keypoints: Keypoint[];
  // Score
  showScoreOverlay: boolean;
  scoreOverlayResult: CompositionScoreResult | null;
  challengeMode: boolean;
  challengeSession: ChallengeSession | null;
  onScoreDismiss: () => void;
  // Scene
  sceneTag: string | null;
  sceneTagVisible: boolean;
  // Countdown
  countdownActive: boolean;
  countdownCount: number;
  onCountdownComplete: () => void;
  // Comparison (rendered outside CameraView but included here for convenience)
  lastCapturedUri: string | null;
  bubbleItems: BubbleItem[];
  showComparison: boolean;
  lastCapturedScore: number | null;
  lastCapturedScoreReason: string | null;
  onComparisonClose: () => void;
  // Focus peaking color
  focusPeakingColor?: string;
}

export function CameraOverlays({
  apiConfigured,
  gridVariant,
  showGridModal,
  onGridSelect,
  onGridModalClose,
  showLevel,
  showHistogram,
  histogramData,
  showFocusGuide,
  showFocusPeaking,
  cameraRef,
  peakPoints,
  screenWidth,
  screenHeight,
  showToast,
  showSunOverlay,
  showBurstSuggestion,
  burstSuggestionText,
  onBurstSuggestionAccept,
  onBurstSuggestionDismiss,
  burstActive,
  showKeypoints,
  keypoints,
  showScoreOverlay,
  scoreOverlayResult,
  challengeMode,
  challengeSession,
  onScoreDismiss,
  sceneTag,
  sceneTagVisible,
  countdownActive,
  countdownCount,
  onCountdownComplete,
  lastCapturedUri,
  bubbleItems,
  showComparison,
  lastCapturedScore,
  lastCapturedScoreReason,
  onComparisonClose,
  focusPeakingColor,
}: CameraOverlaysProps) {
  return (
    <>
      <ConfigWarning visible={!apiConfigured} />

      <GridOverlay variant={gridVariant} onGridActivate={onGridActivate} />

      <GridSelectorModal
        visible={showGridModal}
        selectedVariant={gridVariant}
        onSelect={(v) => { onGridSelect(v); onGridModalClose(); }}
        onClose={onGridModalClose}
      />

      {showLevel && <LevelIndicator />}
      <HistogramOverlay histogramData={histogramData} visible={showHistogram} />
      <FocusGuideOverlay visible={showFocusGuide} cameraRef={cameraRef} showToast={showToast} />
      <FocusPeakingOverlay
        visible={showFocusPeaking}
        peaks={peakPoints}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        color={focusPeakingColor}
      />
      <SunPositionOverlay visible={showSunOverlay} />

      <BurstSuggestionOverlay
        visible={showBurstSuggestion && !burstActive}
        suggestion={burstSuggestionText}
        onAccept={onBurstSuggestionAccept}
        onDismiss={onBurstSuggestionDismiss}
      />

      <KeypointOverlay keypoints={keypoints} visible={showKeypoints} />

      {showScoreOverlay && scoreOverlayResult && challengeSession && (
        <CompositionScoreOverlay
          result={scoreOverlayResult}
          challengeMode={challengeMode}
          session={challengeSession}
          onDismiss={onScoreDismiss}
        />
      )}

      <SceneTagOverlay tag={sceneTag || null} visible={sceneTagVisible} />

      {countdownActive && (
        <CountdownOverlay
          key={countdownCount}
          count={countdownCount}
          onComplete={onCountdownComplete}
        />
      )}

      <ComparisonOverlay
        imageUri={lastCapturedUri!}
        keypoints={keypoints}
        bubbles={bubbleItems}
        visible={showComparison}
        onClose={onComparisonClose}
        score={lastCapturedScore ?? undefined}
        scoreReason={lastCapturedScoreReason ?? undefined}
      />
    </>
  );
}
