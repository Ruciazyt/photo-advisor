/**
 * Centralized TypeScript type definitions for photo-advisor.
 * Organized by feature area.
 */

import type React from 'react';
import type { Animated } from 'react-native';
import type { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { AppError, APIError } from '../services/errors';
import type { ErrorCode, ErrorSeverity, Result } from '../services/errors';

// ============================================================
// Bubble Overlay — AI composition suggestion bubbles
// ============================================================

export type BubblePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface BubbleItem {
  id: number;
  text: string; // format: "[区域] 内容"
  position: BubblePosition;
}

export interface BubbleOverlayProps {
  visibleItems: BubbleItem[];
  loading: boolean;
  onDismiss: (id: number) => void;
  onDismissAll: () => void;
}

// ============================================================
// Keypoint Overlay — rule-of-thirds markers
// ============================================================

export type KeypointPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface Keypoint {
  id: number;
  label: string; // e.g. "左上"
  position: KeypointPosition;
  instruction?: string; // short text from AI suggestion
}

export interface KeypointOverlayProps {
  keypoints: Keypoint[];
  visible: boolean;
}

export interface KeypointMarkerProps {
  keypoint: Keypoint;
}

// ============================================================
// Grid Overlay — composition grid variants
// ============================================================

export type GridVariant = 'thirds' | 'golden' | 'diagonal' | 'spiral' | 'none';

export interface GridOverlayProps {
  variant?: GridVariant;
}

export interface GridSelectorModalProps {
  visible: boolean;
  selectedVariant: GridVariant;
  onSelect: (variant: GridVariant) => void;
  onClose: () => void;
}

// ============================================================
// Camera Mode
// ============================================================

export type CameraMode = 'photo' | 'scan' | 'video' | 'portrait';

export interface ModeSelectorProps {
  selectedMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
}

// ============================================================
// Composition Score
// ============================================================

export type CompositionGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface CompositionBreakdown {
  alignment: number;  // 0-100 how well keypoints align with grid lines
  balance: number;    // 0-100 left/right distribution
  centrality: number; // 0-100 proximity to ideal center
}

export interface CompositionScoreResult {
  score: number;      // 0-100 overall score
  breakdown: CompositionBreakdown;
  grade: CompositionGrade;
}

export interface ChallengeSession {
  scores: number[];
  bestScore: number;
  cumulative: number;
  count: number;
}

export interface UseCompositionScoreResult {
  computeScore: (keypoints: Keypoint[], gridVariant: GridVariant) => CompositionScoreResult;
  session: ChallengeSession;
  challengeMode: boolean;
  toggleChallengeMode: () => void;
  addScore: (score: number) => void;
  resetSession: () => void;
}

// ============================================================
// Focus Peaking
// ============================================================

export interface PeakPoint {
  x: number;      // Normalised x in [0, 1] — multiply by screen width for pixel coords
  y: number;      // Normalised y in [0, 1] — multiply by screen height for pixel coords
  strength: number; // Edge strength 0-1
}

export interface UseFocusPeakingReturn {
  capturePeaks: (
    cameraRef: React.RefObject<CameraView | null>,
    previewWidth: number,
    previewHeight: number
  ) => Promise<PeakPoint[]>;
}

export interface FocusPeakingOverlayProps {
  visible: boolean;
  peaks: PeakPoint[];
  screenWidth: number;
  screenHeight: number;
  color?: string;
}

// ============================================================
// Camera Capture
// ============================================================

export interface UseCameraCaptureOptions {
  cameraRef: React.RefObject<CameraView | null>;
  cameraReady: boolean;
  onSuggestionsChange: React.Dispatch<React.SetStateAction<string[]>>;
  onLoadingChange: (loading: boolean) => void;
  onKeypointsChange: React.Dispatch<React.SetStateAction<Keypoint[]>>;
  onShowKeypointsChange: (show: boolean) => void;
}

// ============================================================
// Histogram
// ============================================================

export interface UseHistogramOptions {
  autoCaptureInterval?: number; // ms between auto captures (0 = manual only)
}

export interface UseHistogramResult {
  histogramData: number[];
  isCapturing: boolean;
  capture: (cameraRef: React.RefObject<CameraView | null>) => Promise<number[] | null>;
}

export interface HistogramOverlayProps {
  histogramData?: number[];
  visible: boolean;
}

// ============================================================
// Countdown
// ============================================================

export type TimerDuration = 3 | 5 | 10;

export interface UseCountdownOptions {
  onComplete: () => void;
}

// ============================================================
// Device Orientation
// ============================================================

export interface DeviceOrientation {
  pitch: number; // forward/backward tilt in degrees (-90 to 90)
  roll: number;  // left/right tilt in degrees (-180 to 180)
}

export interface BubbleDotProps {
  pitch: number;
  roll: number;
  color: string;
}

// ============================================================
// Sun Position
// ============================================================

export interface SunData {
  available: boolean;
  goldenHourStart: string | null; // HH:MM
  goldenHourEnd: string | null;
  blueHourStart: string | null;
  blueHourEnd: string | null;
  sunAltitude: number; // degrees above horizon
  sunAzimuth: number;  // degrees from north (0-360)
  direction: string;    // human-readable direction
  advice: string;       // shooting advice
  error?: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

// ============================================================
// Scene Recognition
// ============================================================

export interface UseSceneRecognitionReturn {
  sceneTag: string;
  isRecognizing: boolean;
  recognize: (base64: string) => Promise<string>;
}

// ============================================================
// Error Handling
// ============================================================

/** Options for the global error handler (handleError). */
export interface HandleErrorOptions {
  /** Silent errors never log to console */
  silent?: boolean;
  /** Show Alert.dialog for this error (default: true for error/critical) */
  showAlert?: boolean;
  /** Alert title override */
  alertTitle?: string;
  /** Additional context string */
  context?: string;
  /** Callback for recovery action */
  onRecover?: () => void;
  /** Custom logger (default: console) */
  logger?: {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

export interface UseErrorHandlerOptions {
  defaultOptions?: HandleErrorOptions;
}

export interface UseErrorHandlerReturn {
  handleError: (error: unknown, options?: HandleErrorOptions) => AppError;
  lastError: AppError | null;
  isErrorVisible: boolean;
  dismissError: () => void;
  safeTry: <T>(
    fn: () => Promise<T>,
    errorCode?: ErrorCode
  ) => Promise<{ ok: true; value: T } | { ok: false; error: AppError }>;
}

// ============================================================
// API / Chat
// ============================================================

export interface Model {
  id: string;
  name: string;
}

export interface ChatMessageContent {
  type: 'text' | 'image' | 'image_url';
  text?: string;
  image_url?: { url: string };
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ChatMessageContent[];
}

export interface StreamCallback {
  (text: string, done: boolean): void;
}

export interface AnthropicStreamCallback {
  (text: string, done: boolean): void;
}

export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: 'openai' | 'minimax';
}

// ============================================================
// Favorites
// ============================================================

export interface FavoriteItem {
  id: string;
  uri: string;
  score: number;
  scoreReason?: string;
  date: string;
  gridType: string;
  suggestion: string;
  sceneTag?: string;
}

// ============================================================
// Settings
// ============================================================

export interface AppSettings {
  voiceEnabled: boolean;
  theme: 'dark' | 'light';
  timerDuration: TimerDuration;
  defaultGridVariant: GridVariant;
  showHistogram: boolean;
  showLevel: boolean;
  showFocusPeaking: boolean;
  showSunPosition: boolean;
  showFocusGuide: boolean;
}

// ============================================================
// Share
// ============================================================

export interface ShareOptions {
  photoUri: string;
  suggestions: string[];
  gridType: string;
  score?: number;
  gridVariant?: string;
}

// ============================================================
// Shoot Log
// ============================================================

export interface ShootLogEntry {
  id: string;
  date: string; // ISO timestamp
  gridType: string;
  score?: number; // 0-100
  scoreReason?: string;
  sceneTag?: string;
  locationName?: string;
  timerDuration?: number;
  wasFavorite: boolean;
  thumbnailUri?: string;
  suggestions: string[];
}

// ============================================================
// Stats
// ============================================================

export interface GridUsage {
  gridType: string;
  count: number;
  avgScore: number;
  percentage: number;
}

export interface SceneUsage {
  sceneTag: string;
  count: number;
  percentage: number;
}

export interface MonthlyStats {
  month: string; // "2026-04"
  count: number;
  avgScore: number;
}

export interface StatsSummary {
  totalPhotos: number;
  avgScore: number;
  bestScore: number;
  mostUsedGrid: string;
  mostUsedScene: string;
  gridUsages: GridUsage[];
  sceneUsages: SceneUsage[];
  monthlyStats: MonthlyStats[];
  scoreHistory: { date: string; score: number }[];
  recentTrend: 'up' | 'down' | 'stable';
}

// ============================================================
// Update / Release
// ============================================================

export interface ReleaseInfo {
  tagName: string;
  version: string;
  downloadUrl: string | null;
  htmlUrl: string;
  publishedAt: string;
  body: string;
}

// ============================================================
// Theme
// ============================================================

export type ColorPalette = {
  primary: string;
  accent: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  error: string;
  warning: string;
  background: string;
  sunColor: string;
  gridAccent: string;
  countdownBg: string;
  countdownText: string;
};

export interface ThemeContextValue {
  theme: 'dark' | 'light';
  colors: ColorPalette;
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  toggleTheme: () => Promise<void>;
}

// ============================================================
// Component Props (shared / used across multiple files)
// ============================================================

export interface CameraControlsProps {
  selectedMode: 'photo' | 'scan' | 'video' | 'portrait';
  onModeChange: (mode: 'photo' | 'scan' | 'video' | 'portrait') => void;
  onGallery: () => void;
  onAskAI: () => void;
  onSwitchCamera: () => void;
}

export interface CameraOverlaysProps {
  apiConfigured: boolean;
  gridVariant: GridVariant;
  showGridModal: boolean;
  onGridSelect: (v: GridVariant) => void;
  onGridModalClose: () => void;
  showLevel: boolean;
  showHistogram: boolean;
  histogramData: number[];
  showFocusGuide: boolean;
  cameraRef: React.RefObject<CameraView | null>;
  peakPoints: PeakPoint[];
  screenWidth: number;
  screenHeight: number;
  showFocusPeaking: boolean;
  showSunPosition: boolean;
  showBurstSuggestion: boolean;
  burstSuggestion: string;
  onBurstAccept: () => void;
  onBurstDismiss: () => void;
  bubbles: BubbleItem[];
  keypoints: Keypoint[];
  showKeypoints: boolean;
  showCompositionScore: boolean;
  compositionScoreResult?: CompositionScoreResult;
  challengeMode: boolean;
  challengeSession: ChallengeSession;
  onCompositionScoreDismiss: () => void;
  sceneTag: string | null;
  showSceneTag: boolean;
  countdownActive: boolean;
  countdownCount: number;
  onCountdownComplete: () => void;
  comparisonImageUri: string | null;
  comparisonVisible: boolean;
  onComparisonClose: () => void;
  loading: boolean;
}

export interface CameraToolbarProps {
  onGallery: () => void;
  onAskAI: () => void;
  onSwitchCamera: () => void;
}

export interface CameraTopBarProps {
  gridVariant: GridVariant;
  showGridModal: boolean;
  onGridPress: () => void;
  onGridSelect: (v: GridVariant) => void;
  onGridModalClose: () => void;
  showHistogram: boolean;
  onHistogramToggle: () => void;
  onHistogramPressIn: () => void;
  onHistogramPressOut: () => void;
  showSunPosition: boolean;
  onSunPositionToggle: () => void;
  showFocusPeaking: boolean;
  onFocusPeakingToggle: () => void;
  showLevel: boolean;
  onLevelToggle: () => void;
  showFocusGuide: boolean;
  onFocusGuideToggle: () => void;
  showSceneRecognition: boolean;
  onSceneRecognitionToggle: () => void;
  onSettings: () => void;
}

export interface ComparisonOverlayProps {
  imageUri: string;
  keypoints: Keypoint[];
  bubbles: BubbleItem[];
  visible: boolean;
  onClose: () => void;
  score?: number;
  scoreReason?: string;
}

export interface SparkleItem {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  rotation: Animated.Value;
}

export interface CompositionScoreOverlayProps {
  result: CompositionScoreResult;
  challengeMode: boolean;
  session: ChallengeSession;
  onDismiss: () => void;
}

export interface ConfigWarningProps {
  visible?: boolean;
}

export interface CountdownOverlayProps {
  count: number;
  onComplete: () => void;
}

export interface TimerSelectorModalProps {
  visible: boolean;
  selectedDuration: number;
  onSelect: (duration: number) => void;
  onClose: () => void;
}

export interface FocusRingProps {
  x: number;
  y: number;
  onComplete: () => void;
}

export interface FocusGuideOverlayProps {
  visible: boolean;
  cameraRef: React.RefObject<any>;
  showToast?: (message: string) => void;
}

export interface BurstSuggestionOverlayProps {
  visible: boolean;
  suggestion: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export interface PermissionGateProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
  buttonText: string;
  onRequest: () => void;
  loading?: boolean;
}

export interface SceneTagOverlayProps {
  tag: string | null;
  visible: boolean;
}

export interface ShareButtonProps {
  photoUri: string;
  suggestions: string[];
  gridType: string;
  score?: number;
  gridVariant?: string;
  onShareEnd?: () => void;
}

export interface StreamingDrawerProps {
  visible: boolean;
  text: string;
  loading: boolean;
  onClose: () => void;
}

// Screen props
export interface SettingsScreenProps {
  onSaved?: () => void;
}

export interface StatsScreenProps {
  onBack: () => void;
}

export interface EntryCardProps {
  entry: ShootLogEntry;
}

export interface Section {
  title: string;
  data: ShootLogEntry[];
}


