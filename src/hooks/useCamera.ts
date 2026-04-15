import { useState, useEffect, useCallback } from 'react';
import { CameraType, useCameraPermissions, PermissionStatus } from 'expo-camera';
import { CameraMode } from '../types';
import type { TimerDuration } from '../types';
import { supportsRawCapture } from './useCameraCapture';
import { saveAppSettings } from '../services/settings';

const TIMER_DURATIONS: TimerDuration[] = [3, 5, 10];

export interface UseCameraOptions {
  /** Initial camera mode (default: 'photo') */
  initialMode?: CameraMode;
  /** Callback when facing changes */
  onFacingChange?: (facing: CameraType) => void;
  /** Callback when mode changes */
  onModeChange?: (mode: CameraMode) => void;
}

export interface UseCameraReturn {
  /** Current camera facing direction */
  facing: CameraType;
  /** Whether the camera is ready to capture */
  cameraReady: boolean;
  /** Whether RAW mode is active */
  rawMode: boolean;
  /** Whether the device supports RAW capture */
  rawSupported: boolean;
  /** Currently selected camera mode */
  selectedMode: CameraMode;
  /** Current permission status */
  permission: PermissionStatus | null;
  /** Whether camera permission is granted */
  permissionGranted: boolean;
  /** Request camera permission */
  requestPermission: () => Promise<PermissionStatus>;
  /** Set camera ready state */
  setCameraReady: (v: boolean) => void;
  /** Switch between front and back camera */
  switchCamera: () => void;
  /** Toggle RAW mode on/off */
  toggleRawMode: () => void;
  /** Set the selected camera mode */
  setSelectedMode: (mode: CameraMode) => void;
  /** Cycle to the next timer duration */
  cycleTimerDuration: () => Promise<void>;
  /** Current timer duration */
  timerDuration: TimerDuration;
  /** Set the timer duration directly */
  setTimerDuration: (d: TimerDuration) => void;
}

export function useCamera({
  initialMode = 'photo',
  onFacingChange,
  onModeChange,
}: UseCameraOptions = {}): UseCameraReturn {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const [rawSupported, setRawSupported] = useState(false);
  const [selectedMode, setSelectedModeState] = useState<CameraMode>(initialMode);
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(3);

  // Initialize raw support check on mount
  useEffect(() => {
    supportsRawCapture().then(setRawSupported);
  }, []);

  const switchCamera = useCallback(() => {
    setFacing((f: CameraType) => {
      const next = f === 'back' ? 'front' : 'back';
      onFacingChange?.(next);
      return next;
    });
  }, [onFacingChange]);

  const toggleRawMode = useCallback(() => {
    setRawMode((v: boolean) => !v);
  }, []);

  const setSelectedMode = useCallback((mode: CameraMode) => {
    setSelectedModeState(mode);
    onModeChange?.(mode);
  }, [onModeChange]);

  const cycleTimerDuration = useCallback(async () => {
    const nextIdx = (TIMER_DURATIONS.indexOf(timerDuration) + 1) % TIMER_DURATIONS.length;
    const next = TIMER_DURATIONS[nextIdx];
    setTimerDuration(next);
    await saveAppSettings({ timerDuration: next });
  }, [timerDuration]);

  const permissionGranted = permission?.granted ?? false;

  return {
    facing,
    cameraReady,
    rawMode,
    rawSupported,
    selectedMode,
    permission,
    permissionGranted,
    requestPermission,
    setCameraReady,
    switchCamera,
    toggleRawMode,
    setSelectedMode,
    cycleTimerDuration,
    timerDuration,
    setTimerDuration,
  };
}
