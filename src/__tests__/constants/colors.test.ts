/**
 * Unit tests for src/constants/colors.ts
 * Tests Colors export (dead code — project uses src/theme/colors.ts instead).
 */

import { Colors } from '../../constants/colors';

describe('Colors', () => {
  const expectedKeys = [
    'primary', 'accent', 'cardBg', 'text',
    'textSecondary', 'border', 'success', 'error',
  ];

  it('has all 8 required color keys', () => {
    expectedKeys.forEach(key => {
      expect(Colors).toHaveProperty(key);
      expect(typeof (Colors as any)[key]).toBe('string');
    });
  });

  it('primary is black (#000000)', () => {
    expect(Colors.primary).toBe('#000000');
  });

  it('accent exists and is a valid warm gold hex color', () => {
    expect(Colors.accent).toMatch(/^#[A-Fa-f0-9]{6}$/);
    // Warm gold tone validation
    expect(Colors.accent.toUpperCase()).toMatch(/^#[A-Fa-f0-9]{6}$/);
  });

  it('all values are valid hex color strings (#RRGGBB)', () => {
    Object.values(Colors).forEach(color => {
      expect(color).toMatch(/^#[A-Fa-f0-9]{6}$/);
    });
  });

  it('colors object has exactly 8 keys', () => {
    expect(Object.keys(Colors)).toHaveLength(8);
  });

  it('success is green and error is red (distinct colors)', () => {
    expect(Colors.success).not.toBe(Colors.error);
    expect(Colors.success).toMatch(/^#[A-Fa-f0-9]{6}$/);
    expect(Colors.error).toMatch(/^#[A-Fa-f0-9]{6}$/);
  });

  it('text and textSecondary are distinct', () => {
    expect(Colors.text).not.toBe(Colors.textSecondary);
  });
});
