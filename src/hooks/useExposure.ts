import { useState, useCallback, useRef } from 'react';
import type { CameraView } from 'expo-camera';
import { useAnimationFrameTimer } from './useAnimationFrameTimer';

const EXPOSURE_POLL_INTERVAL_MS = 500;

export interface UseExposureResult {
  exposureComp: number;
  minEC: number;
  maxEC: number;
  setExposureCompensation: (value: number) => Promise<void>;
  isAdjusting: boolean;
}

export function useExposure(cameraRef: React.RefObject<CameraView | null>): UseExposureResult {
  const [exposureComp, setExposureComp] = useState(0);
  const [minEC, setMinEC] = useState(-2);
  const [maxEC, setMaxEC] = useState(2);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const mountedRef = useRef(true);
  const cameraRefStable = useRef(cameraRef);
  cameraRefStable.current = cameraRef;

  const poll = useCallback(() => {
    if (!mountedRef.current) return;
    const cam = cameraRefStable.current?.current as any;
    if (!cam) return;

    if (cam.exposureCompensation !== undefined && typeof cam.exposureCompensation === 'number') {
      setExposureComp(cam.exposureCompensation);
    }
    if (cam.minExposureCompensation !== undefined && typeof cam.minExposureCompensation === 'number') {
      setMinEC(cam.minExposureCompensation);
    }
    if (cam.maxExposureCompensation !== undefined && typeof cam.maxExposureCompensation === 'number') {
      setMaxEC(cam.maxExposureCompensation);
    }
  }, []);

  useAnimationFrameTimer({
    intervalMs: EXPOSURE_POLL_INTERVAL_MS,
    onTick: poll,
    enabled: true,
  });

  const setExposureCompensation = useCallback(async (value: number) => {
    const cam = cameraRef.current as any;
    if (!cam) return;

    setIsAdjusting(true);
    try {
      if (typeof cam.setExposureCompensation === 'function') {
        await cam.setExposureCompensation(value);
        setExposureComp(value);
      }
    } finally {
      setIsAdjusting(false);
    }
  }, [cameraRef]);

  return {
    exposureComp,
    minEC,
    maxEC,
    setExposureCompensation,
    isAdjusting,
  };
}