/**
 * useErrorHandler unit tests
 */
import { act, renderHook } from '@testing-library/react-native';
import { useErrorHandler } from '../useErrorHandler';
import * as errors from '../../services/errors';

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  // Mock global handleError to avoid side effects (Alert, console noise)
  jest.spyOn(errors, 'handleError').mockImplementation((error, _options) => {
    if (error instanceof errors.AppError) return error;
    return errors.toAppError(error, errors.ErrorCode.GEN_UNKNOWN);
  });
  // Mock toAppError so safeTry produces stable, predictable errors
  jest.spyOn(errors, 'toAppError').mockImplementation((err, code) => {
    if (err instanceof errors.AppError) return err;
    const msg = err instanceof Error ? err.message : String(err);
    return new errors.AppError(msg, code ?? errors.ErrorCode.GEN_UNKNOWN, 'error', false);
  });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useErrorHandler', () => {
  describe('initial state', () => {
    it('starts with lastError as null', () => {
      const { result } = renderHook(() => useErrorHandler());
      expect(result.current.lastError).toBeNull();
    });

    it('starts with isErrorVisible as false', () => {
      const { result } = renderHook(() => useErrorHandler());
      expect(result.current.isErrorVisible).toBe(false);
    });
  });

  describe('handleError', () => {
    it('calls global handleError with the error', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('test');
      act(() => {
        result.current.handleError(testError);
      });
      expect(errors.handleError).toHaveBeenCalledWith(testError, expect.any(Object));
    });

    it('sets lastError to the normalized AppError', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('test');
      act(() => {
        result.current.handleError(testError);
      });
      expect(result.current.lastError).toBeInstanceOf(errors.AppError);
    });

    it('sets isErrorVisible to true after handling error', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new Error('test'));
      });
      expect(result.current.isErrorVisible).toBe(true);
    });

    it('returns the AppError', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('test');
      let returnedError: errors.AppError | null = null;
      act(() => {
        returnedError = result.current.handleError(testError);
      });
      expect(returnedError).toBeInstanceOf(errors.AppError);
    });

    it('passes merged options to global handleError', () => {
      const { result } = renderHook(() =>
        useErrorHandler({ defaultOptions: { context: 'defaultContext' } })
      );
      act(() => {
        result.current.handleError(new Error('test'), { context: 'overrideContext' });
      });
      expect(errors.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ context: 'overrideContext' })
      );
    });

    it('uses defaultOptions context when no override provided', () => {
      const { result } = renderHook(() =>
        useErrorHandler({ defaultOptions: { context: 'defaultContext' } })
      );
      act(() => {
        result.current.handleError(new Error('test'));
      });
      expect(errors.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ context: 'defaultContext' })
      );
    });

    it('tracks onRecover callback from options', () => {
      const onRecover = jest.fn();
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new Error('test'), { onRecover });
      });
      expect(onRecover).not.toHaveBeenCalled(); // stored, not called yet
    });

    it('handles AppError input without modification', () => {
      const appError = new errors.AppError('already an app error', 'ERR_TEST', 'high');
      const { result } = renderHook(() => useErrorHandler());
      let returned: errors.AppError | null = null;
      act(() => {
        returned = result.current.handleError(appError);
      });
      expect(returned).toBe(appError);
    });

    it('handles string error input', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError('string error');
      });
      expect(result.current.lastError).toBeInstanceOf(errors.AppError);
    });

    it('handles null/undefined error gracefully', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(null);
      });
      expect(result.current.lastError).toBeInstanceOf(errors.AppError);
    });
  });

  describe('dismissError', () => {
    it('sets isErrorVisible to false', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new Error('test'));
      });
      expect(result.current.isErrorVisible).toBe(true);
      act(() => {
        result.current.dismissError();
      });
      expect(result.current.isErrorVisible).toBe(false);
    });

    it('preserves lastError after dismissing', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new Error('test'));
      });
      act(() => {
        result.current.dismissError();
      });
      expect(result.current.lastError).toBeInstanceOf(errors.AppError);
    });

    it('can re-dismiss without effect', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.dismissError();
      });
      expect(result.current.isErrorVisible).toBe(false);
      act(() => {
        result.current.dismissError();
      });
      expect(result.current.isErrorVisible).toBe(false);
    });
  });

  describe('safeTry', () => {
    it('returns ok:true with value when fn resolves', async () => {
      const { result } = renderHook(() => useErrorHandler());
      let safeTryResult: { ok: true; value: string } | { ok: false; error: errors.AppError } | null = null;
      await act(async () => {
        safeTryResult = await result.current.safeTry(() => Promise.resolve('success'), errors.ErrorCode.API_NETWORK_ERROR);
      });
      expect(safeTryResult).toEqual({ ok: true, value: 'success' });
    });

    it('returns ok:false with AppError when fn rejects', async () => {
      const { result } = renderHook(() => useErrorHandler());
      let safeTryResult: { ok: true; value: string } | { ok: false; error: errors.AppError } | null = null;
      await act(async () => {
        safeTryResult = await result.current.safeTry(
          () => Promise.reject(new Error('network failure')),
          errors.ErrorCode.API_NETWORK_ERROR
        );
      });
      expect(safeTryResult).toEqual({ ok: false, error: expect.any(errors.AppError) });
    });

    it('uses default error code when none provided', async () => {
      const { result } = renderHook(() => useErrorHandler());
      let safeTryResult: { ok: true; value: string } | { ok: false; error: errors.AppError } | null = null;
      await act(async () => {
        safeTryResult = await result.current.safeTry(() => Promise.reject(new Error('fail')));
      });
      if (!safeTryResult?.ok) {
        expect(safeTryResult?.error.code).toBe(errors.ErrorCode.GEN_UNKNOWN);
      }
    });

    it('does NOT show alert on error (caller must handle via returned error)', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const handleErrorSpy = jest.spyOn(errors, 'handleError');
      await act(async () => {
        await result.current.safeTry(() => Promise.reject(new Error('fail')));
      });
      // safeTry uses toAppError internally, not handleError — so handleError should NOT be called
      expect(handleErrorSpy).not.toHaveBeenCalled();
    });

    it('propagates synchronous throws', async () => {
      const { result } = renderHook(() => useErrorHandler());
      let safeTryResult: { ok: true; value: string } | { ok: false; error: errors.AppError } | null = null;
      await act(async () => {
        safeTryResult = await result.current.safeTry(() => {
          throw new Error('sync error');
        });
      });
      expect(safeTryResult?.ok).toBe(false);
    });

    it('result.error is an AppError with a valid error code when safeTry fails', async () => {
      const { result } = renderHook(() => useErrorHandler());
      let safeTryResult: { ok: true; value: string } | { ok: false; error: errors.AppError } | null = null;
      await act(async () => {
        safeTryResult = await result.current.safeTry(
          () => Promise.reject(new Error('fail')),
          errors.ErrorCode.API_NETWORK_ERROR
        );
      });
      expect(safeTryResult?.ok).toBe(false);
      if (!safeTryResult?.ok) {
        // Error code is a non-empty string — validated to match ErrorCode values
        expect(typeof safeTryResult.error.code).toBe('string');
        expect(safeTryResult.error.code.length).toBeGreaterThan(0);
        // Verify it's a known ErrorCode value (not undefined/arbitrary)
        const allCodes = Object.values(errors.ErrorCode);
        expect(allCodes).toContain(safeTryResult.error.code);
      }
    });

    it('returned error is usable with handleError', async () => {
      const { result } = renderHook(() => useErrorHandler());
      await act(async () => {
        const ret = await result.current.safeTry(
          () => Promise.reject(new Error('fail')),
          errors.ErrorCode.API_NETWORK_ERROR
        );
        if (!ret.ok) {
          result.current.handleError(ret.error, { context: 'from safeTry' });
        }
      });
      expect(errors.handleError).toHaveBeenCalledWith(
        expect.any(errors.AppError),
        expect.objectContaining({ context: 'from safeTry' })
      );
    });
  });

  describe('defaultOptions integration', () => {
    it('merges defaultOptions into handleError calls', () => {
      const { result } = renderHook(() =>
        useErrorHandler({ defaultOptions: { alertTitle: 'Default Title' } })
      );
      act(() => {
        result.current.handleError(new Error('test'));
      });
      expect(errors.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ alertTitle: 'Default Title' })
      );
    });

    it('explicit options override defaults', () => {
      const { result } = renderHook(() =>
        useErrorHandler({ defaultOptions: { showAlert: true } })
      );
      act(() => {
        result.current.handleError(new Error('test'), { showAlert: false });
      });
      expect(errors.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ showAlert: false })
      );
    });

    it('onRecover from explicit options overrides defaultOptions.onRecover', () => {
      const defaultRecover = jest.fn();
      const explicitRecover = jest.fn();
      const { result } = renderHook(() =>
        useErrorHandler({ defaultOptions: { onRecover: defaultRecover } })
      );
      act(() => {
        result.current.handleError(new Error('test'), { onRecover: explicitRecover });
      });
      // The explicit one is passed (even if not called yet)
      expect(errors.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ onRecover: explicitRecover })
      );
    });
  });

  describe('multiple errors', () => {
    it('lastError tracks most recent error', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new Error('first'));
      });
      const firstError = result.current.lastError;
      act(() => {
        result.current.handleError(new Error('second'));
      });
      expect(result.current.lastError).not.toBe(firstError);
      expect(result.current.lastError).toBeInstanceOf(errors.AppError);
    });

    it('isErrorVisible true even for second error', () => {
      const { result } = renderHook(() => useErrorHandler());
      act(() => {
        result.current.handleError(new Error('first'));
      });
      act(() => {
        result.current.handleError(new Error('second'));
      });
      expect(result.current.isErrorVisible).toBe(true);
    });
  });
});