import { validateSettings, DEFAULT_SETTINGS } from '../services/settings';

describe('validateSettings', () => {
  describe('valid full settings', () => {
    it('passes through correctly', () => {
      const fullSettings = {
        voiceEnabled: true,
        theme: 'light',
        timerDuration: 10,
        defaultGridVariant: 'golden',
        showHistogram: true,
        showLevel: false,
        showFocusPeaking: true,
        showSunPosition: true,
        showFocusGuide: false,
        showBubbleChat: false,
        showShakeDetector: true,
        showKeypoints: true,
        showRawMode: true,
        showEV: true,
        showPinchToZoom: false,
        imageQualityPreset: 'quality',
        focusPeakingColor: '#00FF00',
        focusPeakingSensitivity: 'high' as const,
        shakeDetectorSensitivity: 'high' as const,
      };
      expect(validateSettings(fullSettings)).toEqual(fullSettings);
    });
  });

  describe('empty object', () => {
    it('returns DEFAULT_SETTINGS', () => {
      expect(validateSettings({})).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('partial valid settings', () => {
    it('fills in missing with defaults', () => {
      const partial = { theme: 'light' as const, timerDuration: 10 as const };
      const result = validateSettings(partial);
      expect(result.theme).toBe('light');
      expect(result.timerDuration).toBe(10);
      expect(result.voiceEnabled).toBe(DEFAULT_SETTINGS.voiceEnabled);
      expect(result.defaultGridVariant).toBe(DEFAULT_SETTINGS.defaultGridVariant);
    });
  });

  describe('invalid timerDuration', () => {
    it('falls back to default 3 for invalid numbers', () => {
      expect(validateSettings({ timerDuration: 7 }).timerDuration).toBe(3);
    });
    it('falls back to default 3 for strings', () => {
      expect(validateSettings({ timerDuration: 'abc' as unknown }).timerDuration).toBe(3);
    });
    it('falls back to default 3 for null', () => {
      expect(validateSettings({ timerDuration: null }).timerDuration).toBe(3);
    });
    it('falls back to default 3 for undefined', () => {
      expect(validateSettings({ timerDuration: undefined }).timerDuration).toBe(3);
    });
    it('keeps valid values 3, 5, 10', () => {
      expect(validateSettings({ timerDuration: 3 }).timerDuration).toBe(3);
      expect(validateSettings({ timerDuration: 5 }).timerDuration).toBe(5);
      expect(validateSettings({ timerDuration: 10 }).timerDuration).toBe(10);
    });
  });

  describe('invalid theme', () => {
    it('falls back to dark for invalid strings', () => {
      expect(validateSettings({ theme: 'blue' }).theme).toBe('dark');
    });
    it('falls back to dark for numbers', () => {
      expect(validateSettings({ theme: 123 as unknown }).theme).toBe('dark');
    });
    it('falls back to dark for null', () => {
      expect(validateSettings({ theme: null }).theme).toBe('dark');
    });
    it('keeps valid values dark and light', () => {
      expect(validateSettings({ theme: 'dark' }).theme).toBe('dark');
      expect(validateSettings({ theme: 'light' }).theme).toBe('light');
    });
  });

  describe('invalid GridVariant', () => {
    it('falls back to thirds for invalid strings', () => {
      expect(validateSettings({ defaultGridVariant: 'square' }).defaultGridVariant).toBe('thirds');
    });
    it('falls back to thirds for numbers', () => {
      expect(validateSettings({ defaultGridVariant: 42 as unknown }).defaultGridVariant).toBe('thirds');
    });
    it('keeps valid values', () => {
      const variants = ['thirds', 'golden', 'diagonal', 'spiral', 'none'] as const;
      variants.forEach(v => {
        expect(validateSettings({ defaultGridVariant: v }).defaultGridVariant).toBe(v);
      });
    });
  });

  describe('extra unknown fields', () => {
    it('are ignored without causing errors', () => {
      const result = validateSettings({
        theme: 'light',
        unknownField: 'should be ignored',
        anotherBad: { nested: true },
        andArray: [1, 2, 3],
      });
      expect(result.theme).toBe('light');
      // Should not throw
    });
  });

  describe('completely invalid JSON-equivalent data', () => {
    it('returns DEFAULT_SETTINGS for null', () => {
      expect(validateSettings(null)).toEqual(DEFAULT_SETTINGS);
    });
    it('returns DEFAULT_SETTINGS for undefined', () => {
      expect(validateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    });
    it('returns DEFAULT_SETTINGS for strings', () => {
      expect(validateSettings('not an object' as unknown)).toEqual(DEFAULT_SETTINGS);
    });
    it('returns DEFAULT_SETTINGS for numbers', () => {
      expect(validateSettings(123 as unknown)).toEqual(DEFAULT_SETTINGS);
    });
    it('returns DEFAULT_SETTINGS for arrays', () => {
      expect(validateSettings([1, 2, 3] as unknown)).toEqual(DEFAULT_SETTINGS);
    });
    it('returns DEFAULT_SETTINGS for booleans', () => {
      expect(validateSettings(true as unknown)).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('boolean coercion', () => {
    it('coerces true boolean correctly', () => {
      expect(validateSettings({ showHistogram: true }).showHistogram).toBe(true);
    });
    it('coerces false boolean correctly', () => {
      expect(validateSettings({ showHistogram: false }).showHistogram).toBe(false);
    });
    it('coerces truthy strings to true', () => {
      expect(validateSettings({ showHistogram: 'yes' as unknown }).showHistogram).toBe(true);
    });
    it('coerces 0 to false (falsy number)', () => {
      expect(validateSettings({ showHistogram: 0 as unknown }).showHistogram).toBe(false);
    });
    it('coerces null to false', () => {
      expect(validateSettings({ showHistogram: null }).showHistogram).toBe(false);
    });
    it('coerces undefined to false', () => {
      expect(validateSettings({ showHistogram: undefined }).showHistogram).toBe(false);
    });
  });

  describe('imageQualityPreset validation', () => {
    it('falls back to balanced for invalid values', () => {
      expect(validateSettings({ imageQualityPreset: 'ultra' }).imageQualityPreset).toBe('balanced');
    });
    it('keeps valid values', () => {
      const presets = ['size', 'balanced', 'quality'] as const;
      presets.forEach(p => {
        expect(validateSettings({ imageQualityPreset: p }).imageQualityPreset).toBe(p);
      });
    });
  });

  describe('focusPeakingColor validation', () => {
    it('falls back to default for invalid hex', () => {
      expect(validateSettings({ focusPeakingColor: '#GGGGGG' }).focusPeakingColor).toBe('#FF4444');
    });
    it('falls back to default for non-hex strings', () => {
      expect(validateSettings({ focusPeakingColor: 'red' }).focusPeakingColor).toBe('#FF4444');
    });
    it('keeps valid 6-char hex colors', () => {
      expect(validateSettings({ focusPeakingColor: '#00FF00' }).focusPeakingColor).toBe('#00FF00');
      expect(validateSettings({ focusPeakingColor: '#aabbcc' }).focusPeakingColor).toBe('#aabbcc');
    });
    it('rejects short hex', () => {
      expect(validateSettings({ focusPeakingColor: '#FF44' }).focusPeakingColor).toBe('#FF4444');
    });
  });

  describe('focusPeakingSensitivity validation', () => {
    it('falls back to medium for invalid values', () => {
      expect(validateSettings({ focusPeakingSensitivity: 'ultra' }).focusPeakingSensitivity).toBe('medium');
    });
    it('keeps valid values', () => {
      const values = ['low', 'medium', 'high'] as const;
      values.forEach(v => {
        expect(validateSettings({ focusPeakingSensitivity: v }).focusPeakingSensitivity).toBe(v);
      });
    });
  });

  describe('shakeDetectorSensitivity validation', () => {
    it('falls back to medium for invalid values', () => {
      expect(validateSettings({ shakeDetectorSensitivity: 'ultra' }).shakeDetectorSensitivity).toBe('medium');
      expect(validateSettings({ shakeDetectorSensitivity: 123 as unknown }).shakeDetectorSensitivity).toBe('medium');
      expect(validateSettings({ shakeDetectorSensitivity: null }).shakeDetectorSensitivity).toBe('medium');
    });
    it('keeps valid values', () => {
      const values = ['low', 'medium', 'high'] as const;
      values.forEach(v => {
        expect(validateSettings({ shakeDetectorSensitivity: v }).shakeDetectorSensitivity).toBe(v);
      });
    });
    it('is included in full settings pass-through', () => {
      const full = { shakeDetectorSensitivity: 'high' as const };
      expect(validateSettings(full).shakeDetectorSensitivity).toBe('high');
    });
  });
});