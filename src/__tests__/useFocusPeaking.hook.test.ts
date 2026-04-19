/**
 * Tests for useFocusPeaking hook — capturePeaks logic.
 *
 * Updated to mock expo-file-system/legacy and jpeg-js (replacing the
 * non-existent Image.getPixelDataAsync approach).
 */

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));

jest.mock('jpeg-js', () => ({
  decode: jest.fn(),
}));

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
}));

import { renderHook, act } from '@testing-library/react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';
import { useFocusPeaking } from '../hooks/useFocusPeaking';

const mockTakePictureAsync = jest.fn();

function cameraRef() {
  return {
    current: {
      takePictureAsync: mockTakePictureAsync,
    },
  };
}

// ---------------------------------------------------------------------------
// JPEG encoding helpers (for creating valid mock JPEG data)
// ---------------------------------------------------------------------------

/**
 * Create a minimal valid JPEG buffer for testing.
 * A real JPEG has a complex structure; for testing we just need something
 * that jpeg-js can decode. We use a tiny 1x1 white pixel JPEG.
 */
function createMinimalJpegBuffer(): Uint8Array {
  // Minimal JPEG with 1x1 white pixel (hex representation)
  // This is a valid JPEG that jpeg-js can decode
  const minimalJpegBase64 =
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==';
  const raw = atob(minimalJpegBase64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Create mock RGBA pixel data at the given size.
 * Produces a horizontal gradient for meaningful edge detection testing.
 */
function createMockPixelData(size: number = 48): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const gray = Math.floor((x / size) * 255);
    pixels[i * 4] = gray;     // R
    pixels[i * 4 + 1] = gray; // G
    pixels[i * 4 + 2] = gray; // B
    pixels[i * 4 + 3] = 255;  // A
  }
  return pixels;
}

function setupHappyPath() {
  mockTakePictureAsync.mockResolvedValue({ uri: 'file:///photo.jpg' });
  (manipulateAsync as jest.Mock).mockResolvedValue({
    uri: 'file:///resized.jpg',
    width: 48,
    height: 48,
  });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
    btoa(String.fromCharCode(...createMinimalJpegBuffer()))
  );
  (jpeg.decode as jest.Mock).mockReturnValue({
    width: 48,
    height: 48,
    data: createMockPixelData(48),
  });
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

    let peaks: unknown[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(nullRef as never, 300, 400);
    });

    expect(peaks).toEqual([]);
    expect(mockTakePictureAsync).not.toHaveBeenCalled();
  });

  it('returns empty array when takePictureAsync resolves null', async () => {
    mockTakePictureAsync.mockResolvedValue(null);

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: unknown[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    expect(peaks).toEqual([]);
  });

  it('returns empty array when photo.uri is missing', async () => {
    mockTakePictureAsync.mockResolvedValue({});

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: unknown[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    expect(peaks).toEqual([]);
  });

  it('calls manipulateAsync with SAMPLE_SIZE (48px) resize params', async () => {
    const { result } = renderHook(() => useFocusPeaking());

    await act(async () => {
      await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    expect(manipulateAsync).toHaveBeenCalledTimes(1);
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [{ resize: { width: 48, height: 48 } }],
      expect.objectContaining({ compress: 0.3, format: 'jpeg' })
    );
  });

  it('calls FileSystem.readAsStringAsync on resized URI', async () => {
    const { result } = renderHook(() => useFocusPeaking());

    await act(async () => {
      await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledTimes(1);
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      'file:///resized.jpg',
      expect.objectContaining({ encoding: 'base64' })
    );
  });

  it('calls jpeg.decode with the raw JPEG bytes', async () => {
    const { result } = renderHook(() => useFocusPeaking());

    await act(async () => {
      await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    expect(jpeg.decode).toHaveBeenCalledTimes(1);
    // decode receives a Uint8Array of JPEG bytes
    const decodeArg = (jpeg.decode as jest.Mock).mock.calls[0][0];
    expect(decodeArg).toBeInstanceOf(Uint8Array);
  });

  it('returns empty array when FileSystem.readAsStringAsync returns empty string', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('');

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: unknown[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    expect(peaks).toEqual([]);
  });

  it('returns empty array when jpeg.decode throws', async () => {
    (jpeg.decode as jest.Mock).mockImplementation(() => {
      throw new Error('invalid JPEG');
    });

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: unknown[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    expect(peaks).toEqual([]);
  });

  it('falls back gracefully when manipulateAsync throws', async () => {
    (manipulateAsync as jest.Mock).mockRejectedValue(new Error('resize failed'));

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: unknown[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    // Should not throw; catch block in capturePeaks returns []
    expect(peaks).toBeInstanceOf(Array);
  });

  it('returns empty array when takePictureAsync throws', async () => {
    mockTakePictureAsync.mockRejectedValue(new Error('camera error'));

    const { result } = renderHook(() => useFocusPeaking());
    let peaks: unknown[] = [];
    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    expect(peaks).toEqual([]);
  });

  it('handles two sequential calls without interference', async () => {
    const { result } = renderHook(() => useFocusPeaking());

    let peaks1: unknown[] = [];
    let peaks2: unknown[] = [];

    await act(async () => {
      peaks1 = await result.current.capturePeaks(cameraRef() as never, 300, 400);
      peaks2 = await result.current.capturePeaks(cameraRef() as never, 600, 800);
    });

    expect(manipulateAsync).toHaveBeenCalledTimes(2);
    expect(peaks1).toBeInstanceOf(Array);
    expect(peaks2).toBeInstanceOf(Array);
  });

  it('returned peaks have correct shape (x, y, strength as numbers)', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    let peaks: unknown[] = [];

    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    (peaks as Array<{ x: number; y: number; strength: number }>).forEach(p => {
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
      expect(typeof p.strength).toBe('number');
    });
  });

  it('peak coordinates are in [0, 1] range', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    let peaks: unknown[] = [];

    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    (peaks as Array<{ x: number; y: number }>).forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    });
  });

  it('strength is in [0, 1] range', async () => {
    const { result } = renderHook(() => useFocusPeaking());
    let peaks: unknown[] = [];

    await act(async () => {
      peaks = await result.current.capturePeaks(cameraRef() as never, 300, 400);
    });

    (peaks as Array<{ strength: number }>).forEach(p => {
      expect(p.strength).toBeGreaterThanOrEqual(0);
      expect(p.strength).toBeLessThanOrEqual(1);
    });
  });
});
