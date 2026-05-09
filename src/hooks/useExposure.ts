import { useState, useCallback, useRef, useEffect } from 'react';
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

function readExposureFromCamera(cam: any) {
  const exposureCompensation =
    cam.exposureCompensation !== undefined && typeof cam.exposureCompensation === 'number'
      ? cam.exposureCompensation
      : 0;
  const minEC =
    cam.minExposureCompensation !== undefined && typeof cam.minExposureCompensation === 'number'
      ? cam.minExposureCompensation
      : -2;
  const maxEC =
    cam.maxExposureCompensation !== undefined && typeof cam.maxExposureCompensation === 'number'
      ? cam.maxExposureCompensation
      : 2;
  return { exposureCompensation, minEC, maxEC };
}

export function useExposure(cameraRef: React.RefObject<CameraView | null>): UseExposureResult {
  const mountedRef = useRef(true);
  const cameraRefStable = useRef(cameraRef);
  cameraRefStable.current = cameraRef;

  // Read initial values from camera synchronously so test renders see correct state
  const initial = cameraRef.current ? readExposureFromCamera(cameraRef.current) : null;

  const [exposureComp, setExposureComp] = useState(initial?.exposureCompensation ?? 0);
  const [minEC, setMinEC] = useState(initial?.minEC ?? -2);
  const [maxEC, setMaxEC] = useState(initial?.maxEC ?? 2);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const poll = useCallback(() => {
    if (!mountedRef.current) return;
    const cam = cameraRefStable.current?.current as any;
    if (!cam) return;

    const { exposureCompensation, minEC: m, maxEC: mx } = readExposureFromCamera(cam);
    setExposureComp(exposureCompensation);
    setMinEC(m);
    setMaxEC(mx);
  }, []);

  useAnimationFrameTimer({
    intervalMs: EXPOSURE_POLL_INTERVAL_MS,
    onTick: poll,
    enabled: true,
  });

  const setExposureCompensation = useCallback(
    async (value: number) => {
      const cam = cameraRef.current as any;
      if (!cam) return;

      setIsAdjusting(true);
      try {
        if (typeof cam.setExposureCompensation === 'function') {
          await cam.setExposureCompensation(value);
        }
        setExposureComp(value);
      } finally {
        setIsAdjusting(false);
      }
    },
    [cameraRef]
  );

  return {
    exposureComp,
    minEC,
    maxEC,
    setExposureCompensation,
    isAdjusting,
  };
}
