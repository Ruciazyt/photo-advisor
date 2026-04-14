/**
 * useErrorHandler — React hook for component-level error handling.
 *
 * Features:
 * - Wraps handleError with React state for UI feedback
 * - Tracks last error for display purposes
 * - Provides safeTry() wrapper for async operations
 * - Supports error recovery callbacks
 *
 * Usage:
 *
 *   const { handleError, lastError, isErrorVisible, dismissError } = useErrorHandler();
 *
 *   const onPress = () => {
 *     handleError(doSomethingRisky(), { context: 'onPress', showAlert: true });
 *   };
 *
 *   // Or with safeTry:
 *   const onPress = async () => {
 *     const result = await safeTry(doSomethingRisky, ErrorCode.GEN_UNKNOWN);
 *     if (!result.ok) handleError(result.error, { context: 'onPress' });
 *   };
 */

import { useCallback, useRef, useState } from 'react';
import { AppError, ErrorCode, handleError as globalHandleError } from '../services/errors';
import type { HandleErrorOptions } from '../types';

export interface UseErrorHandlerOptions {
  /** Default options applied to every handleError call */
  defaultOptions?: HandleErrorOptions;
}

export interface UseErrorHandlerReturn {
  /**
   * Handle an error (AppError or unknown) with optional Alert display.
   * Returns the normalized AppError.
   */
  handleError: (error: unknown, options?: HandleErrorOptions) => AppError;

  /**
   * Last error that was handled (most recent).
   */
  lastError: AppError | null;

  /**
   * Whether an error is currently being shown in UI.
   */
  isErrorVisible: boolean;

  /**
   * Dismiss the current error UI.
   */
  dismissError: () => void;

  /**
   * Wraps an async function with error handling.
   * Returns the result or null on error.
   * Does NOT show Alert automatically.
   *
   * Usage:
   *   const result = await safeTry(
   *     () => fetchData(id),
   *     ErrorCode.API_NETWORK_ERROR
   *   );
   *   if (!result.ok) handleError(result.error, { context: 'fetchData' });
   *   else setData(result.value);
   */
  safeTry: <T>(
    fn: () => Promise<T>,
    errorCode?: ErrorCode
  ) => Promise<{ ok: true; value: T } | { ok: false; error: AppError }>;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const { defaultOptions = {} } = options;

  const [lastError, setLastError] = useState<AppError | null>(null);
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const onRecoverRef = useRef<(() => void) | undefined>();

  const handleError = useCallback(
    (error: unknown, extraOptions: HandleErrorOptions = {}): AppError => {
      const merged: HandleErrorOptions = {
        ...defaultOptions,
        ...extraOptions,
        onRecover: extraOptions.onRecover ?? defaultOptions.onRecover,
      };

      const appError = globalHandleError(error, merged);

      // Track last error for UI purposes
      setLastError(appError);
      setIsErrorVisible(true);
      onRecoverRef.current = merged.onRecover;

      return appError;
    },
    [defaultOptions]
  );

  const dismissError = useCallback(() => {
    setIsErrorVisible(false);
  }, []);

  const safeTry = useCallback(
    async <T>(
      fn: () => Promise<T>,
      errorCode: ErrorCode = ErrorCode.GEN_UNKNOWN
    ): Promise<{ ok: true; value: T } | { ok: false; error: AppError }> => {
      try {
        const value = await fn();
        return { ok: true, value };
      } catch (e) {
        const { toAppError } = require('../services/errors');
        const appError = toAppError(e, errorCode);
        return { ok: false, error: appError };
      }
    },
    []
  );

  return {
    handleError,
    lastError,
    isErrorVisible,
    dismissError,
    safeTry,
  };
}
