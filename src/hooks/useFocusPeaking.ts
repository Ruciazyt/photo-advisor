/**
 * useFocusPeaking — edge peak detection hook
 *
 * Captures frames from the camera, runs a lightweight Sobel-like edge
 * detection on the luminance channel, and returns a set of screen-space
 * points where high-frequency (in-focus) content was detected.
 *
 * Designed for manual-focus scenarios: the peaking overlay helps the user
 * identify which parts of the scene have sharp edges (i.e., are in focus).
 */

import { useCallback } from 'react';
import { CameraView } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';

// ---- Exported for testing ----
export { SAMPLE_SIZE, EDGE_THRESHOLD, MAX_PEAKS, samplePixels };

// ---- Public interface ----

// Re-export from centralized types for backward compatibility
export type { PeakPoint, UseFocusPeakingReturn } from '../types';

// Import PeakPoint for internal use in the hook implementation
import type { PeakPoint, UseFocusPeakingReturn } from '../types';

const SAMPLE_SIZE = 48; // Capture at this resolution for edge analysis
const EDGE_THRESHOLD = 30; // Minimum gradient magnitude to count as a peak
const MAX_PEAKS = 80; // Cap the number of returned points

function computeLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Decode a resized JPEG image to a grayscale luminance array.
 * Uses jpeg-js for accurate luminance extraction from actual decoded pixel data,
 * then converts to luminance using the standard Rec. 601 formula.
 */
async function samplePixels(
  uri: string,
  size: number
): Promise<{ pixels: Uint8Array; width: number; height: number }> {
  // Read JPEG as base64
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  if (!base64 || base64.length < 100) {
    return { pixels: new Uint8Array(0), width: 0, height: 0 };
  }

  // Decode base64 to raw bytes
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i) & 0xff;
  }

  // Decode JPEG to RGBA pixel data
  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    decoded = jpeg.decode(bytes);
  } catch {
    return { pixels: new Uint8Array(0), width: 0, height: 0 };
  }

  const { width, height, data } = decoded;
  const pixelCount = width * height;

  // Convert RGBA to luminance using Rec. 601: Y = 0.299R + 0.587G + 0.114B
  const pixelData = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    pixelData[i] = computeLuminance(r, g, b);
  }

  return { pixels: pixelData, width, height };
}

/**
 * Run a Sobel-like edge detection on the luminance map.
 * Returns a normalised gradient magnitude map (0-1).
 */
export function sobelMagnitudes(lum: number[][], width: number, height: number): number[][] {
  const mag: number[][] = [];
  for (let y = 0; y < height; y++) {
    mag[y] = [];
    for (let x = 0; x < width; x++) {
      const tl = lum[Math.max(0, y - 1)]?.[Math.max(0, x - 1)] ?? lum[y][x];
      const tc = lum[Math.max(0, y - 1)]?.[x] ?? lum[y][x];
      const tr = lum[Math.max(0, y - 1)]?.[Math.min(width - 1, x + 1)] ?? lum[y][x];
      const ml = lum[y]?.[Math.max(0, x - 1)] ?? lum[y][x];
      const mr = lum[y]?.[Math.min(width - 1, x + 1)] ?? lum[y][x];
      const bl = lum[Math.min(height - 1, y + 1)]?.[Math.max(0, x - 1)] ?? lum[y][x];
      const bc = lum[Math.min(height - 1, y + 1)]?.[x] ?? lum[y][x];
      const br = lum[Math.min(height - 1, y + 1)]?.[Math.min(width - 1, x + 1)] ?? lum[y][x];

      // Sobel kernels
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const m = Math.sqrt(gx * gx + gy * gy);
      mag[y][x] = Math.min(255, m);
    }
  }
  return mag;
}

/**
 * Cluster Sobel magnitudes into peak points.
 * Returns screen-normalised peak coordinates sorted by strength descending.
 * Performance: O(n) max scan + O(peaks log peaks) sort — avoids spread-based Math.max
 * on 2304 elements every frame.
 */
export function extractPeaks(mag: number[][], width: number, height: number): PeakPoint[] {
  // Find raw max without array spread (avoids O(n) allocation + O(n) spread args)
  let rawMax = 1;
  for (let y = 0; y < height; y++) {
    const row = mag[y];
    for (let x = 0; x < width; x++) {
      const v = row[x];
      if (v > rawMax) rawMax = v;
    }
  }

  const peaks: PeakPoint[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const v = mag[y][x];
      if (v < EDGE_THRESHOLD) continue;

      // Inline non-maximum suppression — avoid spread + Math.max on neighbours array
      const v0 = mag[y - 1][x - 1];
      const v1_ = mag[y - 1][x];
      const v2 = mag[y - 1][x + 1];
      const v3 = mag[y][x - 1];
      const v4 = mag[y][x + 1];
      const v5 = mag[y + 1][x - 1];
      const v6 = mag[y + 1][x];
      const v7 = mag[y + 1][x + 1];
      const maxNeighbour = v0 > v1_ ? v0 : v1_;
      const mx2 = v2 > maxNeighbour ? v2 : maxNeighbour;
      const mx3 = v3 > mx2 ? v3 : mx2;
      const mx4 = v4 > mx3 ? v4 : mx3;
      const mx5 = v5 > mx4 ? v5 : mx4;
      const mx6 = v6 > mx5 ? v6 : mx5;
      const mx7 = v7 > mx6 ? v7 : mx6;
      if (v < mx7) continue;

      peaks.push({
        x: x / width,
        y: y / height,
        strength: v / rawMax,
      });
    }
  }

  // Sort by strength descending and cap at MAX_PEAKS
  peaks.sort((a, b) => b.strength - a.strength);
  return peaks.length > MAX_PEAKS ? peaks.slice(0, MAX_PEAKS) : peaks;
}

export function useFocusPeaking(): UseFocusPeakingReturn {
  const capturePeaks = useCallback(
    async (
      cameraRef: React.RefObject<CameraView | null>,
      previewWidth: number,
      previewHeight: number
    ): Promise<PeakPoint[]> => {
      if (!cameraRef.current) return [];

      try {
        // Capture a small frame for analysis
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.1,
          skipProcessing: true,
        });
        if (!photo?.uri) return [];

        const resized = await manipulateAsync(
          photo.uri,
          [{ resize: { width: SAMPLE_SIZE, height: SAMPLE_SIZE } }],
          { compress: 0.3, format: SaveFormat.JPEG }
        );

        const { pixels, width, height } = await samplePixels(resized.uri, SAMPLE_SIZE);
        if (!pixels || pixels.length === 0) return [];

        // Build luminance 2D array
        const lum: number[][] = [];
        for (let y = 0; y < height; y++) {
          lum.push([]);
          for (let x = 0; x < width; x++) {
            lum[y].push(pixels[y * width + x]);
          }
        }

        const mag = sobelMagnitudes(lum, width, height);
        const peaks = extractPeaks(mag, width, height);

        // Map to screen coordinates (flip y because camera frame is top-down,
        // but screen coordinates have y=0 at top — already consistent)
        return peaks.map(p => ({
          x: p.x,
          y: p.y,
          strength: p.strength,
        }));
      } catch {
        return [];
      }
    },
    []
  );

  return { capturePeaks };
}
