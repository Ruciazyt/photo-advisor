/**
 * Unit tests for src/utils/logger.ts
 *
 * Coverage:
 * - logger.for(tag) returns a tagged logger
 * - untagged logger.log() is silent in production, logs in development
 * - debug/info/warn/error at both levels
 * - message formatting with args
 * - __DEV__=true: logs are emitted
 * - __DEV__=false: all logs are silenced
 */

import { logger } from '../logger';

// Store original console methods
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console mocks before each test
  jest.spyOn(console, 'debug').mockClear();
  jest.spyOn(console, 'info').mockClear();
  jest.spyOn(console, 'warn').mockClear();
  jest.spyOn(console, 'error').mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================================================
// Untagged logger
// ============================================================

describe('untagged logger', () => {
  describe('in development (__DEV__=true)', () => {
    beforeEach(() => {
      Object.defineProperty(global, '__DEV__', { value: true, configurable: true });
    });

    it('debug logs to console.debug', () => {
      logger.debug('hello', 'world');
      expect(console.debug).toHaveBeenCalledTimes(1);
      expect(console.debug).toHaveBeenCalledWith(
        '[PhotoAdvisor]',
        'hello world'
      );
    });

    it('info logs to console.info', () => {
      logger.info('server running');
      expect(console.info).toHaveBeenCalledTimes(1);
      expect(console.info).toHaveBeenCalledWith('[PhotoAdvisor]', 'server running');
    });

    it('warn logs to console.warn', () => {
      logger.warn('low memory');
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith('[PhotoAdvisor]', 'low memory');
    });

    it('error logs to console.error', () => {
      logger.error('network failure');
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('[PhotoAdvisor]', 'network failure');
    });

    it('formats multiple args correctly', () => {
      logger.info('values:', 1, true, null);
      expect(console.info).toHaveBeenCalledWith(
        '[PhotoAdvisor]',
        'values: 1 true null'
      );
    });

    it('handles no args gracefully', () => {
      logger.debug('just a message');
      expect(console.debug).toHaveBeenCalledWith('[PhotoAdvisor]', 'just a message');
    });
  });

  describe('in production (__DEV__=false)', () => {
    beforeEach(() => {
      Object.defineProperty(global, '__DEV__', { value: false, configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(global, '__DEV__', { value: true, configurable: true });
    });

    it('debug does not call console.debug', () => {
      logger.debug('secret');
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('info does not call console.info', () => {
      logger.info('server running');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('warn does not call console.warn', () => {
      logger.warn('low memory');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('error does not call console.error', () => {
      logger.error('network failure');
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});

// ============================================================
// Tagged logger via logger.for(tag)
// ============================================================

describe('tagged logger (logger.for(tag))', () => {
  beforeEach(() => {
    Object.defineProperty(global, '__DEV__', { value: true, configurable: true });
  });

  it('for("takePicture") returns a logger with debug/info/warn/error', () => {
    const tagged = logger.for('takePicture');
    expect(typeof tagged.debug).toBe('function');
    expect(typeof tagged.info).toBe('function');
    expect(typeof tagged.warn).toBe('function');
    expect(typeof tagged.error).toBe('function');
  });

  it('debug includes [PhotoAdvisor:tag] prefix', () => {
    logger.for('takePicture').debug('resizing');
    expect(console.debug).toHaveBeenCalledWith(
      '[PhotoAdvisor]:takePicture',
      'resizing'
    );
  });

  it('info includes [PhotoAdvisor:tag] prefix', () => {
    logger.for('analyze').info('analysis complete');
    expect(console.info).toHaveBeenCalledWith(
      '[PhotoAdvisor]:analyze',
      'analysis complete'
    );
  });

  it('warn includes [PhotoAdvisor:tag] prefix', () => {
    logger.for('capture').warn('falling back to JPEG');
    expect(console.warn).toHaveBeenCalledWith(
      '[PhotoAdvisor]:capture',
      'falling back to JPEG'
    );
  });

  it('error includes [PhotoAdvisor:tag] prefix', () => {
    logger.for('api').error('auth failed');
    expect(console.error).toHaveBeenCalledWith(
      '[PhotoAdvisor]:api',
      'auth failed'
    );
  });

  it('formats multiple args with tag prefix', () => {
    logger.for('camera').debug('width:', 1024, 'height:', 768);
    expect(console.debug).toHaveBeenCalledWith(
      '[PhotoAdvisor]:camera',
      'width: 1024 height: 768'
    );
  });

  it('for("") uses just [PhotoAdvisor] without extra colon', () => {
    logger.for('').info('no tag');
    expect(console.info).toHaveBeenCalledWith('[PhotoAdvisor]', 'no tag');
  });
});