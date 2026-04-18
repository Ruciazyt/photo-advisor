/**
 * Tests for useErrorHandler hook
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { AppError, ErrorCode } from '../services/errors';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

const MockAlert = require('react-native').Alert;

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockAlert.alert.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('handleError', () => {
    it('returns an AppError', () => {
      const { result } = renderHook(() => useErrorHandler());
      const err = result.current.handleError(new Error('test'), { showAlert: false });
      expect(err).toBeInstanceOf(AppError);
      expect(err.message).toBe('test');
    });

    it('tracks lastError state', () => {
      const { result } = renderHook(() => useErrorHandler());
      expect(result.current.lastError).toBeNull();

      const err = new AppError('oops', ErrorCode.GEN_UNKNOWN, 'warning');
      act(() => {
        result.current.handleError(err, { showAlert: false });
      });

      expect(result.current.lastError).toBeInstanceOf(AppError);
      expect(result.current.lastError?.message).toBe('oops');
      expect(result.current.isErrorVisible).toBe(true);
    });

    it('sets isErrorVisible to true after error', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new Error('err'), { showAlert: false });
      });
      expect(result.current.isErrorVisible).toBe(true);
    });

    it('shows Alert by default for error severity', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new AppError('test', ErrorCode.GEN_UNKNOWN, 'error'), {});
      });
      expect(MockAlert.alert).toHaveBeenCalledTimes(1);
    });

    it('does not show Alert when showAlert=false', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new AppError('test', ErrorCode.GEN_UNKNOWN, 'error'), { showAlert: false });
      });
      expect(MockAlert.alert).not.toHaveBeenCalled();
    });

    it('dismissError sets isErrorVisible to false', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new Error('err'), { showAlert: false });
      });
      expect(result.current.isErrorVisible).toBe(true);

      act(() => {
        result.current.dismissError();
      });
      expect(result.current.isErrorVisible).toBe(false);
    });

    it('applies default options from constructor', () => {
      const { result } = renderHook(() =>
        useErrorHandler({ defaultOptions: { showAlert: false, context: 'defaultContext' } })
      );
      act(() => {
        result.current.handleError(new AppError('err', ErrorCode.GEN_UNKNOWN, 'warning'));
      });
      expect(MockAlert.alert).not.toHaveBeenCalled();
      expect(result.current.lastError?.message).toBe('err');
    });
  });

  describe('safeTry', () => {
    it('returns ok:true with value on success', async () => {
      const { result } = renderHook(() => useErrorHandler());
      let returned: { ok: true; value: number } | { ok: false; error: AppError } = { ok: false, error: new AppError('', ErrorCode.GEN_UNKNOWN) };
      await act(async () => {
        returned = await result.current.safeTry(() => Promise.resolve(42), ErrorCode.GEN_UNKNOWN);
      });
      expect(returned).toEqual({ ok: true, value: 42 });
    });

    it('returns ok:false with AppError on failure', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const testErr = new AppError('async fail', ErrorCode.API_NETWORK_ERROR);
      let returned: { ok: true; value: number } | { ok: false; error: AppError } = { ok: false, error: new AppError('', ErrorCode.GEN_UNKNOWN) };
      await act(async () => {
        returned = await result.current.safeTry(
          () => Promise.reject(testErr),
          ErrorCode.API_NETWORK_ERROR
        );
      });
      expect(returned.ok).toBe(false);
      expect((returned as { ok: false; error: AppError }).error.message).toBe('async fail');
    });

    it('does not throw even when async function rejects', async () => {
      const { result } = renderHook(() => useErrorHandler());
      await expect(
        act(async () => {
          await result.current.safeTry(
            () => Promise.reject(new Error('some error')),
            ErrorCode.GEN_UNKNOWN
          );
        })
      ).resolves.not.toThrow();
    });
  });
});
