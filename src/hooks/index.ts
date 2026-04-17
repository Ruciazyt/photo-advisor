// Barrel export — src/hooks/index.ts
// Re-export all hooks and utilities from the hooks directory

// useAccessibility
export { announce, useAccessibilityAnnouncement, useAccessibilityReducedMotion, useAccessibilityButton } from './useAccessibility';

// useAnimationFrameTimer
export { TIMER_INTERVAL_MS, useAnimationFrameTimer } from './useAnimationFrameTimer';

// useBubbleChat
export {
  parseBubbleItemFromText,
  parseBubbleItemsFromTexts,
  type UseBubbleChatOptions,
  type UseBubbleChatReturn,
  useBubbleChat,
} from './useBubbleChat';

// useBurstMode
export { type UseBurstModeOptions, type UseBurstModeReturn, useBurstMode } from './useBurstMode';

// useCamera
export { type UseCameraOptions, type UseCameraReturn, useCamera } from './useCamera';

// useCameraCapture
export {
  type Keypoint,
  parseSuggestions,
  supportsRawCapture,
  captureRawNative,
  useCameraCapture,
} from './useCameraCapture';

// useCaptureOverlay
export { type UseCaptureOverlayReturn, useCaptureOverlay } from './useCaptureOverlay';

// useCompositionScore
export {
  type CompositionGrade,
  type CompositionBreakdown,
  type CompositionScoreResult,
  type ChallengeSession,
  type UseCompositionScoreResult,
  useCompositionScore,
} from './useCompositionScore';

// useCountdown
export { type TimerDuration, TIMER_OPTIONS, useCountdown } from './useCountdown';

// useDeviceOrientation
export { type DeviceOrientation, useDeviceOrientation } from './useDeviceOrientation';

// useErrorHandler
export { type UseErrorHandlerOptions, type UseErrorHandlerReturn, useErrorHandler } from './useErrorHandler';

// useFavorites
export { useFavorites } from './useFavorites';

// useFocusPeaking
export {
  SAMPLE_SIZE,
  EDGE_THRESHOLD,
  MAX_PEAKS,
  type PeakPoint,
  type UseFocusPeakingReturn,
  sobelMagnitudes,
  extractPeaks,
  useFocusPeaking,
} from './useFocusPeaking';

// useHaptics
export { useHaptics } from './useHaptics';

// useHistogram
export { useHistogram } from './useHistogram';

// useHistogramToggle
export { useHistogramToggle } from './useHistogramToggle';

// useKeypoints
export {
  parseKeypointFromText,
  type UseKeypointsOptions,
  type UseKeypointsReturn,
  useKeypoints,
} from './useKeypoints';

// useSceneRecognition
export { type UseSceneRecognitionReturn, useSceneRecognition } from './useSceneRecognition';

// useShootLog
export { useShootLog } from './useShootLog';

// useSuggestions
export { type UseSuggestionsReturn, useSuggestions } from './useSuggestions';

// useSunPosition
export { type SunData, useSunPosition } from './useSunPosition';

// useToast
export { useToast } from './useToast';

// useVoiceFeedback
export { speak, useVoiceFeedback } from './useVoiceFeedback';
