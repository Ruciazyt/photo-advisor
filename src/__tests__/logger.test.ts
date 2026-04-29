import { logger } from '../utils/logger';

// Mock react-native's __DEV__ for testing
let originalDev: boolean;

beforeEach(() => {
  // __DEV__ is a compile-time constant in react-native, so we can't truly override it.
  // We test the public API surface instead.
});

describe('logger', () => {
  describe('logger.for(tag)', () => {
    it('creates a namespaced logger with debug, info, warn, error', () => {
      const l = logger.for('TestModule');
      expect(typeof l.debug).toBe('function');
      expect(typeof l.info).toBe('function');
      expect(typeof l.warn).toBe('function');
      expect(typeof l.error).toBe('function');
    });

    it('namespaced logger has consistent output shape', () => {
      const l1 = logger.for('A');
      const l2 = logger.for('A');
      expect(Object.keys(l1)).toEqual(['debug', 'info', 'warn', 'error']);
      expect(Object.keys(l2)).toEqual(['debug', 'info', 'warn', 'error']);
    });
  });

  describe('global logger shortcut', () => {
    it('exports debug, info, warn, error', () => {
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });

  describe('API surface', () => {
    it('accepts message and args', () => {
      // In __DEV__ these would call console.*; we just verify no throw
      expect(() => logger.debug('hello')).not.toThrow();
      expect(() => logger.info('hello', 1, 'a')).not.toThrow();
      expect(() => logger.warn('hello', { key: 'value' })).not.toThrow();
      expect(() => logger.error('hello', null, undefined)).not.toThrow();
    });

    it('for() logger accepts message and args', () => {
      const l = logger.for('SomeTag');
      expect(() => l.debug('msg')).not.toThrow();
      expect(() => l.info('msg', 1, 2)).not.toThrow();
      expect(() => l.warn('msg')).not.toThrow();
      expect(() => l.error('msg')).not.toThrow();
    });
  });
});