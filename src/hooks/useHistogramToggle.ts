import { useState, useRef, useCallback, useEffect } from 'react';
import { CameraView } from 'expo-camera';
import { useHistogram } from './useHistogram';

export function useHistogramToggle(
  cameraRef: React.RefObject<CameraView | null>,
  initialShowHistogram = false,
) {
  const { histogramData, capture: captureHistogram } = useHistogram();
  const histogramTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHistogram, setShowHistogram] = useState(initialShowHistogram);

  const handleHistogramToggle = useCallback(async () => {
    if (showHistogram) {
      setShowHistogram(false);
      return;
    }
    await captureHistogram(cameraRef);
    setShowHistogram(true);
    if (histogramTimerRef.current) clearTimeout(histogramTimerRef.current);
    histogramTimerRef.current = setTimeout(() => {
      setShowHistogram(false);
    }, 5000);
  }, [showHistogram, captureHistogram]);

  const handleHistogramPressIn = useCallback(async () => {
    if (histogramTimerRef.current) clearTimeout(histogramTimerRef.current);
    await captureHistogram(cameraRef);
    setShowHistogram(true);
  }, [captureHistogram]);

  const handleHistogramPressOut = useCallback(() => {
    if (histogramTimerRef.current) clearTimeout(histogramTimerRef.current);
    histogramTimerRef.current = setTimeout(() => {
      setShowHistogram(false);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (histogramTimerRef.current) clearTimeout(histogramTimerRef.current);
    };
  }, []);

  return {
    showHistogram,
    histogramData,
    handleHistogramToggle,
    handleHistogramPressIn,
    handleHistogramPressOut,
  };
}
