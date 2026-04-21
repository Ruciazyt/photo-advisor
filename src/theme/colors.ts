export const DarkColors = {
  primary: '#000000',
  accent: '#E8D5B7',
  cardBg: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#888888',
  border: '#333333',
  success: '#4CAF50',
  error: '#FF5252',
  warning: '#F59E0B',
  background: '#000000',
  sunColor: '#FFB800',
  gridAccent: 'rgba(232,213,183,0.35)',
  countdownBg: 'rgba(232,213,183,0.9)',
  countdownText: '#000000',
  // Composition score overlay
  scoreS: '#FFD700',
  scoreA: '#C0C0C0',
  scoreB: '#CD7F32',
  scoreC: '#8B7355',
  scoreD: '#555555',
  scoreOverlayBg: 'rgba(0,0,0,0.65)',
  scoreHintText: 'rgba(255,255,255,0.4)',
  scoreCardBg: 'rgba(28,28,28,0.95)',
  scoreCardBorder: 'rgba(255,255,255,0.1)',
  scoreLabelText: 'rgba(255,255,255,0.6)',
  scoreBarBg: 'rgba(255,255,255,0.1)',
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
  warning: '#D97706',
  background: '#FAFAFA',
  sunColor: '#E69500',
  gridAccent: 'rgba(180,140,80,0.4)',
  countdownBg: 'rgba(200,160,100,0.9)',
  countdownText: '#000000',
  // Composition score overlay
  scoreS: '#E5A500',
  scoreA: '#9E9E9E',
  scoreB: '#B87333',
  scoreC: '#7A6A55',
  scoreD: '#444444',
  scoreOverlayBg: 'rgba(0,0,0,0.45)',
  scoreHintText: 'rgba(0,0,0,0.35)',
  scoreCardBg: 'rgba(250,250,250,0.97)',
  scoreCardBorder: 'rgba(0,0,0,0.1)',
  scoreLabelText: 'rgba(0,0,0,0.55)',
  scoreBarBg: 'rgba(0,0,0,0.08)',
};

export type ColorPalette = typeof DarkColors;

export function getColors(theme: 'dark' | 'light'): ColorPalette {
  return theme === 'dark' ? DarkColors : LightColors;
}
