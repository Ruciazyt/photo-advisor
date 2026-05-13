/**
 * Unit tests for errors.ts service
 */

import { AppError, ErrorCode, CameraError, StorageError, APIError, LocationError, MediaError, ConfigError, errorToString, toAppError, handleError, isAtLeastSeverity, getDefaultAlertTitle, safeAsync, toResult, resultOf } from '../services/errors';

// Mock react-native Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const MockAlert = require('react-native').Alert;

describe('errors.ts service', () => {
  beforeEach(() => {
    MockAlert.alert.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ErrorCode', () => {
    it('contains camera error codes', () => {
      expect(ErrorCode.CAM_PERMISSION_DENIED).toBe('CAM-PERM-001');
      expect(ErrorCode.CAM_NOT_AVAILABLE).toBe('CAM-PERM-002');
      expect(ErrorCode.CAM_CAPTURE_FAILED).toBe('CAM-CAPT-001');
      expect(ErrorCode.CAM_RAW_UNSUPPORTED).toBe('CAM-CAPT-002');
    });

    it('contains storage error codes', () => {
      expect(ErrorCode.STOR_READ_FAILED).toBe('STOR-READ-001');
      expect(ErrorCode.STOR_WRITE_FAILED).toBe('STOR-WRITE-001');
      expect(ErrorCode.STOR_DISK_FULL).toBe('STOR-DISK-001');
      expect(ErrorCode.STOR_FILE_NOT_FOUND).toBe('STOR-FILE-001');
      expect(ErrorCode.STOR_PERMISSION_DENIED).toBe('STOR-PERM-001');
    });

    it('contains API error codes', () => {
      expect(ErrorCode.API_NETWORK_ERROR).toBe('API-NET-001');
      expect(ErrorCode.API_TIMEOUT).toBe('API-NET-002');
      expect(ErrorCode.API_AUTH_FAILED).toBe('API-AUTH-401');
      expect(ErrorCode.API_AUTH_MISSING).toBe('API-AUTH-001');
      expect(ErrorCode.API_SERVER_ERROR).toBe('API-SRV-500');
      expect(ErrorCode.API_INVALID_RESPONSE).toBe('API-RESP-001');
      expect(ErrorCode.API_RATE_LIMITED).toBe('API-RATE-429');
    });

    it('contains location error codes', () => {
      expect(ErrorCode.LOC_PERMISSION_DENIED).toBe('LOC-PERM-001');
      expect(ErrorCode.LOC_UNAVAILABLE).toBe('LOC-001');
      expect(ErrorCode.LOC_TIMEOUT).toBe('LOC-TIME-001');
    });

    it('contains media error codes', () => {
      expect(ErrorCode.MED_LOAD_FAILED).toBe('MED-LOAD-001');
      expect(ErrorCode.MED_SAVE_FAILED).toBe('MED-SAVE-001');
    });

    it('contains config error codes', () => {
      expect(ErrorCode.CFG_MISSING).toBe('CFG-001');
      expect(ErrorCode.CFG_INVALID).toBe('CFG-002');
    });

    it('contains general error codes', () => {
      expect(ErrorCode.GEN_UNKNOWN).toBe('GEN-UNK-001');
      expect(ErrorCode.GEN_OPERATION_CANCELLED).toBe('GEN-CANCEL-001');
    });
  });

  describe('AppError', () => {
    it('creates error with all properties', () => {
      const err = new AppError('test message', ErrorCode.CAM_PERMISSION_DENIED, 'error', true, 'CameraContext');
      expect(err.message).toBe('test message');
      expect(err.code).toBe(ErrorCode.CAM_PERMISSION_DENIED);
      expect(err.severity).toBe('error');
      expect(err.recoverable).toBe(true);
      expect(err.context).toBe('CameraContext');
      expect(err.name).toBe('AppError');
    });

    it('has default values when not provided', () => {
      const err = new AppError('msg', ErrorCode.GEN_UNKNOWN);
      expect(err.severity).toBe('error');
      expect(err.recoverable).toBe(false);
      expect(err.context).toBeUndefined();
    });

    it('toString() formats correctly with context', () => {
      const err = new AppError('oops', ErrorCode.API_NETWORK_ERROR, 'warning', true, 'API');
      expect(err.toString()).toBe('[API-NET-001] oops (API)');
    });

    it('toString() formats correctly without context', () => {
      const err = new AppError('oops', ErrorCode.GEN_UNKNOWN);
      expect(err.toString()).toBe('[GEN-UNK-001] oops');
    });

    it('is instance of Error', () => {
      const err = new AppError('msg', ErrorCode.GEN_UNKNOWN);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('CameraError', () => {
    it('creates with CameraError name', () => {
      const err = new CameraError('camera failed', ErrorCode.CAM_CAPTURE_FAILED, 'error', true);
      expect(err.name).toBe('CameraError');
      expect(err.message).toBe('camera failed');
      expect(err.code).toBe(ErrorCode.CAM_CAPTURE_FAILED);
    });

    it('is instance of AppError', () => {
      const err = new CameraError('msg', ErrorCode.CAM_PERMISSION_DENIED);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('StorageError', () => {
    it('creates with StorageError name', () => {
      const err = new StorageError('disk full', ErrorCode.STOR_DISK_FULL, 'critical', false);
      expect(err.name).toBe('StorageError');
      expect(err.severity).toBe('critical');
      expect(err.recoverable).toBe(false);
    });

    it('is instance of AppError', () => {
      const err = new StorageError('msg', ErrorCode.STOR_READ_FAILED);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('APIError', () => {
    it('creates with APIError name and statusCode', () => {
      const err = new APIError('server error', ErrorCode.API_SERVER_ERROR, 500, 'error', true);
      expect(err.name).toBe('APIError');
      expect(err.statusCode).toBe(500);
    });

    it('statusCode is optional', () => {
      const err = new APIError('timeout', ErrorCode.API_TIMEOUT, undefined, 'warning', true);
      expect(err.statusCode).toBeUndefined();
    });

    it('is instance of AppError', () => {
      const err = new APIError('msg', ErrorCode.API_AUTH_FAILED, 401);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('LocationError', () => {
    it('creates with LocationError name', () => {
      const err = new LocationError('gps unavailable', ErrorCode.LOC_UNAVAILABLE, 'warning', false);
      expect(err.name).toBe('LocationError');
      expect(err.message).toBe('gps unavailable');
    });
  });

  describe('MediaError', () => {
    it('creates with MediaError name', () => {
      const err = new MediaError('load failed', ErrorCode.MED_LOAD_FAILED, 'error', false);
      expect(err.name).toBe('MediaError');
    });
  });

  describe('ConfigError', () => {
    it('creates with ConfigError name', () => {
      const err = new ConfigError('invalid config', ErrorCode.CFG_INVALID, 'warning', true);
      expect(err.name).toBe('ConfigError');
      expect(err.recoverable).toBe(true);
    });
  });

  describe('errorToString', () => {
    it('returns AppError message', () => {
      const err = new AppError('app error', ErrorCode.GEN_UNKNOWN);
      expect(errorToString(err)).toBe('app error');
    });

    it('returns Error message', () => {
      const err = new Error('plain error');
      expect(errorToString(err)).toBe('plain error');
    });

    it('returns string as-is', () => {
      expect(errorToString('just a string')).toBe('just a string');
    });

    it('returns fallback for unknown types', () => {
      expect(errorToString({ foo: 'bar' }, 'fallback msg')).toBe('fallback msg');
      expect(errorToString(null)).toBe('发生了一个未知错误');
      expect(errorToString(undefined, 'custom fallback')).toBe('custom fallback');
    });
  });

  describe('toAppError', () => {
    it('preserves AppError instances', () => {
      const original = new AppError('already app error', ErrorCode.CAM_CAPTURE_FAILED, 'error', true);
      const result = toAppError(original);
      expect(result).toBe(original);
    });

    it('wraps plain Error', () => {
      const result = toAppError(new Error('wrapped'), ErrorCode.GEN_UNKNOWN);
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('wrapped');
      expect(result.code).toBe(ErrorCode.GEN_UNKNOWN);
    });

    it('wraps string', () => {
      const result = toAppError('string error', ErrorCode.API_NETWORK_ERROR);
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('string error');
    });

    it('uses custom default code when wrapping unknown', () => {
      const result = toAppError({ unknown: 'obj' }, ErrorCode.CFG_INVALID);
      expect(result.code).toBe(ErrorCode.CFG_INVALID);
    });
  });

  describe('handleError', () => {
    it('returns AppError', () => {
      const err = new Error('test');
      const result = handleError(err, { showAlert: false });
      expect(result).toBeInstanceOf(AppError);
    });

    it('logs warning for warning severity', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      handleError(new AppError('warn msg', ErrorCode.CFG_MISSING, 'warning'), { silent: false, showAlert: false });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('logs error for error severity', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      handleError(new AppError('err msg', ErrorCode.API_NETWORK_ERROR, 'error'), { silent: false, showAlert: false });
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('does not log silent severity', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      handleError(new AppError('silent', ErrorCode.GEN_UNKNOWN, 'silent'), { silent: false, showAlert: false });
      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    it('shows Alert for error severity', () => {
      handleError(new AppError('err', ErrorCode.GEN_UNKNOWN, 'error'), {});
      expect(MockAlert.alert).toHaveBeenCalledTimes(1);
    });

    it('shows Alert for critical severity', () => {
      handleError(new AppError('crit', ErrorCode.STOR_DISK_FULL, 'critical', false), {});
      expect(MockAlert.alert).toHaveBeenCalledTimes(1);
    });

    it('does not show Alert for warning severity by default', () => {
      handleError(new AppError('warn', ErrorCode.LOC_UNAVAILABLE, 'warning'), {});
      expect(MockAlert.alert).not.toHaveBeenCalled();
    });

    it('does not show Alert when showAlert=false', () => {
      handleError(new AppError('err', ErrorCode.GEN_UNKNOWN, 'error'), { showAlert: false });
      expect(MockAlert.alert).not.toHaveBeenCalled();
    });

    it('shows recovery dialog for recoverable errors with onRecover', () => {
      const recoverable = new AppError(' recoverable', ErrorCode.API_NETWORK_ERROR, 'error', true);
      const onRecover = jest.fn();
      handleError(recoverable, { onRecover });
      expect(MockAlert.alert).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('是否重试？'),
        expect.arrayContaining([
          expect.objectContaining({ text: '取消' }),
          expect.objectContaining({ text: '重试', onPress: onRecover }),
        ])
      );
    });

    it('does not show recovery dialog when no onRecover', () => {
      const recoverable = new AppError(' recoverable', ErrorCode.API_NETWORK_ERROR, 'error', true);
      handleError(recoverable, {});
      const alertCalls = MockAlert.alert.mock.calls;
      const lastCall = alertCalls[alertCalls.length - 1];
      expect(lastCall[1]).not.toContain('是否重试？');
    });

    it('respects silent option', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      handleError(new AppError('err', ErrorCode.GEN_UNKNOWN, 'error'), { silent: true, showAlert: false });
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('isAtLeastSeverity', () => {
    it('returns true when error severity meets minimum', () => {
      const err = new AppError('err', ErrorCode.GEN_UNKNOWN, 'error');
      expect(isAtLeastSeverity(err, 'error')).toBe(true);
      expect(isAtLeastSeverity(err, 'warning')).toBe(true);
      expect(isAtLeastSeverity(err, 'info')).toBe(true);
    });

    it('returns false when error severity is below minimum', () => {
      const err = new AppError('err', ErrorCode.GEN_UNKNOWN, 'info');
      expect(isAtLeastSeverity(err, 'warning')).toBe(false);
      expect(isAtLeastSeverity(err, 'error')).toBe(false);
      expect(isAtLeastSeverity(err, 'critical')).toBe(false);
    });

    it('handles all severity levels', () => {
      const silent = new AppError('s', ErrorCode.GEN_UNKNOWN, 'silent');
      const info = new AppError('i', ErrorCode.GEN_UNKNOWN, 'info');
      const warn = new AppError('w', ErrorCode.GEN_UNKNOWN, 'warning');
      const crit = new AppError('c', ErrorCode.GEN_UNKNOWN, 'critical');

      expect(isAtLeastSeverity(silent, 'silent')).toBe(true);
      expect(isAtLeastSeverity(silent, 'info')).toBe(false);
      expect(isAtLeastSeverity(info, 'info')).toBe(true);
      expect(isAtLeastSeverity(warn, 'warning')).toBe(true);
      expect(isAtLeastSeverity(crit, 'critical')).toBe(true);
    });
  });

  describe('getDefaultAlertTitle', () => {
    it('returns camera title for CameraError', () => {
      const err = new CameraError('cam', ErrorCode.CAM_CAPTURE_FAILED);
      expect(getDefaultAlertTitle(err)).toBe('相机错误');
    });

    it('returns storage title for StorageError', () => {
      const err = new StorageError('stor', ErrorCode.STOR_DISK_FULL);
      expect(getDefaultAlertTitle(err)).toBe('存储错误');
    });

    it('returns network title for APIError', () => {
      const err = new APIError('api', ErrorCode.API_SERVER_ERROR, 500);
      expect(getDefaultAlertTitle(err)).toBe('网络错误');
    });

    it('returns location title for LocationError', () => {
      const err = new LocationError('loc', ErrorCode.LOC_UNAVAILABLE);
      expect(getDefaultAlertTitle(err)).toBe('定位错误');
    });

    it('returns media title for MediaError', () => {
      const err = new MediaError('med', ErrorCode.MED_LOAD_FAILED);
      expect(getDefaultAlertTitle(err)).toBe('媒体错误');
    });

    it('returns config title for ConfigError', () => {
      const err = new ConfigError('cfg', ErrorCode.CFG_INVALID);
      expect(getDefaultAlertTitle(err)).toBe('配置错误');
    });

    it('returns default title for AppError', () => {
      const err = new AppError('app', ErrorCode.GEN_UNKNOWN);
      expect(getDefaultAlertTitle(err)).toBe('出错了');
    });
  });

  describe('safeAsync', () => {
    it('returns value on success', async () => {
      const fn = jest.fn().mockResolvedValue(42);
      const result = await safeAsync(fn, null, { showAlert: false });
      expect(result).toBe(42);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('returns fallback on error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const result = await safeAsync(fn, 99, { showAlert: false });
      expect(result).toBe(99);
    });

    it('returns null fallback by default on error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const result = await safeAsync(fn);
      expect(result).toBeNull();
    });

    it('handles sync errors', async () => {
      const fn = jest.fn().mockImplementation(() => { throw new Error('sync fail'); });
      const result = await safeAsync(fn, 'fallback', { showAlert: false });
      expect(result).toBe('fallback');
    });
  });

  describe('toResult', () => {
    it('returns ok:true with value when successful', async () => {
      const fn = toResult(() => Promise.resolve('success'), ErrorCode.GEN_UNKNOWN);
      const result = await fn();
      expect(result).toEqual({ ok: true, value: 'success' });
    });

    it('returns ok:false with error when rejected', async () => {
      const err = new AppError('rejected', ErrorCode.API_NETWORK_ERROR);
      const fn = toResult(() => Promise.reject(err), ErrorCode.API_NETWORK_ERROR);
      const result = await fn();
      expect(result.ok).toBe(false);
      expect((result as { ok: false; error: AppError }).error.message).toBe('rejected');
    });

    it('uses custom error code', async () => {
      const fn = toResult(() => Promise.reject(new Error('err')), ErrorCode.CAM_CAPTURE_FAILED);
      const result = await fn();
      expect(result.ok).toBe(false);
      expect((result as { ok: false; error: AppError }).error.code).toBe(ErrorCode.CAM_CAPTURE_FAILED);
    });
  });

  describe('resultOf', () => {
    it('returns ok:true with value when successful', async () => {
      const result = await resultOf(() => Promise.resolve(100), ErrorCode.GEN_UNKNOWN);
      expect(result).toEqual({ ok: true, value: 100 });
    });

    it('returns ok:false with error when rejected', async () => {
      const err = new StorageError('disk full', ErrorCode.STOR_DISK_FULL);
      const result = await resultOf(() => Promise.reject(err), ErrorCode.STOR_DISK_FULL);
      expect(result.ok).toBe(false);
      expect((result as { ok: false; error: AppError }).error).toBeInstanceOf(StorageError);
    });

    it('wraps non-AppError errors with default code', async () => {
      const result = await resultOf(() => Promise.reject(new Error('plain')), ErrorCode.API_NETWORK_ERROR);
      expect(result.ok).toBe(false);
      expect((result as { ok: false; error: AppError }).error.code).toBe(ErrorCode.API_NETWORK_ERROR);
    });
  });
});