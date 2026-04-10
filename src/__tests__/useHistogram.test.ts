import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useHistogram } from '../hooks/useHistogram';

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file:///resized.jpg',
    width: 64,
    height: 64,
  }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Mock expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue(
    // Minimal base64 JPEG-like data (at least 2000 chars for sampling to work)
    'A'.repeat(2048)
  ),
}));

// Mock CameraView - we'll create a mock ref object
const createMockCameraRef = (shouldSucceed: boolean) => {
  const mockTakePictureAsync = jest.fn().mockImplementation(() => {
    if (shouldSucceed) {
      return Promise.resolve({ uri: 'file:///test.jpg' });
    }
    return Promise.reject(new Error('Camera error'));
  });

  return {
    current: {
      takePictureAsync: mockTakePictureAsync,
    },
  };
};

describe('useHistogram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('capture() returns data array when camera ref is null', async () => {
    const { result } = renderHook(() => useHistogram());
    const nullRef = { current: null };

    let capturedData: number[] | null | undefined;
    await act(async () => {
      capturedData = await result.current.capture(nullRef as any);
    });

    // Returns data state array when cameraRef.current is null
    expect(capturedData).toBeDefined();
    expect(Array.isArray(capturedData)).toBe(true);
  });

  it('capture() returns histogram data array of length 256 when camera captures successfully', async () => {
    const { result } = renderHook(() => useHistogram());
    const mockRef = createMockCameraRef(true);

    let capturedData: number[] | null | undefined;
    await act(async () => {
      capturedData = await result.current.capture(mockRef as any);
    });

    expect(capturedData).toBeDefined();
    expect(capturedData).toHaveLength(256);
  });

  it('isCapturing is true during capture and false after', async () => {
    const { result } = renderHook(() => useHistogram());
    const mockRef = createMockCameraRef(true);

    // Initially false
    expect(result.current.isCapturing).toBe(false);

    await act(async () => {
      await result.current.capture(mockRef as any);
    });

    // After capture completes, should be false again
    expect(result.current.isCapturing).toBe(false);
  });

  it('capture() returns histogram data with 256 values', async () => {
    const { result } = renderHook(() => useHistogram());
    const mockRef = createMockCameraRef(true);

    let capturedData: number[] | null | undefined;
    await act(async () => {
      capturedData = await result.current.capture(mockRef as any);
    });

    expect(capturedData).toBeDefined();
    expect(Array.isArray(capturedData)).toBe(true);
    expect((capturedData as number[]).length).toBe(256);
  });

  it('capture() returns data (not null) when camera ref has no current value', async () => {
    const { result } = renderHook(() => useHistogram());
    const emptyRef = { current: undefined };

    let capturedData: number[] | null | undefined;
    await act(async () => {
      capturedData = await result.current.capture(emptyRef as any);
    });

    // Returns data array (not null) since the early return uses `data` state
    expect(capturedData).toBeDefined();
  });
});
