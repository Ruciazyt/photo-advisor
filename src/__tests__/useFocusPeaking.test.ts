/**
 * Tests for useFocusPeaking edge detection logic
 */

import { sobelMagnitudes, extractPeaks, PeakPoint } from '../hooks/useFocusPeaking';

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
