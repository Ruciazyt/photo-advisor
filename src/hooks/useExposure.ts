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

function readExposureFromCamera(cam: any) {
  return {
    exposureCompensation:
      cam.exposureCompensation !== undefined &&
      typeof cam.exposureCompensation === 'number' &&
      Number.isFinite(cam.exposureCompensation)
        ? cam.exposureCompensation
        : 0,
    minEC:
      cam.minExposureCompensation !== undefined &&
      typeof cam.minExposureCompensation === 'number' &&
      Number.isFinite(cam.minExposureCompensation)
        ? cam.minExposureCompensation
        : -2,
    maxEC:
      cam.maxExposureCompensation !== undefined &&
      typeof cam.maxExposureCompensation === 'number' &&
      Number.isFinite(cam.maxExposureCompensation)
        ? cam.maxExposureCompensation
        : 2,
  };
}

export function useExposure(cameraRef: React.RefObject<CameraView | null>): UseExposureResult {
  const [exposureComp, setExposureComp] = useState(() => {
    const cam = cameraRef?.current as any;
    return cam ? readExposureFromCamera(cam).exposureCompensation : 0;
  });
  const [minEC, setMinEC] = useState(() => {
    const cam = cameraRef?.current as any;
    return cam ? readExposureFromCamera(cam).minEC : -2;
  });
  const [maxEC, setMaxEC] = useState(() => {
    const cam = cameraRef?.current as any;
    return cam ? readExposureFromCamera(cam).maxEC : 2;
  });
  const [isAdjusting, setIsAdjusting] = useState(false);
  const mountedRef = useRef(true);
  const cameraRefStable = useRef(cameraRef);
  cameraRefStable.current = cameraRef;

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
          setExposureComp(value);
        }
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
