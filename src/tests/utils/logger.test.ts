import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '@/utils/logger';
import { LogLevel } from '@/types/settings';
import { createMockPlugin } from '@tests/mocks';

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

// Replace global console
Object.assign(global.console, mockConsole);

describe('Logger', () => {
  let logger: Logger;
  let mockPlugin: any;

  beforeEach(() => {
    mockPlugin = createMockPlugin();
    mockPlugin.settings = {
      logLevel: LogLevel.ERROR
    };

    // Clear all console mocks
    Object.values(mockConsole).forEach(mock => mock.mockClear());

    logger = Logger.create(mockPlugin, 'TestComponent');
  });

  describe('Logger Creation', () => {
    it('should create logger with plugin and component name', () => {
      expect(logger).toBeDefined();
      expect(logger['plugin']).toBe(mockPlugin); // private property
      expect(logger['context']).toBe('TestComponent'); // private property
    });

    it('should create logger without component name', () => {
      const simpleLogger = Logger.create(mockPlugin, '');
      expect(simpleLogger['context']).toBe('');
    });
  });

  describe('Log Level Filtering', () => {
    describe('SILENT Level', () => {
      beforeEach(() => {
        mockPlugin.settings.logLevel = LogLevel.SILENT;
        logger = Logger.create(mockPlugin, 'TestComponent');
      });

      it('should not log any messages', () => {
        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');
        logger.trace('Trace message');

        expect(mockConsole.error).not.toHaveBeenCalled();
        expect(mockConsole.warn).not.toHaveBeenCalled();
        expect(mockConsole.info).not.toHaveBeenCalled();
        expect(mockConsole.log).not.toHaveBeenCalled();
      });
    });

    describe('ERROR Level', () => {
      beforeEach(() => {
        mockPlugin.settings.logLevel = LogLevel.ERROR;
        logger = Logger.create(mockPlugin, 'TestComponent');
      });

      it('should only log error messages', () => {
        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');
        logger.trace('Trace message');

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).not.toHaveBeenCalled();
        expect(mockConsole.info).not.toHaveBeenCalled();
        expect(mockConsole.log).not.toHaveBeenCalled();
      });
    });

    describe('WARN Level', () => {
      beforeEach(() => {
        mockPlugin.settings.logLevel = LogLevel.WARN;
        logger = Logger.create(mockPlugin, 'TestComponent');
      });

      it('should log error and warning messages', () => {
        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');
        logger.trace('Trace message');

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.info).not.toHaveBeenCalled();
        expect(mockConsole.log).not.toHaveBeenCalled();
      });
    });

    describe('INFO Level', () => {
      beforeEach(() => {
        mockPlugin.settings.logLevel = LogLevel.INFO;
        logger = Logger.create(mockPlugin, 'TestComponent');
      });

      it('should log error, warning, and info messages', () => {
        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');
        logger.trace('Trace message');

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.info).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).not.toHaveBeenCalled();
      });
    });

    describe('DEBUG Level', () => {
      beforeEach(() => {
        mockPlugin.settings.logLevel = LogLevel.DEBUG;
        logger = Logger.create(mockPlugin, 'TestComponent');
      });

      it('should log error, warning, info, and debug messages', () => {
        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');
        logger.trace('Trace message');

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.info).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledTimes(1); // debug uses console.log
      });
    });

    describe('TRACE Level', () => {
      beforeEach(() => {
        mockPlugin.settings.logLevel = LogLevel.TRACE;
        logger = Logger.create(mockPlugin, 'TestComponent');
      });

      it('should log all messages including trace', () => {
        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');
        logger.trace('Trace message');

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.info).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledTimes(2); // debug + trace use console.log
      });
    });
  });

  describe('Message Formatting', () => {
    beforeEach(() => {
      mockPlugin.settings.logLevel = LogLevel.TRACE;
      logger = Logger.create(mockPlugin, 'TestComponent');
    });

    it('should format messages with component prefix', () => {
      logger.error('Test error');

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[TestComponent] ERROR: Test error'
      );
    });

    it('should handle multiple arguments', () => {
      logger.debug('Debug:', { data: 'value' }, 'additional info');

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[TestComponent] DEBUG:',
        'Debug:',
        { data: 'value' },
        'additional info'
      );
    });

    it('should handle objects and arrays', () => {
      const testObj = { key: 'value', nested: { data: 123 } };
      const testArray = ['item1', 'item2', 'item3'];

      logger.info('Object:', testObj);
      logger.info('Array:', testArray);

      expect(mockConsole.info).toHaveBeenCalledWith(
        '[TestComponent] INFO:',
        'Object:',
        testObj
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        '[TestComponent] INFO:',
        'Array:',
        testArray
      );
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[TestComponent] ERROR: Error occurred',
        error
      );
    });
  });

  describe('Performance Optimization', () => {
    it('should not log when log level is insufficient', () => {
      mockPlugin.settings.logLevel = LogLevel.ERROR;
      logger = Logger.create(mockPlugin, 'TestComponent');

      logger.debug('This should not be processed');

      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should not log when log level is insufficient for debug', () => {
      mockPlugin.settings.logLevel = LogLevel.WARN;
      logger = Logger.create(mockPlugin, 'TestComponent');

      logger.debug('This debug message should not appear');

      // Debug won't be logged at WARN level
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe('Settings Migration', () => {
    it('should handle missing logLevel gracefully', () => {
      // Simulate settings without logLevel
      mockPlugin.settings = {
        maxResults: 1000
      } as any;

      expect(() => {
        logger = Logger.create(mockPlugin, 'TestComponent');
        logger.debug('Debug message');
      }).not.toThrow();
    });

    it('should handle missing settings gracefully', () => {
      mockPlugin.settings = {};

      expect(() => {
        logger = Logger.create(mockPlugin, 'TestComponent');
        logger.info('Test message');
      }).not.toThrow();
    });

    it('should handle missing plugin settings', () => {
      mockPlugin.settings = { logLevel: LogLevel.ERROR };

      expect(() => {
        logger = Logger.create(mockPlugin, 'TestComponent');
        logger.error('Error message');
      }).not.toThrow();
    });
  });

  describe('Component Name Handling', () => {
    it('should handle empty component name', () => {
      mockPlugin.settings.logLevel = LogLevel.INFO;
      logger = Logger.create(mockPlugin, '');
      logger.info('Test message');

      expect(mockConsole.info).toHaveBeenCalledWith(
        '[] INFO:',
        'Test message'
      );
    });

    it('should handle special characters in component name', () => {
      mockPlugin.settings.logLevel = LogLevel.INFO;
      logger = Logger.create(mockPlugin, 'Component:With:Special/Characters');
      logger.info('Test message');

      expect(mockConsole.info).toHaveBeenCalledWith(
        '[Component:With:Special/Characters] INFO:',
        'Test message'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined messages', () => {
      mockPlugin.settings.logLevel = LogLevel.INFO;
      logger = Logger.create(mockPlugin, 'TestComponent');

      logger.info(undefined as unknown as string);

      expect(mockConsole.info).toHaveBeenCalledWith(
        '[TestComponent] INFO:',
        undefined
      );
    });

    it('should handle null messages', () => {
      mockPlugin.settings.logLevel = LogLevel.INFO;
      logger = Logger.create(mockPlugin, 'TestComponent');

      logger.info(null as unknown as string);

      expect(mockConsole.info).toHaveBeenCalledWith(
        '[TestComponent] INFO:',
        null
      );
    });

    it('should handle empty string messages', () => {
      mockPlugin.settings.logLevel = LogLevel.INFO;
      logger = Logger.create(mockPlugin, 'TestComponent');

      logger.info('');

      expect(mockConsole.info).toHaveBeenCalledWith(
        '[TestComponent] INFO:',
        ''
      );
    });

    it('should handle circular references in objects', () => {
      mockPlugin.settings.logLevel = LogLevel.INFO;
      logger = Logger.create(mockPlugin, 'TestComponent');

      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        logger.info('Circular object:', circularObj);
      }).not.toThrow();
    });
  });

  describe('Memory and Performance', () => {
    it('should respect log level filtering', () => {
      mockPlugin.settings.logLevel = LogLevel.SILENT;
      logger = Logger.create(mockPlugin, 'TestComponent');

      // These should not produce any console output
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should handle large numbers of log calls efficiently', () => {
      mockPlugin.settings.logLevel = LogLevel.ERROR; // Only allow errors
      logger = Logger.create(mockPlugin, 'TestComponent');

      const startTime = Date.now();

      // Make many calls that should be filtered out
      for (let i = 0; i < 1000; i++) {
        logger.debug(`Debug message ${i}`);
        logger.info(`Info message ${i}`);
        logger.warn(`Warning message ${i}`);
      }

      const endTime = Date.now();

      // Should complete quickly since all calls are filtered out early
      expect(endTime - startTime).toBeLessThan(50);

      // Verify no actual console calls were made
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Plugin Lifecycle', () => {
    it('should work when plugin is being loaded', () => {
      mockPlugin.isLoaded = false;
      logger = Logger.create(mockPlugin, 'TestComponent');

      expect(() => {
        logger.info('Plugin loading message');
      }).not.toThrow();
    });

    it('should work when plugin is being unloaded', () => {
      mockPlugin.isLoaded = false;
      logger = Logger.create(mockPlugin, 'TestComponent');

      expect(() => {
        logger.warn('Plugin unloading message');
      }).not.toThrow();
    });

    it('should handle plugin settings changes', () => {
      mockPlugin.settings.logLevel = LogLevel.ERROR;
      logger = Logger.create(mockPlugin, 'TestComponent');

      logger.debug('Should not appear');
      expect(mockConsole.log).not.toHaveBeenCalled();

      // Change settings
      mockPlugin.settings.logLevel = LogLevel.DEBUG;

      logger.debug('Should appear now');
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });
});