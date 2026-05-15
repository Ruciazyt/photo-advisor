/**
 * Unit tests for src/hooks/useHistogramToggle.ts
 *
 * Hook wraps useHistogram and adds toggle/auto-hide logic.
 * Mocks: useHistogram (the hook itself)
 */

jest.mock('../useHistogram');

import { renderHook, act } from '@testing-library/react-native';
import { useHistogramToggle } from '../useHistogramToggle';
import { useHistogram } from '../useHistogram';

const mockUseHistogram = useHistogram as jest.Mock;
const mockCaptureHistogram = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockCaptureHistogram.mockResolvedValue(new Array(256).fill(0.7));
  mockUseHistogram.mockReturnValue({
    histogramData: new Array(256).fill(0.5),
    capture: mockCaptureHistogram,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Initial state ─────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with showHistogram=false by default', () => {
    const { result } = renderHook(() => useHistogramToggle({ current: null } as any));
    expect(result.current.showHistogram).toBe(false);
  });

  it('starts with showHistogram=true when initialShowHistogram=true', () => {
    const { result } = renderHook(() => useHistogramToggle({ current: null } as any, true));
    expect(result.current.showHistogram).toBe(true);
  });

  it('returns histogramData from useHistogram', () => {
    mockUseHistogram.mockReturnValue({
      histogramData: [0.1, 0.2, 0.3],
      capture: jest.fn(),
    });
    const { result } = renderHook(() => useHistogramToggle({ current: null } as any));
    expect(result.current.histogramData).toEqual([0.1, 0.2, 0.3]);
  });
});

// ─── handleHistogramToggle ─────────────────────────────────────────────────

describe('handleHistogramToggle', () => {
  it('hides histogram when already shown', async () => {
    const { result } = renderHook(() => useHistogramToggle({ current: null } as any, true));
    await act(async () => { await result.current.handleHistogramToggle(); });
    expect(result.current.showHistogram).toBe(false);
  });

  it('shows histogram and captures when hidden (cameraRef has current)', async () => {
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    await act(async () => { await result.current.handleHistogramToggle(); });
    expect(result.current.showHistogram).toBe(true);
    expect(mockCaptureHistogram).toHaveBeenCalledWith(cameraRef);
  });

  it('starts 5s auto-dismiss timer when showing', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    setTimeoutSpy.mockReturnValue(999 as any);
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    await act(async () => { await result.current.handleHistogramToggle(); });
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  it('clears previous timer before setting new one (show path)', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    setTimeoutSpy.mockReturnValue(999 as any);
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    // First toggle: show (sets timer 999)
    await act(async () => { await result.current.handleHistogramToggle(); });
    setTimeoutSpy.mockClear();
    // Second toggle: hide (no new timer, but clearTimeout should be called)
    await act(async () => { await result.current.handleHistogramToggle(); });
    // The hide path doesn't call clearTimeout, but the show path would.
    // For this test we check the show path clears previous timer:
    // Toggle back to shown to trigger show path with prior timer
    await act(async () => { await result.current.handleHistogramToggle(); });
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

// ─── handleHistogramPressIn ────────────────────────────────────────────────

describe('handleHistogramPressIn', () => {
  it('captures histogram via captureHistogram', async () => {
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    await act(async () => { await result.current.handleHistogramPressIn(); });
    expect(mockCaptureHistogram).toHaveBeenCalledWith(cameraRef);
  });

  it('shows histogram after capture', async () => {
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    await act(async () => { await result.current.handleHistogramPressIn(); });
    expect(result.current.showHistogram).toBe(true);
  });

  it('clears any existing 5s auto-dismiss timer', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    setTimeoutSpy.mockReturnValue(999 as any);
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    // Show histogram via toggle to start 5s auto-dismiss timer
    await act(async () => { await result.current.handleHistogramToggle(); });
    clearTimeoutSpy.mockClear();
    // PressIn clears the timer
    await act(async () => { await result.current.handleHistogramPressIn(); });
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

// ─── handleHistogramPressOut ───────────────────────────────────────────────

describe('handleHistogramPressOut', () => {
  it('sets a 2s timer to auto-dismiss', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    setTimeoutSpy.mockReturnValue(123 as any);
    const { result } = renderHook(() => useHistogramToggle({ current: null } as any));
    act(() => { result.current.handleHistogramPressOut(); });
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
  });

  it('auto-dismisses after 2s', () => {
    let storedCallback: () => void = () => {};
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
      storedCallback = fn;
      return 123 as any;
    });
    const { result } = renderHook(() => useHistogramToggle({ current: null } as any, true));
    act(() => { result.current.handleHistogramPressOut(); });
    act(() => { storedCallback(); });
    expect(result.current.showHistogram).toBe(false);
  });

  it('sets a 2s timer on press out', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    setTimeoutSpy.mockReturnValue(123 as any);
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    act(() => { result.current.handleHistogramPressOut(); });
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
  });

  it('press out clears any active 5s timer', () => {
    // When histogram is already shown (5s auto-dismiss active), pressOut clears it
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    setTimeoutSpy.mockReturnValue(999 as any);
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    // Show histogram via toggle to start the 5s auto-dismiss timer
    act(() => { result.current.handleHistogramToggle(); });
    clearTimeoutSpy.mockClear();
    act(() => { result.current.handleHistogramPressOut(); });
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

// ─── Auto-dismiss ──────────────────────────────────────────────────────────

describe('5s auto-dismiss after toggle show', () => {
  it('hides histogram after 5 seconds', () => {
    let storedCallback: () => void = () => {};
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
      storedCallback = fn;
      return 456 as any;
    });
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    act(() => { result.current.handleHistogramToggle(); });
    act(() => { storedCallback(); });
    expect(result.current.showHistogram).toBe(false);
  });
});

// ─── Cleanup on unmount ────────────────────────────────────────────────────

describe('cleanup on unmount', () => {
  it('clears pending timer when component unmounts', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    jest.spyOn(global, 'setTimeout').mockReturnValue(999 as any);
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result, unmount } = renderHook(() => useHistogramToggle(cameraRef, false));
    act(() => { result.current.handleHistogramToggle(); }); // sets timer
    unmount();
    // The cleanup function iterates all current pending timers
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

// ─── Returned shape ───────────────────────────────────────────────────────

describe('returned handlers', () => {
  it('all 3 handlers are functions', () => {
    const { result } = renderHook(() => useHistogramToggle({ current: null } as any));
    expect(typeof result.current.handleHistogramToggle).toBe('function');
    expect(typeof result.current.handleHistogramPressIn).toBe('function');
    expect(typeof result.current.handleHistogramPressOut).toBe('function');
  });

  it('calling handlers does not throw', async () => {
    const cameraRef = { current: { takePictureAsync: jest.fn() } } as any;
    const { result } = renderHook(() => useHistogramToggle(cameraRef, false));
    await act(async () => {
      expect(() => result.current.handleHistogramToggle()).not.toThrow();
    });
    await act(async () => {
      expect(() => result.current.handleHistogramPressIn()).not.toThrow();
    });
    act(() => {
      expect(() => result.current.handleHistogramPressOut()).not.toThrow();
    });
  });
});