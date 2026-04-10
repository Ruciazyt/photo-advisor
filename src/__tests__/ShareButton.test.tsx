/**
 * Tests for src/components/ShareButton.tsx
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ShareButton } from '../components/ShareButton';

// Mock the share service
jest.mock('../services/share', () => ({
  sharePhoto: jest.fn(),
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

  it('renders the share button', () => {
    const { getByText } = render(<ShareButton {...defaultProps} />);
    expect(getByText('分享')).toBeTruthy();
  });

  it('does not call sharePhoto when photoUri is empty', () => {
    const { getByText } = render(<ShareButton {...defaultProps} photoUri="" />);
    fireEvent.press(getByText('分享'));
    expect(mockSharePhoto).not.toHaveBeenCalled();
  });

  it('calls sharePhoto with correct options when pressed', async () => {
    const { getByText } = render(<ShareButton {...defaultProps} />);
    fireEvent.press(getByText('分享'));

    await waitFor(() => {
      expect(mockSharePhoto).toHaveBeenCalledWith({
        photoUri: 'file:///test/photo.jpg',
        suggestions: ['[左上] 将主体放在左侧三分线附近', '[右下] 留出空间平衡画面'],
        gridType: '三分法',
        score: 85,
        gridVariant: 'thirds',
      });
    });
  });

  it('does not share again while already sharing', () => {
    // When sharing is in progress, pressing again should be ignored
    // (button is disabled and shows '分享中')
    mockSharePhoto.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
    );
    const { getByText, queryByText } = render(<ShareButton {...defaultProps} />);
    fireEvent.press(getByText('分享'));
    // While sharing, the button shows '分享中' instead of '分享'
    expect(queryByText('分享')).toBeNull();
    expect(getByText('分享中')).toBeTruthy();
    expect(mockSharePhoto).toHaveBeenCalledTimes(1);
  });

  it('shows error toast when share fails', async () => {
    mockSharePhoto.mockResolvedValue({ success: false, error: '分享失败' });
    const { getByText, findByText } = render(<ShareButton {...defaultProps} />);
    fireEvent.press(getByText('分享'));

    // Toast should eventually show分享失败
    const toast = await findByText('分享失败', {}, { timeout: 3000 });
    expect(toast).toBeTruthy();
  });

  it('passes score and gridVariant to sharePhoto', async () => {
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
});
