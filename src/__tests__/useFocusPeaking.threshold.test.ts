import { computeAdaptiveThreshold } from '../hooks/useFocusPeaking';

// SENSITIVITY_OFFSET is not re-exported, so we reference it indirectly via the
// known formula: threshold = mean + offset * stdDev, where
// offset = { low: 1.5, medium: 1.0, high: 0.5 }
const SENSITIVITY_OFFSET: Record<'low' | 'medium' | 'high', number> = {
  low: 1.5,
  medium: 1.0,
  high: 0.5,
};

describe('computeAdaptiveThreshold', () => {
  describe('zero pixel count', () => {
    it('returns {0,0,0} when width is 0', () => {
      const result = computeAdaptiveThreshold(new Uint8Array(0), 0, 5, 'medium');
      expect(result).toEqual({ threshold: 0, stdDev: 0, mean: 0 });
    });

    it('returns {0,0,0} when height is 0', () => {
      const result = computeAdaptiveThreshold(new Uint8Array(0), 10, 0, 'medium');
      expect(result).toEqual({ threshold: 0, stdDev: 0, mean: 0 });
    });

    it('returns {0,0,0} when both dimensions are 0', () => {
      const result = computeAdaptiveThreshold(new Uint8Array(10), 0, 0, 'medium');
      expect(result).toEqual({ threshold: 0, stdDev: 0, mean: 0 });
    });
  });

  describe('flat image (all identical pixels)', () => {
    it('stdDev is 0 when all pixels are identical', () => {
      // All pixels = 128, so mean = 128, stdDev = 0, threshold = mean + offset*0 = mean
      const pixels = new Uint8Array(new Array(100).fill(128));
      const result = computeAdaptiveThreshold(pixels, 10, 10, 'medium');
      expect(result.mean).toBeCloseTo(128, 5);
      expect(result.stdDev).toBeCloseTo(0, 5);
      expect(result.threshold).toBeCloseTo(128, 5);
    });

    it('threshold equals mean for flat image at all sensitivity levels', () => {
      const pixels = new Uint8Array(new Array(50).fill(64));
      for (const sensitivity of ['low', 'medium', 'high'] as const) {
        const result = computeAdaptiveThreshold(pixels, 5, 10, sensitivity);
        expect(result.threshold).toBeCloseTo(64, 5);
      }
    });
  });

  describe('all-zero pixels', () => {
    it('returns mean=0, stdDev=0, threshold=0 regardless of sensitivity', () => {
      const pixels = new Uint8Array(25);
      for (const sensitivity of ['low', 'medium', 'high'] as const) {
        const result = computeAdaptiveThreshold(pixels, 5, 5, sensitivity);
        expect(result.mean).toBeCloseTo(0, 5);
        expect(result.stdDev).toBeCloseTo(0, 5);
        expect(result.threshold).toBeCloseTo(0, 5);
      }
    });
  });

  describe('sensitivity-specific thresholds', () => {
    it('applies correct offset for low sensitivity (1.5)', () => {
      // [100,100,100,100,110,110,110,110,90,90] → mean=102, stdDev=√22≈4.69
      // threshold = 102 + 1.5*stdDev
      const pixels = new Uint8Array([100, 100, 100, 100, 110, 110, 110, 110, 90, 90]);
      const result = computeAdaptiveThreshold(pixels, 5, 2, 'low');
      const expectedStdDev = SENSITIVITY_OFFSET.low * result.stdDev;
      expect(result.threshold).toBeCloseTo(result.mean + expectedStdDev, 5);
      expect(result.threshold).toBeCloseTo(result.mean + 1.5 * result.stdDev, 5);
    });

    it('applies correct offset for medium sensitivity (1.0)', () => {
      const pixels = new Uint8Array([100, 100, 100, 100, 110, 110, 110, 110, 90, 90]);
      const result = computeAdaptiveThreshold(pixels, 5, 2, 'medium');
      expect(result.threshold).toBeCloseTo(result.mean + result.stdDev, 5);
    });

    it('applies correct offset for high sensitivity (0.5)', () => {
      const pixels = new Uint8Array([100, 100, 100, 100, 110, 110, 110, 110, 90, 90]);
      const result = computeAdaptiveThreshold(pixels, 5, 2, 'high');
      expect(result.threshold).toBeCloseTo(result.mean + 0.5 * result.stdDev, 5);
    });

    it('lower sensitivity yields higher threshold', () => {
      const pixels = new Uint8Array([80, 80, 80, 80, 120, 120, 120, 120]);
      const low = computeAdaptiveThreshold(pixels, 4, 2, 'low');
      const med = computeAdaptiveThreshold(pixels, 4, 2, 'medium');
      const high = computeAdaptiveThreshold(pixels, 4, 2, 'high');
      expect(low.threshold).toBeGreaterThan(med.threshold);
      expect(med.threshold).toBeGreaterThan(high.threshold);
    });
  });

  describe('stdDev computation', () => {
    it('computes correct stdDev for known two-value distribution', () => {
      // 5 pixels of 0 and 5 pixels of 10
      // mean = (0*5 + 10*5) / 10 = 5
      // variance = ((0-5)^2*5 + (10-5)^2*5) / 10 = (25*5 + 25*5) / 10 = 250/10 = 25
      // stdDev = sqrt(25) = 5
      const pixels = new Uint8Array([0, 0, 0, 0, 0, 10, 10, 10, 10, 10]);
      const result = computeAdaptiveThreshold(pixels, 5, 2, 'medium');
      expect(result.mean).toBeCloseTo(5, 5);
      expect(result.stdDev).toBeCloseTo(5, 5);
      expect(result.threshold).toBeCloseTo(5 + 1.0 * 5, 5); // medium offset = 1.0
    });

    it('stdDev grows with pixel spread', () => {
      const narrow = new Uint8Array([45, 45, 55, 55, 45, 55, 45, 55]);
      const wide = new Uint8Array([0, 0, 0, 0, 100, 100, 100, 100]);
      const narrowResult = computeAdaptiveThreshold(narrow, 4, 2, 'medium');
      const wideResult = computeAdaptiveThreshold(wide, 4, 2, 'medium');
      expect(wideResult.stdDev).toBeGreaterThan(narrowResult.stdDev);
    });
  });
});
