/**
 * Unit tests for src/services/camera2.ts
 * Tests: supportsRawCapture, captureRawNative (Android native module wrappers)
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    Camera2RawModule: {
      supportsRAW: jest.fn(),
      captureRAW: jest.fn(),
    },
  },
}));

const { Platform, NativeModules } = require('react-native');
const mockModule = NativeModules.Camera2RawModule;

describe('supportsRawCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  });

  it('returns false on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { supportsRawCapture } = require('../services/camera2');
    const result = await supportsRawCapture();
    expect(result).toBe(false);
  });

  it('returns false when Camera2RawModule is absent', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const prevModule = NativeModules.Camera2RawModule;
    delete NativeModules.Camera2RawModule;
    const { supportsRawCapture } = require('../services/camera2');
    const result = await supportsRawCapture();
    NativeModules.Camera2RawModule = prevModule;
    expect(result).toBe(false);
  });

  it('returns true when native module supportsRAW resolves true on Android', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    mockModule.supportsRAW.mockResolvedValue(true);
    const { supportsRawCapture } = require('../services/camera2');
    const result = await supportsRawCapture();
    expect(result).toBe(true);
    expect(mockModule.supportsRAW).toHaveBeenCalled();
  });

  it('returns false when native module supportsRAW rejects', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    mockModule.supportsRAW.mockRejectedValue(new Error('camera error'));
    const { supportsRawCapture } = require('../services/camera2');
    const result = await supportsRawCapture();
    expect(result).toBe(false);
  });
});

describe('captureRawNative', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  });

  it('returns null on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { captureRawNative } = require('../services/camera2');
    const result = await captureRawNative();
    expect(result).toBeNull();
  });

  it('returns null when Camera2RawModule is absent', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const prevModule = NativeModules.Camera2RawModule;
    delete NativeModules.Camera2RawModule;
    const { captureRawNative } = require('../services/camera2');
    const result = await captureRawNative();
    NativeModules.Camera2RawModule = prevModule;
    expect(result).toBeNull();
  });

  it('returns result object when native captureRAW succeeds', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const mockResult = { uri: 'file:///sdcard/RAW_20240101.dng', path: '/sdcard/RAW_20240101.dng', width: 4000, height: 3000 };
    mockModule.captureRAW.mockResolvedValue(mockResult);
    const { captureRawNative } = require('../services/camera2');
    const result = await captureRawNative();
    expect(result).toEqual(mockResult);
    expect(mockModule.captureRAW).toHaveBeenCalled();
  });

  it('returns null when native captureRAW rejects', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    mockModule.captureRAW.mockRejectedValue(new Error('capture failed'));
    const { captureRawNative } = require('../services/camera2');
    const result = await captureRawNative();
    expect(result).toBeNull();
  });
});