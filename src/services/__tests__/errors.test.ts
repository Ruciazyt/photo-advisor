/**
 * Tests for errors service — unified error handling layer.
 */

import { Alert } from 'react-native';

// Mock Alert before importing errors
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: { canOpenURL: jest.fn(), openURL: jest.fn() },
}));

import {
  ErrorCode,
  AppError,
  CameraError,
  StorageError,
  APIError,
  LocationError,
  MediaError,
  ConfigError,
  isAtLeastSeverity,
  errorToString,
  toAppError,
  handleError,
  safeAsync,
  Result,
  toResult,
  resultOf,
} from '../errors';

const mockAlert = Alert as jest.Mocked<typeof Alert>;

describe('errors service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- ErrorCode constants ----
  describe('ErrorCode', () => {
    it('has camera error codes', () => {
      expect(ErrorCode.CAM_PERMISSION_DENIED).toBe('CAM-PERM-001');
      expect(ErrorCode.CAM_NOT_AVAILABLE).toBe('CAM-PERM-002');
      expect(ErrorCode.CAM_CAPTURE_FAILED).toBe('CAM-CAPT-001');
    });

    it('has storage error codes', () => {
      expect(ErrorCode.STOR_READ_FAILED).toBe('STOR-READ-001');
      expect(ErrorCode.STOR_DISK_FULL).toBe('STOR-DISK-001');
    });

    it('has API error codes', () => {
      expect(ErrorCode.API_NETWORK_ERROR).toBe('API-NET-001');
      expect(ErrorCode.API_AUTH_FAILED).toBe('API-AUTH-401');
      expect(ErrorCode.API_RATE_LIMITED).toBe('API-RATE-429');
    });

    it('has location error codes', () => {
      expect(ErrorCode.LOC_PERMISSION_DENIED).toBe('LOC-PERM-001');
      expect(ErrorCode.LOC_UNAVAILABLE).toBe('LOC-001');
    });
  });

  // ---- AppError class ----
  describe('AppError', () => {
    it('creates error with all properties', () => {
      const error = new AppError('Something went wrong', ErrorCode.GEN_UNKNOWN, 'error', true, 'myContext');
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe(ErrorCode.GEN_UNKNOWN);
      expect(error.severity).toBe('error');
      expect(error.recoverable).toBe(true);
      expect(error.context).toBe('myContext');
      expect(error.name).toBe('AppError');
    });

    it('defaults recoverable to false and severity to error', () => {
      const error = new AppError('oops', ErrorCode.GEN_UNKNOWN);
      expect(error.recoverable).toBe(false);
      expect(error.severity).toBe('error');
    });

    it('toString includes code and message', () => {
      const error = new AppError('fail', ErrorCode.API_NETWORK_ERROR);
      expect(error.toString()).toBe('[API-NET-001] fail');
    });

    it('toString includes context when provided', () => {
      const error = new AppError('fail', ErrorCode.API_NETWORK_ERROR, 'error', false, 'uploadPhoto');
      expect(error.toString()).toBe('[API-NET-001] fail (uploadPhoto)');
    });

    it('is instanceof Error', () => {
      const error = new AppError('oops', ErrorCode.GEN_UNKNOWN);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it('has stack trace in V8 environments', () => {
      const error = new AppError('oops', ErrorCode.GEN_UNKNOWN);
      expect(error.stack).toBeDefined();
    });
  });

  // ---- Domain error subclasses ----
  describe('Domain error subclasses', () => {
    it('CameraError has correct name and context', () => {
      const error = new CameraError('no camera', ErrorCode.CAM_NOT_AVAILABLE, 'error', true);
      expect(error.name).toBe('CameraError');
      expect(error.context).toBe('CameraError');
      expect(error.code).toBe(ErrorCode.CAM_NOT_AVAILABLE);
    });

    it('StorageError has correct name and context', () => {
      const error = new StorageError('disk full', ErrorCode.STOR_DISK_FULL, 'critical', false);
      expect(error.name).toBe('StorageError');
      expect(error.context).toBe('StorageError');
    });

    it('APIError includes statusCode', () => {
      const error = new APIError('auth failed', ErrorCode.API_AUTH_FAILED, 401);
      expect(error.name).toBe('APIError');
      expect(error.statusCode).toBe(401);
    });

    it('APIError defaults to recoverable', () => {
      const error = new APIError('timeout', ErrorCode.API_TIMEOUT);
      expect(error.recoverable).toBe(true);
    });

    it('LocationError has correct name', () => {
      const error = new LocationError('gps unavailable', ErrorCode.LOC_UNAVAILABLE);
      expect(error.name).toBe('LocationError');
    });

    it('MediaError has correct name', () => {
      const error = new MediaError('load failed', ErrorCode.MED_LOAD_FAILED);
      expect(error.name).toBe('MediaError');
    });

    it('ConfigError defaults to recoverable and warning severity', () => {
      const error = new ConfigError('missing key', ErrorCode.CFG_MISSING);
      expect(error.recoverable).toBe(true);
      expect(error.severity).toBe('warning');
    });
  });

  // ---- isAtLeastSeverity ----
  describe('isAtLeastSeverity', () => {
    it('returns true when error severity >= minSeverity', () => {
      const error = new AppError('oops', ErrorCode.GEN_UNKNOWN, 'error');
      expect(isAtLeastSeverity(error, 'warning')).toBe(true);
      expect(isAtLeastSeverity(error, 'error')).toBe(true);
    });

    it('returns false when error severity < minSeverity', () => {
      const error = new AppError('oops', ErrorCode.GEN_UNKNOWN, 'info');
      expect(isAtLeastSeverity(error, 'error')).toBe(false);
    });

    it('returns true when error severity equals minSeverity', () => {
      const error = new AppError('oops', ErrorCode.GEN_UNKNOWN, 'warning');
      expect(isAtLeastSeverity(error, 'warning')).toBe(true);
    });

    it('handles silent severity', () => {
      const error = new AppError('silent', ErrorCode.GEN_UNKNOWN, 'silent');
      expect(isAtLeastSeverity(error, 'silent')).toBe(true);
      expect(isAtLeastSeverity(error, 'info')).toBe(false);
    });

    it('handles critical severity', () => {
      const error = new AppError('critical', ErrorCode.GEN_UNKNOWN, 'critical');
      expect(isAtLeastSeverity(error, 'critical')).toBe(true);
      expect(isAtLeastSeverity(error, 'error')).toBe(true);
    });
  });

  // ---- errorToString ----
  describe('errorToString', () => {
    it('returns AppError message', () => {
      const error = new AppError('app error msg', ErrorCode.GEN_UNKNOWN);
      expect(errorToString(error)).toBe('app error msg');
    });

    it('returns plain Error message', () => {
      expect(errorToString(new Error('plain error'))).toBe('plain error');
    });

    it('returns string as-is', () => {
      expect(errorToString('just a string')).toBe('just a string');
    });

    it('returns fallback for unknown types', () => {
      expect(errorToString(null)).toBe('发生了一个未知错误');
      expect(errorToString(undefined)).toBe('发生了一个未知错误');
      expect(errorToString(123)).toBe('发生了一个未知错误');
    });

    it('returns custom fallback when provided', () => {
      expect(errorToString(null, 'custom fallback')).toBe('custom fallback');
    });
  });

  // ---- toAppError ----
  describe('toAppError', () => {
    it('preserves existing AppError', () => {
      const original = new AppError('already app error', ErrorCode.API_NETWORK_ERROR, 'warning');
      const result = toAppError(original);
      expect(result).toBe(original);
    });

    it('wraps plain Error', () => {
      const result = toAppError(new Error('plain'));
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('plain');
    });

    it('uses provided defaultCode when wrapping non-AppError', () => {
      const result = toAppError(new Error('oops'), ErrorCode.STOR_DISK_FULL);
      expect(result.code).toBe(ErrorCode.STOR_DISK_FULL);
    });

    it('wraps string errors', () => {
      const result = toAppError('string error');
      expect(result.message).toBe('string error');
      expect(result).toBeInstanceOf(AppError);
    });
  });

  // ---- handleError ----
  describe('handleError', () => {
    it('logs error to console', () => {
      const error = new AppError('log me', ErrorCode.GEN_UNKNOWN, 'error');
      handleError(error, { silent: false });
      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalled();
    });

    it('does not log when silent=true', () => {
      const error = new AppError('silent', ErrorCode.GEN_UNKNOWN, 'error');
      handleError(error, { silent: true });
      // eslint-disable-next-line no-console
      expect(console.error).not.toHaveBeenCalled();
    });

    it('does not log silent-severity errors even without silent flag', () => {
      const error = new AppError('silent', ErrorCode.GEN_UNKNOWN, 'silent');
      handleError(error);
      // eslint-disable-next-line no-console
      expect(console.error).not.toHaveBeenCalled();
    });

    it('shows Alert for error severity by default', () => {
      const error = new AppError('error msg', ErrorCode.GEN_UNKNOWN, 'error');
      handleError(error);
      expect(mockAlert.alert).toHaveBeenCalledWith('出错了', 'error msg', expect.any(Array));
    });

    it('shows Alert for critical severity', () => {
      const error = new AppError('critical', ErrorCode.GEN_UNKNOWN, 'critical');
      handleError(error);
      expect(mockAlert.alert).toHaveBeenCalled();
    });

    it('does not show Alert for info severity by default', () => {
      const error = new AppError('info', ErrorCode.GEN_UNKNOWN, 'info');
      handleError(error);
      expect(mockAlert.alert).not.toHaveBeenCalled();
    });

    it('respects showAlert=false', () => {
      const error = new AppError('hidden', ErrorCode.GEN_UNKNOWN, 'error');
      handleError(error, { showAlert: false });
      expect(mockAlert.alert).not.toHaveBeenCalled();
    });

    it('uses custom alertTitle when provided', () => {
      const error = new CameraError('no cam', ErrorCode.CAM_NOT_AVAILABLE);
      handleError(error, { alertTitle: 'Custom Title' });
      expect(mockAlert.alert).toHaveBeenCalledWith('Custom Title', expect.any(String), expect.any(Array));
    });

    it('shows recovery dialog for recoverable errors with onRecover', () => {
      const error = new AppError('try again', ErrorCode.GEN_UNKNOWN, 'error', true);
      const onRecover = jest.fn();
      handleError(error, { onRecover });
      expect(mockAlert.alert).toHaveBeenCalledWith(
        '出错了',
        'try again\n\n是否重试？',
        expect.arrayContaining([
          expect.objectContaining({ text: '重试', onPress: onRecover }),
          expect.objectContaining({ text: '取消', style: 'cancel' }),
        ])
      );
    });

    it('shows "相机错误" title for CameraError', () => {
      const error = new CameraError('cam fail', ErrorCode.CAM_CAPTURE_FAILED);
      handleError(error);
      expect(mockAlert.alert).toHaveBeenCalledWith('相机错误', expect.any(String), expect.any(Array));
    });

    it('shows "网络错误" title for APIError', () => {
      const error = new APIError('network', ErrorCode.API_NETWORK_ERROR);
      handleError(error);
      expect(mockAlert.alert).toHaveBeenCalledWith('网络错误', expect.any(String), expect.any(Array));
    });

    it('returns the AppError', () => {
      const error = new AppError('oops', ErrorCode.GEN_UNKNOWN);
      const result = handleError(error);
      expect(result).toBe(error);
    });

    it('wraps non-AppError before handling', () => {
      const result = handleError(new Error('wrapped'));
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('wrapped');
    });
  });

  // ---- safeAsync ----
  describe('safeAsync', () => {
    it('returns result of fn on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await safeAsync(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
    });

    it('returns fallback on error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const result = await safeAsync(fn, 'fallback');
      expect(result).toBe('fallback');
    });

    it('returns null fallback by default on error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const result = await safeAsync(fn);
      expect(result).toBeNull();
    });

    it('handles error with handleError options', async () => {
      const fn = jest.fn().mockRejectedValue(new AppError('handled', ErrorCode.GEN_UNKNOWN, 'error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await safeAsync(fn, 'fallback', { showAlert: false });
      expect(result).toBe('fallback');
      consoleErrorSpy.mockRestore();
    });

    it('passes silent=true to handleError', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('silent fail'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      await safeAsync(fn, null);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // ---- toResult ----
  describe('toResult', () => {
    it('returns ok:true with value when fn succeeds', async () => {
      const fn = jest.fn().mockResolvedValue(42);
      const resultFn = toResult(fn, ErrorCode.GEN_UNKNOWN);
      const result = await resultFn();
      expect(result).toEqual({ ok: true, value: 42 });
    });

    it('returns ok:false with error when fn throws', async () => {
      const error = new AppError('failed', ErrorCode.STOR_DISK_FULL, 'error');
      const fn = jest.fn().mockRejectedValue(error);
      const resultFn = toResult(fn, ErrorCode.STOR_DISK_FULL);
      const result = await resultFn();
      expect(result).toEqual({ ok: false, error });
    });

    it('wraps non-AppError errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('plain error'));
      const resultFn = toResult(fn, ErrorCode.API_NETWORK_ERROR);
      const result = await resultFn();
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.code).toBe(ErrorCode.API_NETWORK_ERROR);
    });
  });

  // ---- resultOf ----
  describe('resultOf', () => {
    it('returns ok:true when async fn succeeds', async () => {
      const result = await resultOf(() => Promise.resolve([1, 2, 3]));
      expect(result).toEqual({ ok: true, value: [1, 2, 3] });
    });

    it('returns ok:false when async fn throws', async () => {
      const error = new StorageError('disk full', ErrorCode.STOR_DISK_FULL);
      const result = await resultOf(() => Promise.reject(error));
      expect(result).toEqual({ ok: false, error });
    });

    it('uses default ErrorCode', async () => {
      const result = await resultOf(() => Promise.reject(new Error('oops')));
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe(ErrorCode.GEN_UNKNOWN);
    });

    it('accepts custom ErrorCode', async () => {
      const result = await resultOf(() => Promise.reject(new Error('oops')), ErrorCode.LOC_UNAVAILABLE);
      expect(result.error.code).toBe(ErrorCode.LOC_UNAVAILABLE);
    });
  });
});