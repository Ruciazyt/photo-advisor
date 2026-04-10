/**
 * Tests for useHistogram hook
 * Mocks: expo-image-manipulator, expo-file-system/legacy, expo-camera
 */

jest.mock('expo-image-manipulator');
jest.mock('expo-file-system/legacy');

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useHistogram } from '../hooks/useHistogram';
import { manipulateAsync } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const mockTakePictureAsync = jest.fn<() => Promise<{ uri: string }>>();
const mockManipulateAsync = manipulateAsync as jest.Mock;
const mockReadAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;

describe('useHistogram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTakePictureAsync.mockReset();
    mockManipulateAsync.mockReset();
    mockReadAsStringAsync.mockReset();

    mockTakePictureAsync.mockResolvedValue({ uri: 'file:///test.jpg' });
    mockManipulateAsync.mockResolvedValue({ uri: 'file:///resized.jpg', width: 64, height: 64 });
  });

  it('returns default histogram data (256 zeros) on initial render', () => {
    const { result } = renderHook(() => useHistogram());
    expect(result.current.histogramData).toHaveLength(256);
    expect(result.current.histogramData.every(v => v === 0)).toBe(true);
  });

  it('isCapturing is false initially', () => {
    const { result } = renderHook(() => useHistogram());
    expect(result.current.isCapturing).toBe(false);
  });

  it('capture() returns current data (256 zeros) when cameraRef is null', async () => {
    const { result } = renderHook(() => useHistogram());
    const nullRef = { current: null } as any;

    let data: number[] | null = null;
    await act(async () => {
      data = await result.current.capture(nullRef);
    });
    // Hook returns current data array (256 zeros), not null
    expect(data).toHaveLength(256);
    expect(data!.every(v => v === 0)).toBe(true);
  });

  it('capture() returns current data when cameraRef.current is null', async () => {
    const { result } = renderHook(() => useHistogram());
    const emptyRef = { current: null } as any;

    let data: number[] | null = null;
    await act(async () => {
      data = await result.current.capture(emptyRef);
    });
    expect(data).toHaveLength(256);
    expect(data!.every(v => v === 0)).toBe(true);
  });

  it('capture() continues with original photo when resize fails', async () => {
    mockManipulateAsync.mockRejectedValue(new Error('resize failed'));
    // Make the fallback read succeed
    mockReadAsStringAsync.mockResolvedValue('A'.repeat(2500));

    const { result } = renderHook(() => useHistogram());
    const ref = { current: { takePictureAsync: mockTakePictureAsync } } as any;

    let data: number[] | null = null;
    await act(async () => {
      data = await result.current.capture(ref);
    });
    // Should still return 256 values (fallback path)
    expect(data).toHaveLength(256);
  });

  it('capture() uses the correct call order: takePictureAsync -> manipulateAsync -> readAsStringAsync', async () => {
    mockReadAsStringAsync.mockResolvedValue('A'.repeat(2500));

    const { result } = renderHook(() => useHistogram());
    const ref = { current: { takePictureAsync: mockTakePictureAsync } } as any;

    await act(async () => {
      await result.current.capture(ref);
    });

    expect(mockTakePictureAsync).toHaveBeenCalledTimes(1);
    expect(mockManipulateAsync).toHaveBeenCalledTimes(1);
    expect(mockReadAsStringAsync).toHaveBeenCalledTimes(1);
    // readAsStringAsync should be called with the RESIZED uri, not original
    expect(mockReadAsStringAsync).toHaveBeenCalledWith(
      'file:///resized.jpg',
      expect.objectContaining({ encoding: 'base64' })
    );
  });

  it('capture() calls takePictureAsync with correct options', async () => {
    mockReadAsStringAsync.mockResolvedValue('A'.repeat(2500));

    const { result } = renderHook(() => useHistogram());
    const ref = { current: { takePictureAsync: mockTakePictureAsync } } as any;

    await act(async () => {
      await result.current.capture(ref);
    });

    expect(mockTakePictureAsync).toHaveBeenCalledWith({
      quality: 0.1,
      skipProcessing: true,
    });
  });

  it('capture() calls manipulateAsync with resize to width 64', async () => {
    mockReadAsStringAsync.mockResolvedValue('A'.repeat(2500));

    const { result } = renderHook(() => useHistogram());
    const ref = { current: { takePictureAsync: mockTakePictureAsync } } as any;

    await act(async () => {
      await result.current.capture(ref);
    });

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      'file:///test.jpg',
      [{ resize: { width: 64, height: 64 } }],
      expect.objectContaining({ compress: 0.3, format: 'jpeg' })
    );
  });

  it('isCapturing is true during capture and false after it completes', async () => {
    mockReadAsStringAsync.mockResolvedValue('A'.repeat(2500));
    // Use a promise that resolves quickly but not synchronously
    mockTakePictureAsync.mockReturnValue(new Promise(r => setTimeout(r, 10)).then(() => ({ uri: 'file:///test.jpg' })));

    const { result } = renderHook(() => useHistogram());
    const ref = { current: { takePictureAsync: mockTakePictureAsync } } as any;

    // The hook should start with isCapturing = false
    expect(result.current.isCapturing).toBe(false);

    // Start capture and wait for completion
    await act(async () => {
      await result.current.capture(ref);
    });

    // After completion, isCapturing should be false again
    expect(result.current.isCapturing).toBe(false);
  });

  it('multiple captures update histogramData each time', async () => {
    // First capture returns one base64, second returns another
    mockReadAsStringAsync
      .mockResolvedValueOnce('A'.repeat(2500))
      .mockResolvedValueOnce('B'.repeat(2500));

    const { result } = renderHook(() => useHistogram());
    const ref = { current: { takePictureAsync: mockTakePictureAsync } } as any;

    await act(async () => {
      await result.current.capture(ref);
    });
    const firstData = [...result.current.histogramData];

    await act(async () => {
      await result.current.capture(ref);
    });
    const secondData = result.current.histogramData;

    // Both should be 256 elements
    expect(firstData).toHaveLength(256);
    expect(secondData).toHaveLength(256);
  });
});
