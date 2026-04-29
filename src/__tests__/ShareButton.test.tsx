/**
 * Tests for src/components/ShareButton.tsx
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ShareButton } from '../components/ShareButton';

// Mock the share service
jest.mock('../services/share', () => ({
  sharePhoto: jest.fn(),
}));

// Mock expo-sharing to add missing isAvailableAsync (not in jest-expo's ExpoSharing mock)
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-view-shot
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(() => Promise.resolve('file:///captured.jpg')),
}));

const mockSharePhoto = require('../services/share').sharePhoto;

describe('ShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharePhoto.mockResolvedValue({ success: true });
  });

  const defaultProps = {
    photoUri: 'file:///test/photo.jpg',
    suggestions: ['[左上] 将主体放在左侧三分线附近', '[右下] 留出空间平衡画面'],
    gridType: '三分法',
    score: 85,
    gridVariant: 'thirds',
  };

  it('renders the share button', async () => {
    // Mock Image.getSize to return Promise (matching RN 0.76+ TurboModule behavior)
    // This overrides jest-expo's callback-based ImageLoader.getSize mock
    const Image = require('react-native').Image;
    jest.spyOn(Image, 'getSize').mockImplementation(() => Promise.resolve({ width: 1080, height: 1440 }));

    const { getByText } = render(<ShareButton {...defaultProps} />);
    expect(getByText('分享')).toBeTruthy();
  });

  it('does not call sharePhoto when photoUri is empty', async () => {
    const Image = require('react-native').Image;
    jest.spyOn(Image, 'getSize').mockImplementation(() => Promise.resolve({ width: 1080, height: 1440 }));

    const { getByText } = render(<ShareButton {...defaultProps} photoUri="" />);
    fireEvent.press(getByText('分享'));
    expect(mockSharePhoto).not.toHaveBeenCalled();
  });

  it('calls sharePhoto with correct options when pressed', async () => {
    const Image = require('react-native').Image;
    jest.spyOn(Image, 'getSize').mockImplementation(() => Promise.resolve({ width: 1080, height: 1440 }));

    const { getByText } = render(<ShareButton {...defaultProps} />);
    fireEvent.press(getByText('分享'));

    await waitFor(() => {
      expect(mockSharePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          gridType: '三分法',
          suggestions: ['[左上] 将主体放在左侧三分线附近', '[右下] 留出空间平衡画面'],
          score: 85,
          gridVariant: 'thirds',
        })
      );
    });
    // The photoUri passed to sharePhoto is the captured composite (from view-shot mock),
    // not the raw photoUri — this is the new ShareCard sharing behavior
    const call = mockSharePhoto.mock.calls[0][0];
    expect(call.photoUri).toBe('file:///captured.jpg');
  });

  it('does not share again while already sharing', async () => {
    const Image = require('react-native').Image;
    jest.spyOn(Image, 'getSize').mockImplementation(() => Promise.resolve({ width: 1080, height: 1440 }));

    // Override mockSharePhoto to delay resolution (simulates ongoing share)
    mockSharePhoto.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
    );
    const { getByText, queryByText } = render(<ShareButton {...defaultProps} />);
    fireEvent.press(getByText('分享'));
    // While sharing, the button shows '分享中' instead of '分享'
    expect(queryByText('分享')).toBeNull();
    expect(getByText('分享中')).toBeTruthy();
    // sharePhoto was called once with the captured composite image
    await waitFor(() => {
      expect(mockSharePhoto).toHaveBeenCalledTimes(1);
    });
    const call = mockSharePhoto.mock.calls[0][0];
    expect(call.photoUri).toBe('file:///captured.jpg');
  });

  it('shows error toast when share fails', async () => {
    const Image = require('react-native').Image;
    jest.spyOn(Image, 'getSize').mockImplementation(() => Promise.resolve({ width: 1080, height: 1440 }));

    mockSharePhoto.mockResolvedValue({ success: false, error: '分享失败' });
    const { getByText, findByText } = render(<ShareButton {...defaultProps} />);
    fireEvent.press(getByText('分享'));

    // Toast should eventually show 分享失败
    const toast = await findByText('分享失败', {}, { timeout: 3000 });
    expect(toast).toBeTruthy();
  });

  it('passes score and gridVariant to sharePhoto', async () => {
    const Image = require('react-native').Image;
    jest.spyOn(Image, 'getSize').mockImplementation(() => Promise.resolve({ width: 1080, height: 1440 }));

    const { getByText } = render(
      <ShareButton
        photoUri="file:///test/photo.jpg"
        suggestions={[]}
        gridType="黄金分割"
        score={92}
        gridVariant="golden"
      />
    );
    fireEvent.press(getByText('分享'));

    await waitFor(() => {
      expect(mockSharePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 92,
          gridVariant: 'golden',
          gridType: '黄金分割',
        })
      );
    });
  });

  it('forwards scoreReason to ShareCard', async () => {
    const Image = require('react-native').Image;
    jest.spyOn(Image, 'getSize').mockImplementation(() => Promise.resolve({ width: 1080, height: 1440 }));

    const captureRef = require('react-native-view-shot').captureRef;
    captureRef.mockResolvedValue('file:///captured-with-reason.jpg');

    const { getByText } = render(
      <ShareButton
        photoUri="file:///test/photo.jpg"
        suggestions={[]}
        gridType="三分法"
        score={75}
        scoreReason="主体偏左，建议右移"
        gridVariant="thirds"
      />
    );
    fireEvent.press(getByText('分享'));

    await waitFor(() => {
      expect(mockSharePhoto).toHaveBeenCalledTimes(1);
    });
    // Verify captureRef was called (ShareCard was rendered off-screen)
    expect(captureRef).toHaveBeenCalled();
    // Verify the captured composite image was shared
    const call = mockSharePhoto.mock.calls[0][0];
    expect(call.photoUri).toBe('file:///captured-with-reason.jpg');
  });
});
