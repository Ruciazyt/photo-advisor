import { logger } from '../utils/logger';

// Mock react-native __DEV__
jest.mock('react-native', () => ({
  __DEV__: true,
}));

describe('logger', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('global logger', () => {
    it('should call console.debug for debug level', () => {
      logger.debug('test message');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should call console.info for info level', () => {
      logger.info('test message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should call console.warn for warn level', () => {
      logger.warn('test message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should call console.error for error level', () => {
      logger.error('test message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include [PhotoAdvisor] tag in output', () => {
      logger.debug('test');
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PhotoAdvisor]'),
        expect.any(String)
      );
    });

    it('should concatenate args into message', () => {
      logger.debug('message', 'arg1', 123, true);
      const calls = consoleDebugSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const [_tag, msg] = calls[0];
      expect(msg).toContain('message');
      expect(msg).toContain('arg1');
      expect(msg).toContain('123');
      expect(msg).toContain('true');
    });

    it('should handle no args gracefully', () => {
      logger.debug('just a string');
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PhotoAdvisor]'),
        'just a string'
      );
    });
  });

  describe('namespaced logger (logger.for)', () => {
    it('should create namespaced logger with tag', () => {
      const ns = logger.for('takePicture');
      ns.debug('test');
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PhotoAdvisor]:takePicture'),
        expect.any(String)
      );
    });

    it('should support all log levels on namespaced logger', () => {
      const ns = logger.for('testModule');
      ns.debug('d');
      ns.info('i');
      ns.warn('w');
      ns.error('e');
      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should concatenate multiple args in namespaced logger', () => {
      const ns = logger.for('pickImage');
      ns.debug('resized uri:', 'file://test.png', 1024, 'x', 768);
      const calls = consoleDebugSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const [_tag, msg] = calls[0];
      expect(msg).toContain('resized uri:');
      expect(msg).toContain('file://test.png');
      expect(msg).toContain('1024');
      expect(msg).toContain('x');
      expect(msg).toContain('768');
    });
  });

  describe('silence in production', () => {
    it('should not log when __DEV__ is false', () => {
      jest.resetModules();
      const module = require('react-native');
      Object.defineProperty(module, '__DEV__', { value: false });
      const { logger: prodLogger } = require('../utils/logger');

      prodLogger.debug('should not appear');
      prodLogger.info('should not appear');
      prodLogger.warn('should not appear');
      prodLogger.error('should not appear');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});