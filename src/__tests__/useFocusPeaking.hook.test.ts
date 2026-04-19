/**
 * Tests for useFocusPeaking hook — capturePeaks logic.
 *
 * With static imports for expo-image-manipulator and expo-file-system/legacy,
 * jest.mock reliably intercepts all module calls.
 */

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
}));

import { renderHook, act } from '@testing-library/react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusPeaking } from '../hooks/useFocusPeaking';

const mockTakePictureAsync = jest.fn();

const VALID_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/' +
  '2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/' +
  '8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/' +
  '2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDAS';

function cameraRef() {
  return {
    current: {
      takePictureAsync: mockTakePictureAsync,
    },
  };
}

function setupHappyPath() {
  mockTakePictureAsync.mockResolvedValue({ uri: 'file:///photo.jpg' });
  (manipulateAsync as jest.Mock).mockResolvedValue({
    uri: 'file:///resized.jpg',
    width: 48,
    height: 48,
  });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(VALID_BASE64);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFocusPeaking capturePeaks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPath();
  });

  it('returns an object with capturePeaks function', () => {
    const { result } = renderHook(() => useFocusPeaking());
    expect(typeof result.current.capturePeaks).toBe('function');
  });

  it('returns empty array when cameraRef.current is null', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    const nullRef = { current: null };

    let peaks: any[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(nullRef as any, 300, 400);
    });

    expect(peaks).toEqual([]);
    expect(mockTakePictureAsync).not.toHaveBeenCalled();
  });

  it('returns empty array when takePictureAsync resolves null', async () => {
    mockTakePictureAsync.mockResolvedValue(null);

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: any[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    expect(peaks).toEqual([]);
  });

  it('returns empty array when photo.uri is missing', async () => {
    mockTakePictureAsync.mockResolvedValue({});

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: any[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    expect(peaks).toEqual([]);
  });

  it('calls manipulateAsync with SAMPLE_SIZE (48px) resize params', async () => {
    const { result } = renderHook(() => useFocusPeaking());

    await act(async () => {
      await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    expect(manipulateAsync).toHaveBeenCalledTimes(1);
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [{ resize: { width: 48, height: 48 } }],
      expect.objectContaining({ compress: 0.3, format: 'jpeg' })
    );
  });

  it('calls readAsStringAsync on resized URI with base64 encoding', async () => {
    const { result } = renderHook(() => useFocusPeaking());

    await act(async () => {
      await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledTimes(1);
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      'file:///resized.jpg',
      { encoding: 'base64' }
    );
  });

  it('returns empty array when base64 is too short (< 100 chars)', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('short');

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: any[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    expect(peaks).toEqual([]);
  });

  it('falls back gracefully when manipulateAsync throws', async () => {
    (manipulateAsync as jest.Mock).mockRejectedValue(new Error('resize failed'));
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(VALID_BASE64);

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: any[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    // Should not throw; catch block in capturePeaks returns []
    expect(peaks).toBeInstanceOf(Array);
  });

  it('returns empty array when takePictureAsync throws', async () => {
    mockTakePictureAsync.mockRejectedValue(new Error('camera error'));

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: any[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    expect(peaks).toEqual([]);
  });

  it('handles two sequential calls without interference', async () => {
    const { result } = renderHook(() => useFocusPeaking());

    let peaks1: any[] = [];
    let peaks2: any[] = [];

    await act(async () => {
      peaks1 = await result.current.capturePeaks(cameraRef() as any, 300, 400);
      peaks2 = await result.current.capturePeaks(cameraRef() as any, 600, 800);
    });

    expect(manipulateAsync).toHaveBeenCalledTimes(2);
    expect(peaks1).toBeInstanceOf(Array);
    expect(peaks2).toBeInstanceOf(Array);
  });

  it('returned peaks have correct shape (x, y, strength as numbers)', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    let peaks: any[] = [];

    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    peaks.forEach(p => {
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
      expect(typeof p.strength).toBe('number');
    });
  });

  it('peak coordinates are in [0, 1] range', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    let peaks: any[] = [];

    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    peaks.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    });
  });

  it('strength is in [0, 1] range', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    let peaks: any[] = [];

    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as any, 300, 400);
    });

    peaks.forEach(p => {
      expect(p.strength).toBeGreaterThanOrEqual(0);
      expect(p.strength).toBeLessThanOrEqual(1);
    });
  });
});
