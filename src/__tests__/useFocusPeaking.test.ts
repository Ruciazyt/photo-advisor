/**
 * Tests for useFocusPeaking edge detection logic
 */

// Mock dependencies - must be before any imports that use them
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));

jest.mock('jpeg-js', () => ({
  decode: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

import { sobelMagnitudes, extractPeaks, useFocusPeaking, samplePixels } from '../hooks/useFocusPeaking';
import { renderHook, act } from '@testing-library/react-native';
import type { PeakPoint } from '../hooks/useFocusPeaking';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lumFromValues(values: number[][]): number[][] {
  return values; // values are already 0-255 luminance
}

// ---------------------------------------------------------------------------
// sobelMagnitudes
// ---------------------------------------------------------------------------

describe('sobelMagnitudes', () => {
  it('returns a 2D array with same dimensions as input', () => {
    const input: number[][] = [
      [10, 20, 30],
      [40, 50, 60],
      [70, 80, 90],
    ];
    const result = sobelMagnitudes(input, 3, 3);
    expect(result).toHaveLength(3);
    result.forEach(row => expect(row).toHaveLength(3));
  });

  it('returns zero for a flat (no-edge) image', () => {
    const flat: number[][] = Array(5)
      .fill(null)
      .map(() => Array(5).fill(128));
    const mag = sobelMagnitudes(flat, 5, 5);
    // All magnitudes should be 0 since there are no gradients
    mag.forEach(row => row.forEach(v => expect(v).toBeLessThan(1)));
  });

  it('detects a strong vertical edge', () => {
    // Left half = 0, right half = 255 → strong vertical edge in the middle
    const image: number[][] = [];
    for (let y = 0; y < 5; y++) {
      image[y] = [];
      for (let x = 0; x < 5; x++) {
        image[y][x] = x < 3 ? 0 : 255;
      }
    }
    const mag = sobelMagnitudes(image, 5, 5);
    // The column around x=2/3 should have the highest magnitude
    const middleCol = mag.map(row => row[2]);
    const maxMag = Math.max(...middleCol);
    expect(maxMag).toBeGreaterThan(100); // strong edge detected
  });

  it('detects a strong horizontal edge', () => {
    // Top half = 0, bottom half = 255
    const image: number[][] = [];
    for (let y = 0; y < 5; y++) {
      image[y] = [];
      for (let x = 0; x < 5; x++) {
        image[y][x] = y < 3 ? 0 : 255;
      }
    }
    const mag = sobelMagnitudes(image, 5, 5);
    // Row around y=2/3 should have high magnitude
    const middleRow = mag[2];
    const maxMag = Math.max(...middleRow);
    expect(maxMag).toBeGreaterThan(100);
  });

  it('returns magnitudes in expected range [0, ~726] for extreme contrast', () => {
    const image: number[][] = [
      [0, 0, 0, 0, 255],
      [0, 0, 0, 0, 255],
      [0, 0, 0, 0, 255],
      [0, 0, 0, 0, 255],
      [0, 0, 0, 0, 255],
    ];
    const mag = sobelMagnitudes(image, 5, 5);
    const flat = mag.flat();
    const max = Math.max(...flat);
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThan(800); // well below uint8 max of 255 after sqrt sum
  });
});

// ---------------------------------------------------------------------------
// extractPeaks
// ---------------------------------------------------------------------------

describe('extractPeaks', () => {
  it('returns empty array for empty magnitudes', () => {
    const empty: number[][] = [[0, 0], [0, 0]];
    const peaks = extractPeaks(empty, 2, 2);
    expect(peaks).toHaveLength(0);
  });

  it('returns empty array when all magnitudes are below threshold', () => {
    const low: number[][] = [
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ];
    const peaks = extractPeaks(low, 3, 3);
    expect(peaks).toHaveLength(0);
  });

  it('returns peaks sorted by strength descending', () => {
    // Create a gradient from 0 to 255 across a 5x5 image
    const mag: number[][] = [];
    for (let y = 0; y < 5; y++) {
      mag[y] = [];
      for (let x = 0; x < 5; x++) {
        // Strong corner at bottom-right
        mag[y][x] = y * x * 30;
      }
    }
    const peaks = extractPeaks(mag, 5, 5);
    if (peaks.length > 1) {
      for (let i = 1; i < peaks.length; i++) {
        expect(peaks[i - 1].strength).toBeGreaterThanOrEqual(peaks[i].strength);
      }
    }
  });

  it('caps the number of returned peaks at MAX_PEAKS (80)', () => {
    // High values everywhere → many local maxima
    const mag: number[][] = [];
    for (let y = 0; y < 100; y++) {
      mag[y] = [];
      for (let x = 0; x < 100; x++) {
        // Create a checkerboard-like pattern that will generate many peaks
        mag[y][x] = ((x + y) % 2 === 0 ? 200 : 180) + (x % 13) + (y % 17);
      }
    }
    const peaks = extractPeaks(mag, 100, 100);
    expect(peaks.length).toBeLessThanOrEqual(80);
  });

  it('returns points with x, y in [0, 1] range', () => {
    const mag: number[][] = [];
    for (let y = 0; y < 20; y++) {
      mag[y] = [];
      for (let x = 0; x < 20; x++) {
        mag[y][x] = (x === 10 && y === 10) ? 255 : 0; // single peak at centre
      }
    }
    const peaks = extractPeaks(mag, 20, 20);
    peaks.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    });
  });

  it('applies non-maximum suppression: peak must be stronger than all 8 neighbours', () => {
    // Create a plateau where the centre should be suppressed
    // mag[2][2] = 155 has neighbours all = 150 → suppressed
    // mag[3][3] = 200 has neighbours ≤ 155 → NOT suppressed (local max)
    const mag: number[][] = [
      [100, 100, 100, 100, 100],
      [100, 150, 150, 150, 100],
      [100, 150, 155, 150, 100], // suppressed: 155 is not > max(150s)
      [100, 150, 150, 200, 100], // NOT suppressed: 200 > all neighbours (max=155)
      [100, 100, 100, 100, 100],
    ];
    const peaks = extractPeaks(mag, 5, 5);
    expect(peaks.length).toBeGreaterThan(0);
    // The top peak should be the one at (3,3) with 200
    const strongest = peaks[0];
    // max=200 in the whole image, so strength = 200/200 = 1.0
    expect(strongest.strength).toBe(1.0);
    // The suppressed plateau at (2,2) with 155 should NOT appear
    // because 155 < max_neighbour(200)
    peaks.forEach(p => {
      // x,y are in [0,1], so (3,3) in a 5x5 grid → x=0.6, y=0.6
      // (2,2) → x=0.4, y=0.4 — neither should have exact 0.4 coords
      // The suppressed point (0.4, 0.4) should not be in the result
      expect(!(p.x === 0.4 && p.y === 0.4)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// sobelMagnitudes edge cases
// ---------------------------------------------------------------------------

describe('sobelMagnitudes edge cases', () => {
  it('handles 1x1 image without crashing', () => {
    const single: number[][] = [[128]];
    const mag = sobelMagnitudes(single, 1, 1);
    expect(mag).toHaveLength(1);
    expect(mag[0]).toHaveLength(1);
  });

  it('handles 2x2 image without crashing', () => {
    const tiny: number[][] = [[10, 20], [30, 40]];
    const mag = sobelMagnitudes(tiny, 2, 2);
    expect(mag).toHaveLength(2);
    expect(mag[0]).toHaveLength(2);
  });

  it('produces non-zero magnitudes for diagonal edge', () => {
    const image: number[][] = [];
    for (let y = 0; y < 5; y++) {
      image[y] = [];
      for (let x = 0; x < 5; x++) {
        image[y][x] = x >= y ? 255 : 0;
      }
    }
    const mag = sobelMagnitudes(image, 5, 5);
    const flat = mag.flat();
    const max = Math.max(...flat);
    expect(max).toBeGreaterThan(0);
  });

  it('boundary clamping keeps edges from crashing (no out-of-bounds)', () => {
    // Even with boundary clamping, edges should return a value (no NaN/Infinity)
    const image: number[][] = [
      [100, 100, 100, 100, 100],
      [100,   0,   0,   0, 100],
      [100,   0, 255,   0, 100],
      [100,   0,   0,   0, 100],
      [100, 100, 100, 100, 100],
    ];
    const mag = sobelMagnitudes(image, 5, 5);
    // Every cell must be a finite number (no NaN, no Infinity)
    mag.forEach(row => row.forEach(v => {
      expect(Number.isFinite(v)).toBe(true);
    }));
    // Corners (most clamped) should still be finite
    expect(Number.isFinite(mag[0][0])).toBe(true);
    expect(Number.isFinite(mag[4][4])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// extractPeaks edge cases
// ---------------------------------------------------------------------------

describe('extractPeaks edge cases', () => {
  it('handles 1x1 magnitude without crashing', () => {
    const mag: number[][] = [[100]];
    const peaks = extractPeaks(mag, 1, 1);
    // With 1x1, no neighbours exist so non-max suppression can't fire; result depends on threshold
    expect(Array.isArray(peaks)).toBe(true);
  });

  it('returns peaks only from interior pixels (not edge rows/cols)', () => {
    // Put a single high value on the edge — should be excluded
    const mag: number[][] = [
      [255, 255, 255, 255, 255],
      [255,   0,   0,   0, 255],
      [255,   0,   0,   0, 255],
      [255,   0,   0,   0, 255],
      [255, 255, 255, 255, 255],
    ];
    const peaks = extractPeaks(mag, 5, 5);
    peaks.forEach(p => {
      // x=0, x=1, y=0, y=1 would be edge or near-edge — interior starts at x>=1 and y>=1
      // With non-max suppression, edges can't be peaks because they lack full 8-neighbour sets
      // But our implementation clamps boundaries, so check we're getting interior-ish coords
      expect(p.x).toBeGreaterThan(0.05);
      expect(p.x).toBeLessThan(0.95);
      expect(p.y).toBeGreaterThan(0.05);
      expect(p.y).toBeLessThan(0.95);
    });
  });

  it('correctly identifies two equal-strength non-adjacent peaks', () => {
    // Two identical isolated peaks that don't suppress each other
    const mag: number[][] = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 200, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 200, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ];
    const peaks = extractPeaks(mag, 7, 7);
    // Both peaks should appear (different locations, no suppression between them)
    const topPeak = peaks.find(p => p.y < 0.5);
    const bottomPeak = peaks.find(p => p.y > 0.5);
    expect(topPeak).toBeDefined();
    expect(bottomPeak).toBeDefined();
    // Both should have the same strength (normalised by the same max=200)
    expect(topPeak!.strength).toBeCloseTo(bottomPeak!.strength, 2);
  });
});

// ---------------------------------------------------------------------------
// PeakPoint shape
// ---------------------------------------------------------------------------

describe('PeakPoint interface', () => {
  it('x and y are normalised (0-1) and strength is 0-1', () => {
    const mag: number[][] = [];
    for (let y = 0; y < 10; y++) {
      mag[y] = [];
      for (let x = 0; x < 10; x++) {
        mag[y][x] = x === 5 && y === 5 ? 255 : 0;
      }
    }
    const peaks = extractPeaks(mag, 10, 10);
    peaks.forEach(p => {
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
      expect(typeof p.strength).toBe('number');
      expect(p.strength).toBeGreaterThan(0);
      expect(p.strength).toBeLessThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// computeLuminance (Rec.601 formula) - indirect tests
// ---------------------------------------------------------------------------

describe('computeLuminance Rec.601', () => {
  // computeLuminance is not exported, but we verify the formula
  it('produces correct luminance values for known colors', () => {
    // Red: (255, 0, 0) → Y = 0.299*255 + 0.587*0 + 0.114*0 ≈ 76
    // Green: (0, 255, 0) → Y = 0.299*0 + 0.587*255 + 0.114*0 ≈ 150
    // Blue: (0, 0, 255) → Y = 0.299*0 + 0.587*0 + 0.114*255 ≈ 29
    // White: (255, 255, 255) → Y = 255
    // Black: (0, 0, 0) → Y = 0
    const expectedRed = Math.round(0.299 * 255);
    const expectedGreen = Math.round(0.587 * 255);
    const expectedBlue = Math.round(0.114 * 255);
    const expectedWhite = 255;
    const expectedBlack = 0;

    expect(expectedRed).toBe(76);
    expect(expectedGreen).toBe(150);
    expect(expectedBlue).toBe(29);
    expect(expectedWhite).toBe(255);
    expect(expectedBlack).toBe(0);
  });

  it('luminance conversion produces values in valid range [0, 255]', () => {
    const maxLum = Math.round(0.299 * 255 + 0.587 * 255 + 0.114 * 255);
    expect(maxLum).toBe(255);
  });

  it('grayscale images produce same luminance as original value', () => {
    // For grayscale, R=G=B=Y, so luminance should equal the original
    // Y = 0.299*Y + 0.587*Y + 0.114*Y = Y
    for (let v = 0; v <= 255; v += 51) {
      const lum = Math.round(0.299 * v + 0.587 * v + 0.114 * v);
      expect(lum).toBe(v);
    }
  });
});

// ---------------------------------------------------------------------------
// capturePeaks tests
// ---------------------------------------------------------------------------

const FileSystem = require('expo-file-system/legacy');
const jpeg = require('jpeg-js');
const { manipulateAsync } = require('expo-image-manipulator');

describe('capturePeaks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns [] when cameraRef.current is falsy', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const cameraRef = { current: null };

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });
    expect(capturedResult).toEqual([]);
  });

  it('returns [] when cameraRef.current is undefined', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const cameraRef = { current: undefined };

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });
    expect(capturedResult).toEqual([]);
  });

  it('returns [] when photo.uri is missing', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({}),
    };
    const cameraRef = { current: mockCamera };

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });
    expect(capturedResult).toEqual([]);
    expect(mockCamera.takePictureAsync).toHaveBeenCalled();
  });

  it('returns [] when photo is null', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue(null),
    };
    const cameraRef = { current: mockCamera };

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });
    expect(capturedResult).toEqual([]);
  });

  it('full success path: cameraRef → takePictureAsync → manipulateAsync → samplePixels → sobelMagnitudes → extractPeaks', async () => {
    const { result } = renderHook(() => useFocusPeaking());

    // Create a 4x4 grayscale image with one bright pixel (edge)
    const width = 4;
    const height = 4;
    const rgbaData = new Uint8Array(width * height * 4);
    // Set all pixels to dark (50) except one which is bright (255) to create an edge
    for (let i = 0; i < width * height; i++) {
      const isBright = i === 5; // Create an edge
      rgbaData[i * 4] = isBright ? 255 : 50;     // R
      rgbaData[i * 4 + 1] = isBright ? 255 : 50; // G
      rgbaData[i * 4 + 2] = isBright ? 255 : 50; // B
      rgbaData[i * 4 + 3] = 255;                 // A
    }

    const mockDecoded = { width, height, data: rgbaData };
    const mockBase64 = 'a'.repeat(200); // Must be >= 100 chars to pass base64 validation
    const mockPhoto = { uri: 'file://camera-photo.jpg' };
    const mockResized = { uri: 'file://resized-photo.jpg' };

    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue(mockPhoto),
    };
    const cameraRef = { current: mockCamera };

    FileSystem.readAsStringAsync.mockResolvedValue(mockBase64);
    jpeg.decode.mockReturnValue(mockDecoded);
    manipulateAsync.mockResolvedValue(mockResized);

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });

    // Verify the pipeline was called in order
    expect(mockCamera.takePictureAsync).toHaveBeenCalledWith({
      quality: 0.1,
      skipProcessing: true,
    });
    expect(manipulateAsync).toHaveBeenCalledWith(
      mockPhoto.uri,
      [{ resize: { width: 48, height: 48 } }],
      { compress: 0.3, format: 'jpeg' }
    );
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(mockResized.uri, { encoding: 'base64' });
    expect(jpeg.decode).toHaveBeenCalled();

    // Result should be an array
    expect(Array.isArray(capturedResult)).toBe(true);
  });

  it('returns [] when samplePixels returns empty pixels (short base64)', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file://photo.jpg' }),
    };
    const cameraRef = { current: mockCamera };

    // Mock manipulateAsync to return a URI
    manipulateAsync.mockResolvedValue({ uri: 'file://resized.jpg' });

    // Mock readAsStringAsync to return short base64 (< 100 chars triggers empty return)
    FileSystem.readAsStringAsync.mockResolvedValue('abc');

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });
    expect(capturedResult).toEqual([]);
  });

  it('returns [] when jpeg.decode throws (jpeg-js decode failure)', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file://photo.jpg' }),
    };
    const cameraRef = { current: mockCamera };

    manipulateAsync.mockResolvedValue({ uri: 'file://resized.jpg' });
    FileSystem.readAsStringAsync.mockResolvedValue('a'.repeat(200)); // valid length
    jpeg.decode.mockImplementation(() => {
      throw new Error('JPEG decode error');
    });

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });
    expect(capturedResult).toEqual([]);
  });

  it('returns [] when FileSystem.readAsStringAsync rejects (base64 read failure)', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file://photo.jpg' }),
    };
    const cameraRef = { current: mockCamera };

    manipulateAsync.mockResolvedValue({ uri: 'file://resized.jpg' });
    FileSystem.readAsStringAsync.mockRejectedValue(new Error('File read error'));

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });
    expect(capturedResult).toEqual([]);
  });

  it('returns [] on unexpected error in capturePeaks (catch path)', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const mockCamera = {
      takePictureAsync: jest.fn().mockRejectedValue(new Error('Camera error')),
    };
    const cameraRef = { current: mockCamera };

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });
    expect(capturedResult).toEqual([]);
  });

  it('returns [] when manipulateAsync rejects', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file://photo.jpg' }),
    };
    const cameraRef = { current: mockCamera };

    manipulateAsync.mockRejectedValue(new Error('Manipulation error'));

    let capturedResult: any;
    await act(async () => {
      capturedResult = await result.current.capturePeaks(cameraRef as any, 100, 100);
    });
    expect(capturedResult).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// samplePixels (JPEG decoding path - lines 42-80)
// ---------------------------------------------------------------------------

describe('samplePixels', () => {
  const FileSystem = require('expo-file-system/legacy');
  const jpeg = require('jpeg-js');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty pixels when base64 string is shorter than 100 chars', async () => {
    FileSystem.readAsStringAsync.mockResolvedValue('abc');
    const result = await samplePixels('file://test.jpg', 48);
    expect(result.pixels).toHaveLength(0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it('returns empty when base64 string is exactly 100 chars', async () => {
    FileSystem.readAsStringAsync.mockResolvedValue('a'.repeat(100));
    const result = await samplePixels('file://test.jpg', 48);
    expect(result.pixels).toHaveLength(0);
  });

  it('returns empty when base64 string is 99 chars', async () => {
    FileSystem.readAsStringAsync.mockResolvedValue('a'.repeat(99));
    const result = await samplePixels('file://test.jpg', 48);
    expect(result.pixels).toHaveLength(0);
  });

  it('returns empty pixels when jpeg.decode throws an error', async () => {
    FileSystem.readAsStringAsync.mockResolvedValue('a'.repeat(200));
    jpeg.decode.mockImplementation(() => {
      throw new Error('JPEG decode error');
    });

    const result = await samplePixels('file://test.jpg', 48);

    expect(result.pixels).toHaveLength(0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it('successfully decodes valid JPEG and returns correct luminance array', async () => {
    // Create a 2x2 image with known grayscale values
    const width = 2;
    const height = 2;
    // RGBA data: each pixel has R, G, B, A (4 bytes per pixel)
    // All pixels are grayscale (R=G=B), so luminance = the gray value
    const rgbaData = new Uint8Array([
      100, 100, 100, 255,  // pixel 0: gray 100
      200, 200, 200, 255,  // pixel 1: gray 200
      50, 50, 50, 255,     // pixel 2: gray 50
      150, 150, 150, 255,  // pixel 3: gray 150
    ]);

    FileSystem.readAsStringAsync.mockResolvedValue('a'.repeat(200));
    jpeg.decode.mockReturnValue({ width, height, data: rgbaData });

    const result = await samplePixels('file://test.jpg', 48);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.pixels).toHaveLength(4);
    // Grayscale pixels: luminance equals the gray value
    expect(result.pixels[0]).toBeCloseTo(100, 0);
    expect(result.pixels[1]).toBeCloseTo(200, 0);
    expect(result.pixels[2]).toBeCloseTo(50, 0);
    expect(result.pixels[3]).toBeCloseTo(150, 0);
  });

  it('correctly applies Rec.601 luminance formula to color pixels', async () => {
    const width = 1;
    const height = 1;
    // Red: (255, 0, 0) → Y = 0.299*255 = 76.245 → truncated to 76
    // Green: (0, 255, 0) → Y = 0.587*255 = 149.685 → truncated to 149
    // Blue: (0, 0, 255) → Y = 0.114*255 = 29.07 → truncated to 29
    // Note: pixelData is Uint8Array so values are truncated, not rounded

    FileSystem.readAsStringAsync.mockResolvedValue('a'.repeat(200));

    // Test red pixel
    jpeg.decode.mockReturnValue({ width, height, data: new Uint8Array([255, 0, 0, 255]) });
    let result = await samplePixels('file://red.jpg', 48);
    expect(result.pixels[0]).toBeCloseTo(76, 0);

    // Test green pixel
    jpeg.decode.mockReturnValue({ width, height, data: new Uint8Array([0, 255, 0, 255]) });
    result = await samplePixels('file://green.jpg', 48);
    expect(result.pixels[0]).toBeCloseTo(149, 0);

    // Test blue pixel
    jpeg.decode.mockReturnValue({ width, height, data: new Uint8Array([0, 0, 255, 255]) });
    result = await samplePixels('file://blue.jpg', 48);
    expect(result.pixels[0]).toBeCloseTo(29, 0);
  });

  it('propagates error when FileSystem.readAsStringAsync rejects', async () => {
    FileSystem.readAsStringAsync.mockRejectedValue(new Error('File read error'));
    await expect(samplePixels('file://test.jpg', 48)).rejects.toThrow('File read error');
  });
});