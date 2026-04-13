export const DarkColors = {
  primary: '#000000',
  accent: '#E8D5B7',
  cardBg: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#888888',
  border: '#333333',
  success: '#4CAF50',
  error: '#FF5252',
  background: '#000000',
  sunColor: '#FFB800',
  gridAccent: 'rgba(232,213,183,0.35)',
  countdownBg: 'rgba(232,213,183,0.9)',
  countdownText: '#000000',
};

export const LightColors = {
  primary: '#FFFFFF',
  accent: '#C4A35A',
  cardBg: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  success: '#4CAF50',
  error: '#FF5252',
  background: '#FAFAFA',
  sunColor: '#E69500',
  gridAccent: 'rgba(180,140,80,0.4)',
  countdownBg: 'rgba(200,160,100,0.9)',
  countdownText: '#000000',
};

export type ColorPalette = typeof DarkColors;

export function getColors(theme: 'dark' | 'light'): ColorPalette {
  return theme === 'dark' ? DarkColors : LightColors;
}
