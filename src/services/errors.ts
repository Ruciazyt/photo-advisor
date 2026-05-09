/**
 * Unified Error Handling Layer
 *
 * Architecture:
 * - AppError: base error class with code + severity
 * - DomainError: business logic errors (CameraError, StorageError, APIError, etc.)
 * - errorToString(): safe string conversion
 * - handleError(): global handler with Alert/log/recovery support
 * - useErrorHandler(): React hook for component-level error handling
 *
 * Error codes follow: {DOMAIN}-{MODULE}-{NUMBER}
 * e.g. CAM-PERM-001, API-AUTH-401, STOR-DISK-001
 */

// ---- Error Codes ----

export const ErrorCode = {
  // Camera errors (CAM-*)
  CAM_PERMISSION_DENIED: 'CAM-PERM-001',
  CAM_NOT_AVAILABLE: 'CAM-PERM-002',
  CAM_CAPTURE_FAILED: 'CAM-CAPT-001',
  CAM_RAW_UNSUPPORTED: 'CAM-CAPT-002',

  // Storage / File errors (STOR-*)
  STOR_READ_FAILED: 'STOR-READ-001',
  STOR_WRITE_FAILED: 'STOR-WRITE-001',
  STOR_DISK_FULL: 'STOR-DISK-001',
  STOR_FILE_NOT_FOUND: 'STOR-FILE-001',
  STOR_PERMISSION_DENIED: 'STOR-PERM-001',

  // API errors (API-*)
  API_NETWORK_ERROR: 'API-NET-001',
  API_TIMEOUT: 'API-NET-002',
  API_AUTH_FAILED: 'API-AUTH-401',
  API_AUTH_MISSING: 'API-AUTH-001',
  API_SERVER_ERROR: 'API-SRV-500',
  API_INVALID_RESPONSE: 'API-RESP-001',
  API_RATE_LIMITED: 'API-RATE-429',

  // Location errors (LOC-*)
  LOC_PERMISSION_DENIED: 'LOC-PERM-001',
  LOC_UNAVAILABLE: 'LOC-001',
  LOC_TIMEOUT: 'LOC-TIME-001',

  // Media / Gallery errors (MED-*)
  MED_LOAD_FAILED: 'MED-LOAD-001',
  MED_SAVE_FAILED: 'MED-SAVE-001',

  // Config / Settings errors (CFG-*)
  CFG_MISSING: 'CFG-001',
  CFG_INVALID: 'CFG-002',

  // General / Unknown (GEN-*)
  GEN_UNKNOWN: 'GEN-UNK-001',
  GEN_OPERATION_CANCELLED: 'GEN-CANCEL-001',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ---- Error Severity ----

export type ErrorSeverity = 'silent' | 'info' | 'warning' | 'error' | 'critical';

// ---- AppError ----

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context?: string;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity = 'error',
    recoverable = false,
    context?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.recoverable = recoverable;
    this.context = context;

    // Maintains proper stack trace in V8 environments
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, AppError);
    }
  }

  toString(): string {
    return `[${this.code}] ${this.message}${this.context ? ` (${this.context})` : ''}`;
  }
}

// ---- Domain Errors ----

export class CameraError extends AppError {
  constructor(message: string, code: ErrorCode, severity: ErrorSeverity = 'error', recoverable = false) {
    super(message, code, severity, recoverable, 'CameraError');
    this.name = 'CameraError';
  }
}

export class StorageError extends AppError {
  constructor(message: string, code: ErrorCode, severity: ErrorSeverity = 'error', recoverable = false) {
    super(message, code, severity, recoverable, 'StorageError');
    this.name = 'StorageError';
  }
}

export class APIError extends AppError {
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode?: number,
    severity: ErrorSeverity = 'error',
    recoverable = true
  ) {
    super(message, code, severity, recoverable, 'APIError');
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

export class LocationError extends AppError {
  constructor(message: string, code: ErrorCode, severity: ErrorSeverity = 'warning', recoverable = false) {
    super(message, code, severity, recoverable, 'LocationError');
    this.name = 'LocationError';
  }
}

export class MediaError extends AppError {
  constructor(message: string, code: ErrorCode, severity: ErrorSeverity = 'error', recoverable = false) {
    super(message, code, severity, recoverable, 'MediaError');
    this.name = 'MediaError';
  }
}

export class ConfigError extends AppError {
  constructor(message: string, code: ErrorCode, severity: ErrorSeverity = 'warning', recoverable = true) {
    super(message, code, severity, recoverable, 'ConfigError');
    this.name = 'ConfigError';
  }
}

// ---- Error Helpers ----

const SEVERITY_ORDER: Record<ErrorSeverity, number> = {
  silent: 0,
  info: 1,
  warning: 2,
  error: 3,
  critical: 4,
};

/** Check if error1 severity >= error2 severity */
export function isAtLeastSeverity(error: AppError, minSeverity: ErrorSeverity): boolean {
  return SEVERITY_ORDER[error.severity] >= SEVERITY_ORDER[minSeverity];
}

// ---- Global Error Handlers ----

type ErrorLogLevel = 'debug' | 'info' | 'warn' | 'error';

function logLevel(severity: ErrorSeverity): ErrorLogLevel {
  switch (severity) {
    case 'silent': return 'debug';
    case 'info': return 'info';
    case 'warning': return 'warn';
    case 'error':
    case 'critical': return 'error';
  }
}

function prefix(code: ErrorCode): string {
  return `[${code}]`;
}

interface HandleErrorOptions {
  /** Silent errors never log to console */
  silent?: boolean;
  /** Show Alert.dialog for this error (default: true for error/critical) */
  showAlert?: boolean;
  /** Alert title override */
  alertTitle?: string;
  /** Additional context string */
  context?: string;
  /** Callback for recovery action */
  onRecover?: () => void;
  /** Custom logger (default: console) */
  logger?: {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

const defaultLogger = console;

/**
 * Convert any unknown value to a meaningful error message string.
 */
export function errorToString(error: unknown, fallback = '发生了一个未知错误'): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

/**
 * Convert any unknown value to an AppError.
 * Preserves existing AppError instances, wraps others.
 */
export function toAppError(error: unknown, defaultCode: ErrorCode = ErrorCode.GEN_UNKNOWN): AppError {
  if (error instanceof AppError) return error;
  const message = errorToString(error);
  return new AppError(message, defaultCode, 'error', false);
}

/**
 * Unified error handler — use this instead of scattered try/catch + Alert.
 *
 * Usage:
 *   try {
 *     await doSomething();
 *   } catch (e) {
 *     handleError(e, { context: 'doSomething', showAlert: true });
 *   }
 */
export function handleError(
  error: unknown,
  options: HandleErrorOptions = {}
): AppError {
  const {
    silent = false,
    showAlert,
    alertTitle,
    context,
    onRecover,
    logger = defaultLogger,
  } = options;

  const appError = toAppError(error);

  // Enrich with context if provided
  const fullContext = [appError.context, context].filter(Boolean).join(':') || undefined;
  const displayContext = fullContext;

  const level = logLevel(appError.severity);
  const prefix_str = prefix(appError.code);
  const withContext = displayContext ? `${prefix_str} [${displayContext}]` : prefix_str;

  if (!silent && appError.severity !== 'silent') {
    const logFn = logger[level] as (...args: unknown[]) => void;
    logFn(withContext, appError.message, error instanceof Error ? { stack: error.stack } : '');
  }

  // Decide whether to show Alert
  // Default: show for error/critical unless explicitly set to false
  const shouldShowAlert = showAlert ?? (appError.severity === 'error' || appError.severity === 'critical');

  if (shouldShowAlert) {
    // Lazy import Alert to avoid issues at module init time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Alert } = require('react-native');
    const title = alertTitle ?? getDefaultAlertTitle(appError);
    const message = appError.recoverable && onRecover
      ? `${appError.message}\n\n是否重试？`
      : appError.message;

    if (appError.recoverable && onRecover) {
      Alert.alert(title, message, [
        { text: '取消', style: 'cancel' },
        { text: '重试', onPress: onRecover },
      ]);
    } else {
      Alert.alert(title, message, [{ text: '确定' }]);
    }
  }

  return appError;
}

export function getDefaultAlertTitle(error: AppError): string {
  switch (error.name) {
    case 'CameraError': return '相机错误';
    case 'StorageError': return '存储错误';
    case 'APIError': return '网络错误';
    case 'LocationError': return '定位错误';
    case 'MediaError': return '媒体错误';
    case 'ConfigError': return '配置错误';
    default: return '出错了';
  }
}

/**
 * Safe async wrapper — runs fn, handles errors, returns null on failure.
 * Use for non-critical operations where failure should be silently ignored.
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T | null = null,
  options: HandleErrorOptions = {}
): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    handleError(e, { silent: true, ...options });
    return fallback;
  }
}

/**
 * Result type for operations that can fail.
 * Use instead of throwing for expected failure cases.
 */
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Converts a throwing function to one that returns Result<T>.
 */
export function toResult<T>(
  fn: () => Promise<T>,
  errorCode: ErrorCode = ErrorCode.GEN_UNKNOWN
): () => Promise<Result<T>> {
  return async () => {
    try {
      const value = await fn();
      return { ok: true, value };
    } catch (e) {
      return { ok: false, error: toAppError(e, errorCode) };
    }
  };
}

/**
 * Wraps a try/catch block with Result pattern.
 */
export async function resultOf<T>(
  fn: () => Promise<T>,
  errorCode: ErrorCode = ErrorCode.GEN_UNKNOWN
): Promise<Result<T>> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: toAppError(e, errorCode) };
  }
}
