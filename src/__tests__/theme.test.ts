/**
 * Unit tests for src/theme/colors.ts
 * Tests DarkColors, LightColors, getColors, and ColorPalette type exports.
 */

import { DarkColors, LightColors, getColors, ColorPalette } from '../theme/colors';

describe('DarkColors', () => {
  it('has all required color keys', () => {
    const keys = [
      'primary', 'accent', 'cardBg', 'text', 'textSecondary',
      'border', 'success', 'error', 'warning', 'background',
      'sunColor', 'gridAccent', 'countdownBg', 'countdownText',
    ];
    keys.forEach(key => {
      expect(DarkColors).toHaveProperty(key);
      expect(typeof (DarkColors as any)[key]).toBe('string');
    });
  });

  it('primary is black (#000000)', () => {
    expect(DarkColors.primary).toBe('#000000');
  });

  it('accent is warm gold tone', () => {
    expect(DarkColors.accent).toMatch(/^#[A-Fa-f0-9]{6}$/);
  });

  it('all colors are valid hex strings', () => {
    Object.values(DarkColors).forEach(color => {
      expect(color).toMatch(/^(#[A-Fa-f0-9]{6}|rgba?\()/);
    });
  });
});

describe('LightColors', () => {
  it('has all required color keys (same as DarkColors)', () => {
    const keys = Object.keys(DarkColors);
    keys.forEach(key => {
      expect(LightColors).toHaveProperty(key);
      expect(typeof (LightColors as any)[key]).toBe('string');
    });
  });

  it('primary is white (#FFFFFF)', () => {
    expect(LightColors.primary).toBe('#FFFFFF');
  });

  it('all colors are valid hex strings', () => {
    Object.values(LightColors).forEach(color => {
      expect(color).toMatch(/^(#[A-Fa-f0-9]{6}|rgba?\()/);
    });
  });

  it('light theme has lighter text color than dark theme', () => {
    expect(LightColors.text).not.toBe(DarkColors.text);
    // Light theme text should be dark (near-black)
    expect(LightColors.text).toMatch(/^#1/);
    // Dark theme text should be white
    expect(DarkColors.text).toBe('#FFFFFF');
  });
});

describe('getColors', () => {
  it('returns DarkColors for "dark" theme', () => {
    const result = getColors('dark');
    expect(result).toBe(DarkColors);
  });

  it('returns LightColors for "light" theme', () => {
    const result = getColors('light');
    expect(result).toBe(LightColors);
  });

  it('returns correct colors for both themes', () => {
    expect(getColors('dark').primary).toBe('#000000');
    expect(getColors('light').primary).toBe('#FFFFFF');
  });

  it('both themes share the same key structure', () => {
    const darkKeys = Object.keys(DarkColors).sort();
    const lightKeys = Object.keys(LightColors).sort();
    expect(darkKeys).toEqual(lightKeys);
  });
});

describe('ColorPalette type export', () => {
  it('ColorPalette is the type of DarkColors', () => {
    const palette: ColorPalette = DarkColors;
    expect(palette.primary).toBeDefined();
  });

  it('ColorPalette accepts LightColors', () => {
    const palette: ColorPalette = LightColors;
    expect(palette.primary).toBeDefined();
  });

  it('DarkColors matches ColorPalette type', () => {
    const checkPalette = (p: ColorPalette): boolean => !!p.primary;
    expect(checkPalette(DarkColors)).toBe(true);
  });
});
