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
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      gridAccent: 'rgba(232,213,183,0.45)',
      bubbleBg: 'rgba(0,0,0,0.75)',
      bubbleText: '#fff',
      countdownBg: 'rgba(0,0,0,0.6)',
      countdownText: '#ffffff',
      overlayBg: 'rgba(0,0,0,0.55)',
      text: '#fff',
    },
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
      colors: {
        primary: '#000',
        accent: '#e8d5b7',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        gridAccent: 'rgba(232,213,183,0.45)',
        bubbleBg: 'rgba(0,0,0,0.75)',
        bubbleText: '#fff',
        countdownBg: 'rgba(0,0,0,0.6)',
        countdownText: '#ffffff',
        overlayBg: 'rgba(0,0,0,0.55)',
        text: '#fff',
      },
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
      colors: {
        primary: '#000',
        accent: '#e8d5b7',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        gridAccent: 'rgba(232,213,183,0.45)',
        bubbleBg: 'rgba(0,0,0,0.75)',
        bubbleText: '#fff',
        countdownBg: 'rgba(0,0,0,0.6)',
        countdownText: '#ffffff',
        overlayBg: 'rgba(0,0,0,0.55)',
        text: '#fff',
      },
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
      colors: {
        primary: '#fff',
        accent: '#b7a07a',
        success: '#16a34a',
        error: '#dc2626',
        warning: '#d97706',
        gridAccent: 'rgba(183,160,122,0.45)',
        bubbleBg: 'rgba(255,255,255,0.9)',
        bubbleText: '#000',
        countdownBg: 'rgba(0,0,0,0.6)',
        countdownText: '#ffffff',
        overlayBg: 'rgba(255,255,255,0.85)',
        text: '#000',
      },
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
      colors: {
        primary: '#fff',
        accent: '#b7a07a',
        success: '#16a34a',
        error: '#dc2626',
        warning: '#d97706',
        gridAccent: 'rgba(183,160,122,0.45)',
        bubbleBg: 'rgba(255,255,255,0.9)',
        bubbleText: '#000',
        countdownBg: 'rgba(0,0,0,0.6)',
        countdownText: '#ffffff',
        overlayBg: 'rgba(255,255,255,0.85)',
        text: '#000',
      },
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
