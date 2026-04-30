/**
 * Tests for RecordingIndicator component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { RecordingIndicator } from '../components/RecordingIndicator';

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
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

describe('RecordingIndicator', () => {
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
