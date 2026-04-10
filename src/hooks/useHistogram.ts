import { useState, useCallback } from 'react';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { CameraView } from 'expo-camera';

const NUM_BINS = 16;

function sampleJpegBytes(base64: string): number[] {
  // Decode base64 to raw bytes, then sample DCT luminance coefficient bytes
  // from after the JPEG SOS marker (0xFF 0xDA). These bytes roughly correlate
  // with block-level luminance energy and give a usable coarse distribution.
  const raw = atob(base64);
  const bytes: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    bytes.push(raw.charCodeAt(i) & 0xFF);
  }

  // Find SOS segment start to skip JPEG header/metadata
  let dataStart = bytes.length;
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xDA) {
      dataStart = i + 2;
      break;
    }
  }

  // Sample ~512 evenly-spaced bytes from the compressed data region
  const step = Math.max(1, Math.floor((bytes.length - dataStart) / 512));
  const samples: number[] = [];
  for (let i = dataStart; i < bytes.length; i += step) {
    samples.push(bytes[i]);
  }
  return samples;
}

function buildHistogram(samples: number[]): number[] {
  const hist = new Array(NUM_BINS).fill(0);
  for (const s of samples) {
    const bin = Math.min(NUM_BINS - 1, Math.floor((s / 256) * NUM_BINS));
    hist[bin]++;
  }
  const max = Math.max(...hist, 0.001);
  return hist.map(v => v / max);
}

function expandTo256(hist16: number[]): number[] {
  // Expand 16-bin histogram to 256-element array for HistogramOverlay compatibility
  const result = new Array(256).fill(0);
  for (let bin = 0; bin < NUM_BINS; bin++) {
    for (let i = 0; i < 16; i++) {
      result[bin * 16 + i] = hist16[bin];
    }
  }
  return result;
}

interface UseHistogramOptions {
  autoCaptureInterval?: number; // ms between auto captures (0 = manual only)
}

interface UseHistogramResult {
  histogramData: number[];
  isCapturing: boolean;
  capture: (cameraRef: React.RefObject<CameraView | null>) => Promise<number[] | null>;
}

export function useHistogram(_options?: UseHistogramOptions): UseHistogramResult {
  const [data, setData] = useState<number[]>(new Array(256).fill(0));
  const [isCapturing, setIsCapturing] = useState(false);

  const capture = useCallback(
    async (cameraRef: React.RefObject<CameraView | null>): Promise<number[] | null> => {
      if (!cameraRef?.current) return data;
      setIsCapturing(true);
      try {
        const pic = await cameraRef.current.takePictureAsync({
          quality: 0.1,
          skipProcessing: true,
        });
        if (!pic?.uri) return data;

        const resized = await manipulateAsync(
          pic.uri,
          [{ resize: { width: 64, height: 64 } }],
          { compress: 0.3, format: SaveFormat.JPEG }
        );

        const base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' });
        if (!base64 || base64.length < 100) return data;

        const samples = sampleJpegBytes(base64);
        const hist16 = buildHistogram(samples);
        const hist256 = expandTo256(hist16);
        setData(hist256);
        return hist256;
      } catch {
        return data;
      } finally {
        setIsCapturing(false);
      }
    },
    [data]
  );

  return { histogramData: data, isCapturing, capture };
}
