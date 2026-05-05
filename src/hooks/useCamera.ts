import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { CameraView } from 'expo-camera';
import { CameraType, useCameraPermissions } from 'expo-camera';
import type { PermissionResponse } from 'expo-modules-core';
import { CameraMode } from '../types';
import type { TimerDuration } from '../types';
import { supportsRawCapture } from './useCameraCapture';
import { saveAppSettings } from '../services/settings';

const TIMER_DURATIONS: TimerDuration[] = [3, 5, 10];

export interface UseCameraOptions {
  /** Initial camera mode (default: 'photo') */
  initialMode?: CameraMode;
  /** Initial RAW mode state (default: false) */
  initialRawMode?: boolean;
  /** Callback when facing changes */
  onFacingChange?: (facing: CameraType) => void;
  /** Callback when mode changes */
  onModeChange?: (mode: CameraMode) => void;
  /** Callback when a setting toggle changes */
  onSettingChange?: (key: string, value: boolean) => void;
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
  permission: PermissionResponse | null;
  /** Whether camera permission is granted */
  permissionGranted: boolean;
  /** Request camera permission */
  requestPermission: () => Promise<PermissionResponse>;
  /** Set camera ready state */
  setCameraReady: (v: boolean) => void;
  /** Switch between front and back camera */
  switchCamera: () => void;
  /** Toggle RAW mode on/off */
  toggleRawMode: () => Promise<void>;
  /** Set the selected camera mode */
  setSelectedMode: (mode: CameraMode) => void;
  /** Cycle to the next timer duration */
  cycleTimerDuration: () => Promise<void>;
  /** Current timer duration */
  timerDuration: TimerDuration;
  /** Set the timer duration directly */
  setTimerDuration: (d: TimerDuration) => void;
  /** Camera hardware mode ('picture' or 'video') */
  mode: 'picture' | 'video';
  /** Ref to the CameraView instance */
  cameraRef: React.RefObject<CameraView | null>;
  /** Whether video recording is in progress */
  isRecording: boolean;
  /** Start video recording */
  startRecording: () => Promise<void>;
  /** Stop video recording */
  stopRecording: () => Promise<void>;
}

export function useCamera({
  initialMode = 'photo',
  initialRawMode = false,
  onFacingChange,
  onModeChange,
  onSettingChange,
}: UseCameraOptions = {}): UseCameraReturn {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [rawMode, setRawMode] = useState(initialRawMode);
  const [rawSupported, setRawSupported] = useState(false);
  const [selectedMode, setSelectedModeState] = useState<CameraMode>(initialMode);
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(3);
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Compute hardware mode from selectedMode
  const mode: 'picture' | 'video' = selectedMode === 'video' ? 'video' : 'picture';

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;
    setIsRecording(true);
    try {
      await cameraRef.current.recordAsync();
    } finally {
      setIsRecording(false);
    }
  }, [isRecording]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;
    cameraRef.current.stopRecording();
    setIsRecording(false);
  }, [isRecording]);

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

  const toggleRawMode = useCallback(async () => {
    const next = !rawMode;
    setRawMode(next);
    await saveAppSettings({ showRawMode: next });
    onSettingChange?.('showRawMode', next);
  }, [rawMode, onSettingChange]);

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
    mode,
    cameraRef,
    isRecording,
    startRecording,
    stopRecording,
  };
}
