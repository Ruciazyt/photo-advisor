import React from 'react';
import { render } from '@testing-library/react-native';
import { RecordingIndicator } from '../RecordingIndicator';

// Theme mock
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      overlayBg: 'rgba(0,0,0,0.6)',
      text: '#ffffff',
    },
  }),
}));

describe('RecordingIndicator', () => {
  it('renders null when isRecording is false', () => {
    const { toJSON } = render(<RecordingIndicator isRecording={false} durationSeconds={0} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the badge when isRecording is true', () => {
    const { getByText } = render(<RecordingIndicator isRecording={true} durationSeconds={32} />);
    expect(getByText('🔴')).toBeTruthy();
    expect(getByText('REC')).toBeTruthy();
  });

  it('formats duration as MM:SS', () => {
    const { getByText } = render(<RecordingIndicator isRecording={true} durationSeconds={32} />);
    expect(getByText('00:32')).toBeTruthy();
  });

  it('formats zero-padded minutes and seconds', () => {
    const { getByText } = render(<RecordingIndicator isRecording={true} durationSeconds={65} />);
    expect(getByText('01:05')).toBeTruthy();
  });

  it('formats large durations correctly', () => {
    const { getByText } = render(<RecordingIndicator isRecording={true} durationSeconds={3661} />);
    // 3661s = 61min 1sec
    expect(getByText('61:01')).toBeTruthy();
  });

  it('formats midnight boundary correctly', () => {
    const { getByText } = render(<RecordingIndicator isRecording={true} durationSeconds={3600} />);
    // 3600s = 60min 0sec
    expect(getByText('60:00')).toBeTruthy();
  });
});
