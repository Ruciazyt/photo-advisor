/**
 * Tests for RecordingIndicator component
 */

import React from 'react';
import { beforeEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { RecordingIndicator } from '../components/RecordingIndicator';
import { useTheme } from '../contexts/ThemeContext';

// Mock Reanimated v4 (local mock avoids native worklets initialization error)
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Mock ThemeContext
const fullDarkColors = {
  primary: '#000',
  accent: '#e8d5b7',
  cardBg: '#1A1A1A',
  text: '#fff',
  textSecondary: '#888888',
  border: '#333333',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  background: '#000000',
  sunColor: '#FFB800',
  blueHourColor: '#6B93D6',
  gridAccent: 'rgba(232,213,183,0.45)',
  countdownBg: 'rgba(0,0,0,0.6)',
  countdownBorder: 'rgba(255,255,255,0.4)',
  countdownText: '#ffffff',
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
  modeSelectorBg: 'rgba(0,0,0,0.4)',
  modeSelectorUnselected: 'rgba(255,255,255,0.7)',
  overlayBg: 'rgba(0,0,0,0.55)',
  topBarBg: 'rgba(0,0,0,0.55)',
  topBarText: '#FFFFFF',
  topBarTextSecondary: 'rgba(255,255,255,0.6)',
  topBarBorderInactive: 'rgba(255,255,255,0.15)',
  topBarBorderActive: 'rgba(255,255,255,0.3)',
  topBarSelectorBgActive: 'rgba(232,213,183,0.35)',
  topBarSelectorBorderActive: 'rgba(232,213,183,0.6)',
  bubbleBg: 'rgba(0,0,0,0.75)',
  bubbleText: '#fff',
  timerActiveBg: 'rgba(255,82,82,0.6)',
  timerActiveBorder: 'rgba(255,255,255,0.3)',
  timerPreviewBg: 'rgba(0,0,0,0.5)',
  timerBorder: 'rgba(255,255,255,0.25)',
  timerUnitText: 'rgba(255,255,255,0.5)',
  challengeActiveBg: 'rgba(255,215,0,0.15)',
  challengeActiveBorder: 'rgba(255,215,0,0.6)',
  challengeActiveText: '#FFD700',
  rawActiveBg: 'rgba(0,200,100,0.2)',
  rawActiveBorder: 'rgba(0,200,100,0.6)',
  rawActiveText: '#00C864',
  focusGuideActiveBg: 'rgba(255,220,0,0.15)',
  focusGuideActiveBorder: 'rgba(255,220,0,0.5)',
  focusGuideActiveText: '#FFDC00',
  voiceActiveBg: 'rgba(232,213,183,0.2)',
  burstIndicatorBg: 'rgba(255,215,0,0.85)',
  burstIndicatorText: '#000000',
  burstSuggestionBg: 'rgba(20,16,8,0.92)',
  burstSuggestionBorder: 'rgba(255,215,0,0.35)',
  histogramBg: 'rgba(0,0,0,0.65)',
  histogramBorder: 'rgba(255,255,255,0.12)',
  sunPanelBg: '#1A1A1A',
  sunPanelBorder: 'rgba(255,255,255,0.1)',
  sunCompassBg: 'rgba(0,0,0,0.3)',
  sunCompassText: 'rgba(255,255,255,0.5)',
  sunCompassCenter: 'rgba(255,255,255,0.3)',
  sunToggleActiveBg: 'rgba(255,184,0,0.15)',
  sunToggleActiveBorder: 'rgba(255,184,0,0.5)',
  toastBg: 'rgba(255,107,138,0.9)',
  favoriteIcon: '#FF6B8A',
  shareButtonBg: 'rgba(0,0,0,0.55)',
  shareButtonBorder: 'rgba(255,255,255,0.15)',
  shareButtonDisabledText: 'rgba(255,255,255,0.3)',
  drawerBg: '#1A1A1A',
  drawerHandle: '#666666',
  drawerTextSecondary: '#999999',
  gridCardDisabledText: '#AAAAAA',
  sparkleColors: ['#FFD700', '#C0C0C0', '#FF69B4', '#87CEEB', '#98FB98'],
  starGreen: '#8BC34A',
  starYellow: '#FFC107',
  starOrange: '#FF9800',
};

const fullLightColors = {
  primary: '#fff',
  accent: '#b7a07a',
  cardBg: '#F5F5F5',
  text: '#000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
  background: '#FAFAFA',
  sunColor: '#E69500',
  blueHourColor: '#5B8BD4',
  gridAccent: 'rgba(183,160,122,0.45)',
  countdownBg: 'rgba(0,0,0,0.6)',
  countdownBorder: 'rgba(0,0,0,0.2)',
  countdownText: '#ffffff',
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
  modeSelectorBg: 'rgba(0,0,0,0.15)',
  modeSelectorUnselected: 'rgba(0,0,0,0.6)',
  overlayBg: 'rgba(255,255,255,0.85)',
  topBarBg: 'rgba(0,0,0,0.35)',
  topBarText: '#1A1A1A',
  topBarTextSecondary: 'rgba(0,0,0,0.6)',
  topBarBorderInactive: 'rgba(0,0,0,0.15)',
  topBarBorderActive: 'rgba(0,0,0,0.3)',
  topBarSelectorBgActive: 'rgba(196,163,90,0.35)',
  topBarSelectorBorderActive: 'rgba(196,163,90,0.6)',
  bubbleBg: 'rgba(0,0,0,0.1)',
  bubbleText: '#1A1A1A',
  timerActiveBg: 'rgba(255,82,82,0.6)',
  timerActiveBorder: 'rgba(0,0,0,0.3)',
  timerPreviewBg: 'rgba(0,0,0,0.15)',
  timerBorder: 'rgba(0,0,0,0.2)',
  timerUnitText: 'rgba(0,0,0,0.5)',
  challengeActiveBg: 'rgba(255,215,0,0.15)',
  challengeActiveBorder: 'rgba(255,215,0,0.6)',
  challengeActiveText: '#E5A500',
  rawActiveBg: 'rgba(0,200,100,0.2)',
  rawActiveBorder: 'rgba(0,200,100,0.6)',
  rawActiveText: '#00A050',
  focusGuideActiveBg: 'rgba(255,220,0,0.15)',
  focusGuideActiveBorder: 'rgba(255,220,0,0.5)',
  focusGuideActiveText: '#D4A500',
  voiceActiveBg: 'rgba(196,163,90,0.2)',
  burstIndicatorBg: 'rgba(255,215,0,0.85)',
  burstIndicatorText: '#000000',
  burstSuggestionBg: 'rgba(250,245,230,0.97)',
  burstSuggestionBorder: 'rgba(200,160,80,0.4)',
  histogramBg: 'rgba(255,255,255,0.97)',
  histogramBorder: 'rgba(0,0,0,0.12)',
  sunPanelBg: '#F5F5F5',
  sunPanelBorder: 'rgba(0,0,0,0.1)',
  sunCompassBg: 'rgba(255,255,255,0.9)',
  sunCompassText: 'rgba(0,0,0,0.5)',
  sunCompassCenter: 'rgba(0,0,0,0.3)',
  sunToggleActiveBg: 'rgba(255,184,0,0.15)',
  sunToggleActiveBorder: 'rgba(255,184,0,0.5)',
  toastBg: 'rgba(255,107,138,0.9)',
  favoriteIcon: '#E85A7A',
  shareButtonBg: 'rgba(0,0,0,0.55)',
  shareButtonBorder: 'rgba(255,255,255,0.15)',
  shareButtonDisabledText: 'rgba(255,255,255,0.3)',
  drawerBg: '#F5F5F5',
  drawerHandle: '#CCCCCC',
  drawerTextSecondary: '#AAAAAA',
  gridCardDisabledText: '#AAAAAA',
  sparkleColors: ['#FFD700', '#C0C0C0', '#FF69B4', '#87CEEB', '#98FB98'],
  starGreen: '#7CB342',
  starYellow: '#F9A825',
  starOrange: '#FB8C00',
};

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: fullDarkColors,
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

describe('RecordingIndicator', () => {
  let mockUseTheme: jest.MockedFunction<typeof useTheme>;

  beforeEach(() => {
    mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
  });

  it('uses overlayBg from theme for container background when theme is dark', () => {
    mockUseTheme.mockReturnValueOnce({
      theme: 'dark',
      colors: fullDarkColors,
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    });
    const { toJSON } = render(
      <RecordingIndicator isRecording={true} durationSeconds={10} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('rgba(0,0,0,0.55)');
  });

  it('uses text color from theme for REC and timer text when theme is dark', () => {
    mockUseTheme.mockReturnValueOnce({
      theme: 'dark',
      colors: fullDarkColors,
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    });
    const { getByText } = render(
      <RecordingIndicator isRecording={true} durationSeconds={10} />
    );
    const recText = getByText('REC');
    expect(recText).toBeTruthy();
    expect(JSON.stringify(recText.props.style)).toContain('#fff');
  });

  it('uses overlayBg from theme for container background when theme is light', () => {
    mockUseTheme.mockReturnValueOnce({
      theme: 'light',
      colors: fullLightColors,
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    });
    const { toJSON } = render(
      <RecordingIndicator isRecording={true} durationSeconds={10} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('rgba(255,255,255,0.85)');
  });

  it('uses text color from theme for REC and timer text when theme is light', () => {
    mockUseTheme.mockReturnValueOnce({
      theme: 'light',
      colors: fullLightColors,
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    });
    const { getByText } = render(
      <RecordingIndicator isRecording={true} durationSeconds={10} />
    );
    const recText = getByText('REC');
    expect(recText).toBeTruthy();
    expect(JSON.stringify(recText.props.style)).toContain('#000');
  });

  it('renders nothing when isRecording is false', () => {
    const { toJSON } = render(
      <RecordingIndicator isRecording={false} durationSeconds={0} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the REC badge when isRecording is true', () => {
    const { getByText } = render(
      <RecordingIndicator isRecording={true} durationSeconds={0} />
    );
    expect(getByText('REC')).toBeTruthy();
  });

  it('renders the red dot emoji', () => {
    const { getByText } = render(
      <RecordingIndicator isRecording={true} durationSeconds={0} />
    );
    expect(getByText('🔴')).toBeTruthy();
  });

  it('formats duration 0 as 00:00', () => {
    const { getByText } = render(
      <RecordingIndicator isRecording={true} durationSeconds={0} />
    );
    expect(getByText('00:00')).toBeTruthy();
  });

  it('formats duration 32 seconds as 00:32', () => {
    const { getByText } = render(
      <RecordingIndicator isRecording={true} durationSeconds={32} />
    );
    expect(getByText('00:32')).toBeTruthy();
  });

  it('formats duration 90 seconds as 01:30', () => {
    const { getByText } = render(
      <RecordingIndicator isRecording={true} durationSeconds={90} />
    );
    expect(getByText('01:30')).toBeTruthy();
  });

  it('formats duration 600 seconds as 10:00', () => {
    const { getByText } = render(
      <RecordingIndicator isRecording={true} durationSeconds={600} />
    );
    expect(getByText('10:00')).toBeTruthy();
  });

  it('re-renders correctly when duration changes', () => {
    const { getByText, rerender } = render(
      <RecordingIndicator isRecording={true} durationSeconds={5} />
    );
    expect(getByText('00:05')).toBeTruthy();

    rerender(<RecordingIndicator isRecording={true} durationSeconds={10} />);
    expect(getByText('00:10')).toBeTruthy();
  });

  it('shows nothing when switching from recording to not recording', () => {
    const { getByText, toJSON, rerender } = render(
      <RecordingIndicator isRecording={true} durationSeconds={30} />
    );
    expect(getByText('REC')).toBeTruthy();

    rerender(<RecordingIndicator isRecording={false} durationSeconds={30} />);
    expect(toJSON()).toBeNull();
  });

  it('has pointerEvents=none so it does not block camera touches', () => {
    const { toJSON } = render(
      <RecordingIndicator isRecording={true} durationSeconds={10} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('pointerEvents');
    expect(json).toContain('none');
  });

  it('renders with absolute positioning style', () => {
    const { toJSON } = render(
      <RecordingIndicator isRecording={true} durationSeconds={10} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('position');
    expect(json).toContain('absolute');
  });
});
