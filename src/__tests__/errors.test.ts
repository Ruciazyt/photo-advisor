/**
 * Tests for unified error handling layer
 */

import { AppError, CameraError, StorageError, APIError, LocationError, MediaError, ConfigError,
  ErrorCode, handleError, errorToString, toAppError, safeAsync, resultOf, isAtLeastSeverity, toResult } from '../services/errors';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

// Access the mocked Alert after jest.mock has set it up
const MockAlert = require('react-native').Alert;

describe('AppError', () => {
  it('creates error with all properties', () => {
    const error = new AppError('test message', ErrorCode.GEN_UNKNOWN, 'error', true, 'testContext');
    expect(error.message).toBe('test message');
    expect(error.code).toBe(ErrorCode.GEN_UNKNOWN);
    expect(error.severity).toBe('error');
    expect(error.recoverable).toBe(true);
    expect(error.context).toBe('testContext');
    expect(error.name).toBe('AppError');
    expect(error instanceof Error).toBe(true);
  });

  it('toString includes code and message', () => {
    const error = new AppError('something went wrong', ErrorCode.API_NETWORK_ERROR, 'error', false);
    expect(error.toString()).toBe('[API-NET-001] something went wrong');
  });

  it('toString includes context when provided', () => {
    const error = new AppError('oops', ErrorCode.GEN_UNKNOWN, 'info', false, 'MyContext');
    expect(error.toString()).toBe('[GEN-UNK-001] oops (MyContext)');
  });

  it('supports error equality via code', () => {
    const e1 = new AppError('msg1', ErrorCode.CAM_PERMISSION_DENIED);
    const e2 = new AppError('msg2', ErrorCode.CAM_PERMISSION_DENIED);
    expect(e1.code).toBe(e2.code);
  });
});

describe('Domain Errors', () => {
  it('CameraError has correct name and context', () => {
    const err = new CameraError('no permission', ErrorCode.CAM_PERMISSION_DENIED, 'warning', true);
    expect(err.name).toBe('CameraError');
    expect(err.context).toBe('CameraError');
    expect(err.severity).toBe('warning');
    expect(err.recoverable).toBe(true);
  });

  it('StorageError has correct name and context', () => {
    const err = new StorageError('disk full', ErrorCode.STOR_DISK_FULL, 'critical', false);
    expect(err.name).toBe('StorageError');
    expect(err.context).toBe('StorageError');
    expect(err.severity).toBe('critical');
    expect(err.recoverable).toBe(false);
  });

  it('APIError includes statusCode', () => {
    const err = new APIError('auth failed', ErrorCode.API_AUTH_FAILED, 401, 'error', true);
    expect(err.name).toBe('APIError');
    expect(err.statusCode).toBe(401);
    expect(err.severity).toBe('error');
  });

  it('LocationError has default warning severity', () => {
    const err = new LocationError('location unavailable', ErrorCode.LOC_UNAVAILABLE);
    expect(err.severity).toBe('warning');
    expect(err.name).toBe('LocationError');
  });

  it('MediaError has correct defaults', () => {
    const err = new MediaError('save failed', ErrorCode.MED_SAVE_FAILED);
    expect(err.severity).toBe('error');
    expect(err.recoverable).toBe(false);
  });

  it('ConfigError is recoverable by default', () => {
    const err = new ConfigError('missing key', ErrorCode.CFG_MISSING);
    expect(err.recoverable).toBe(true);
    expect(err.severity).toBe('warning');
  });
});

describe('errorToString', () => {
  it('returns AppError message', () => {
    const err = new AppError('hello', ErrorCode.GEN_UNKNOWN);
    expect(errorToString(err)).toBe('hello');
  });

  it('returns plain Error message', () => {
    expect(errorToString(new Error('world'))).toBe('world');
  });

  it('returns string as-is', () => {
    expect(errorToString('plain string')).toBe('plain string');
  });

  it('returns fallback for unknown types', () => {
    expect(errorToString(null, 'fallback')).toBe('fallback');
    expect(errorToString(undefined, 'fallback')).toBe('fallback');
    expect(errorToString(123, 'fallback')).toBe('fallback');
  });

  it('returns fallback by default', () => {
    expect(errorToString(null)).toBe('发生了一个未知错误');
  });
});

describe('toAppError', () => {
  it('preserves AppError instances', () => {
    const original = new CameraError('cam', ErrorCode.CAM_PERMISSION_DENIED);
    const result = toAppError(original);
    expect(result).toBe(original);
  });

  it('wraps plain Error', () => {
    const result = toAppError(new Error('plain'), ErrorCode.GEN_UNKNOWN);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('plain');
    expect(result.code).toBe(ErrorCode.GEN_UNKNOWN);
  });

  it('wraps unknown as GEN_UNKNOWN', () => {
    const result = toAppError(null);
    expect(result.code).toBe(ErrorCode.GEN_UNKNOWN);
    expect(result.message).toBe('发生了一个未知错误');
  });

  it('wraps string as message', () => {
    const result = toAppError('just a string', ErrorCode.API_NETWORK_ERROR);
    expect(result.message).toBe('just a string');
  });
});

describe('handleError', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockAlert.alert.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('logs error to console', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'error');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    handleError(err, { silent: false });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not log silent errors', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'silent');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    handleError(err, { silent: false });
    // silent severity maps to debug level, not error
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not log when silent=true', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'error');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    handleError(err, { silent: true });
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('shows Alert for error severity by default', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'error');
    handleError(err);
    expect(MockAlert.alert).toHaveBeenCalledTimes(1);
    expect(MockAlert.alert).toHaveBeenCalledWith('出错了', 'test', [{ text: '确定' }]);
  });

  it('does not show Alert when showAlert=false', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'error');
    handleError(err, { showAlert: false });
    expect(MockAlert.alert).not.toHaveBeenCalled();
  });

  it('does not show Alert for silent severity', () => {
    const err = new AppError('silent', ErrorCode.GEN_UNKNOWN, 'silent');
    handleError(err);
    expect(MockAlert.alert).not.toHaveBeenCalled();
  });

  it('shows recovery Alert with retry button', () => {
    const err = new APIError('网络连接失败', ErrorCode.API_NETWORK_ERROR, undefined, 'error', true);
    const onRecover = jest.fn();
    handleError(err, { onRecover });
    expect(MockAlert.alert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = MockAlert.alert.mock.calls[0];
    expect(title).toBe('网络错误');
    expect(message).toContain('是否重试');
    expect(buttons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: '取消' }),
        expect.objectContaining({ text: '重试' }),
      ])
    );
  });

  it('respects custom alertTitle', () => {
    const err = new CameraError('no cam', ErrorCode.CAM_PERMISSION_DENIED);
    handleError(err, { alertTitle: '相机出问题了' });
    expect(MockAlert.alert).toHaveBeenCalledWith(
      '相机出问题了',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('returns the normalized AppError', () => {
    const err = new Error('plain');
    const result = handleError(err);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('plain');
  });
});

describe('safeAsync', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns value on success', async () => {
    const result = await safeAsync(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('returns fallback on error (silent)', async () => {
    const result = await safeAsync(
      () => Promise.reject(new Error('fail')),
      null,
      { silent: true }
    );
    expect(result).toBeNull();
  });

  it('returns null without throwing', async () => {
    const fn = jest.fn().mockRejectedValue(new AppError('fail', ErrorCode.GEN_UNKNOWN));
    const result = await safeAsync(fn, null, { silent: true });
    expect(result).toBeNull();
  });
});

describe('resultOf', () => {
  it('returns ok:true with value on success', async () => {
    const result = await resultOf(() => Promise.resolve('success'));
    expect(result).toEqual({ ok: true, value: 'success' });
  });

  it('returns ok:false with AppError on failure', async () => {
    const result = await resultOf(
      () => Promise.reject(new APIError('auth failed', ErrorCode.API_AUTH_FAILED, 401)),
      ErrorCode.API_AUTH_FAILED
    );
    expect(result.ok).toBe(false);
    const err = result as { ok: false; error: AppError };
    expect(err.error).toBeInstanceOf(APIError);
    expect(err.error.message).toBe('auth failed');
    expect((err.error as APIError).statusCode).toBe(401);
  });

  it('wraps unknown errors with default code', async () => {
    const result = await resultOf(() => Promise.reject('string error'));
    expect(result.ok).toBe(false);
    const err = result as { ok: false; error: { code: ErrorCode } };
    expect(err.error.code).toBe(ErrorCode.GEN_UNKNOWN);
  });
});

describe('ErrorCode', () => {
  it('has all expected camera error codes', () => {
    expect(ErrorCode.CAM_PERMISSION_DENIED).toBe('CAM-PERM-001');
    expect(ErrorCode.CAM_CAPTURE_FAILED).toBe('CAM-CAPT-001');
  });

  it('has all expected storage error codes', () => {
    expect(ErrorCode.STOR_READ_FAILED).toBe('STOR-READ-001');
    expect(ErrorCode.STOR_DISK_FULL).toBe('STOR-DISK-001');
  });

  it('has all expected API error codes', () => {
    expect(ErrorCode.API_NETWORK_ERROR).toBe('API-NET-001');
    expect(ErrorCode.API_TIMEOUT).toBe('API-NET-002');
    expect(ErrorCode.API_AUTH_FAILED).toBe('API-AUTH-401');
    expect(ErrorCode.API_RATE_LIMITED).toBe('API-RATE-429');
  });

  it('has location error codes', () => {
    expect(ErrorCode.LOC_PERMISSION_DENIED).toBe('LOC-PERM-001');
    expect(ErrorCode.LOC_UNAVAILABLE).toBe('LOC-001');
  });

  it('has media error codes', () => {
    expect(ErrorCode.MED_LOAD_FAILED).toBe('MED-LOAD-001');
    expect(ErrorCode.MED_SAVE_FAILED).toBe('MED-SAVE-001');
  });

  it('has config error codes', () => {
    expect(ErrorCode.CFG_MISSING).toBe('CFG-001');
    expect(ErrorCode.CFG_INVALID).toBe('CFG-002');
  });
});

describe('isAtLeastSeverity', () => {
  it('returns true when error severity equals minSeverity', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'warning');
    expect(isAtLeastSeverity(err, 'warning')).toBe(true);
  });

  it('returns true when error severity exceeds minSeverity', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'error');
    expect(isAtLeastSeverity(err, 'warning')).toBe(true);
    expect(isAtLeastSeverity(err, 'info')).toBe(true);
  });

  it('returns true when error severity is critical', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'critical');
    expect(isAtLeastSeverity(err, 'critical')).toBe(true);
    expect(isAtLeastSeverity(err, 'error')).toBe(true);
    expect(isAtLeastSeverity(err, 'warning')).toBe(true);
    expect(isAtLeastSeverity(err, 'info')).toBe(true);
    expect(isAtLeastSeverity(err, 'silent')).toBe(true);
  });

  it('returns false when error severity is lower than minSeverity', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'info');
    expect(isAtLeastSeverity(err, 'warning')).toBe(false);
    expect(isAtLeastSeverity(err, 'error')).toBe(false);
    expect(isAtLeastSeverity(err, 'critical')).toBe(false);
  });

  it('returns false when error severity is silent and minSeverity is higher', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'silent');
    expect(isAtLeastSeverity(err, 'info')).toBe(false);
    expect(isAtLeastSeverity(err, 'warning')).toBe(false);
  });

  it('returns true when both are silent', () => {
    const err = new AppError('test', ErrorCode.GEN_UNKNOWN, 'silent');
    expect(isAtLeastSeverity(err, 'silent')).toBe(true);
  });
});

describe('toResult', () => {
  it('returns ok:true with the resolved value when fn succeeds', async () => {
    const fn = () => Promise.resolve(123);
    const wrapped = toResult(fn);
    const result = await wrapped();
    expect(result).toEqual({ ok: true, value: 123 });
  });

  it('returns ok:false with AppError when fn throws AppError', async () => {
    const err = new CameraError('cam error', ErrorCode.CAM_CAPTURE_FAILED);
    const fn = () => Promise.reject(err);
    const wrapped = toResult(fn, ErrorCode.CAM_CAPTURE_FAILED);
    const result = await wrapped();
    expect(result.ok).toBe(false);
    expect((result as any).error).toBe(err);
  });

  it('returns ok:false with wrapped AppError when fn throws plain Error', async () => {
    const fn = () => Promise.reject(new Error('plain'));
    const wrapped = toResult(fn, ErrorCode.API_NETWORK_ERROR);
    const result = await wrapped();
    expect(result.ok).toBe(false);
    expect((result as any).error).toBeInstanceOf(AppError);
    expect((result as any).error.code).toBe(ErrorCode.API_NETWORK_ERROR);
    expect((result as any).error.message).toBe('plain');
  });

  it('uses default code GEN_UNKNOWN when no code provided', async () => {
    const fn = () => Promise.reject('string error');
    const wrapped = toResult(fn);
    const result = await wrapped();
    expect(result.ok).toBe(false);
    expect((result as any).error.code).toBe(ErrorCode.GEN_UNKNOWN);
  });

  it('resultOf is an alias for the Result pattern using toResult', async () => {
    // resultOf wraps try/catch directly; toResult wraps a function
    // Both should produce identical Result<T> output
    const viaResultOf = await resultOf(() => Promise.resolve('hello'));
    const viaToResult = await toResult(() => Promise.resolve('hello'))();
    expect(viaResultOf).toEqual(viaToResult);
  });
});

describe('errorToString', () => {
  it('returns AppError message', () => {
    const err = new AppError('app error msg', ErrorCode.GEN_UNKNOWN);
    expect(errorToString(err)).toBe('app error msg');
  });

  it('returns plain Error message', () => {
    expect(errorToString(new Error('plain error'))).toBe('plain error');
  });

  it('returns string as-is', () => {
    expect(errorToString('just a string')).toBe('just a string');
  });

  it('returns fallback for null/undefined', () => {
    expect(errorToString(null)).toBe('发生了一个未知错误');
    expect(errorToString(undefined)).toBe('发生了一个未知错误');
    expect(errorToString(null, 'custom fallback')).toBe('custom fallback');
    expect(errorToString(undefined, 'custom fallback')).toBe('custom fallback');
  });

  it('returns fallback for non-object values', () => {
    expect(errorToString(42)).toBe('发生了一个未知错误');
    expect(errorToString(42, 'fallback for number')).toBe('fallback for number');
  });
});
