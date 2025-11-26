import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
    const originalEnv = process.env.LOG_LEVEL;

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env.LOG_LEVEL = originalEnv;
        vi.restoreAllMocks();
    });

    describe('error', () => {
        it('should always log errors regardless of log level', () => {
            process.env.LOG_LEVEL = 'error';
            logger.error('test error', new Error('test'));
            expect(console.error).toHaveBeenCalled();
        });

        it('should include error stack trace', () => {
            const error = new Error('test error');
            logger.error('test message', error);
            const mockFn = console.error as ReturnType<typeof vi.fn>;
            const call = mockFn.mock.calls[0][0] as string;
            expect(call).toContain('test message');
            expect(call).toContain('Error: test error');
        });
    });

    describe('info', () => {
        it('should log info when log level is info', () => {
            process.env.LOG_LEVEL = 'info';
            logger.info('test info');
            expect(console.log).toHaveBeenCalled();
        });

        it('should not log info when log level is error', () => {
            process.env.LOG_LEVEL = 'error';
            logger.info('test info');
            expect(console.log).not.toHaveBeenCalled();
        });
    });

    describe('warn', () => {
        it('should log warnings when log level is warn or lower', () => {
            process.env.LOG_LEVEL = 'warn';
            logger.warn('test warning');
            expect(console.warn).toHaveBeenCalled();
        });

        it('should not log warnings when log level is error', () => {
            process.env.LOG_LEVEL = 'error';
            logger.warn('test warning');
            expect(console.warn).not.toHaveBeenCalled();
        });
    });

    describe('debug', () => {
        it('should log debug when log level is debug', () => {
            process.env.LOG_LEVEL = 'debug';
            logger.debug('test debug');
            expect(console.debug).toHaveBeenCalled();
        });

        it('should not log debug when log level is info', () => {
            process.env.LOG_LEVEL = 'info';
            logger.debug('test debug');
            expect(console.debug).not.toHaveBeenCalled();
        });
    });

    describe('child logger', () => {
        it('should include parent context in all logs', () => {
            process.env.LOG_LEVEL = 'info';
            const childLogger = logger.child({ module: 'test-module' });
            childLogger.info('child log message');
            const mockFn = console.log as ReturnType<typeof vi.fn>;
            const call = mockFn.mock.calls[0][0] as string;
            expect(call).toContain('test-module');
            expect(call).toContain('child log message');
        });

        it('should merge child and parent context', () => {
            process.env.LOG_LEVEL = 'info';
            const childLogger = logger.child({ module: 'parent' });
            childLogger.info('message', { extra: 'context' });
            const mockFn = console.log as ReturnType<typeof vi.fn>;
            const call = mockFn.mock.calls[0][0] as string;
            expect(call).toContain('parent');
            expect(call).toContain('extra');
        });
    });

    describe('log formatting', () => {
        it('should include timestamp in logs', () => {
            process.env.LOG_LEVEL = 'info';
            logger.info('test message');
            const mockFn = console.log as ReturnType<typeof vi.fn>;
            const call = mockFn.mock.calls[0][0] as string;
            // ISO timestamp pattern
            expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should include log level in logs', () => {
            process.env.LOG_LEVEL = 'info';
            logger.info('test message');
            const mockFn = console.log as ReturnType<typeof vi.fn>;
            const call = mockFn.mock.calls[0][0] as string;
            expect(call).toContain('[INFO]');
        });

        it('should include context as JSON', () => {
            process.env.LOG_LEVEL = 'info';
            logger.info('test message', { userId: '123', action: 'test' });
            const mockFn = console.log as ReturnType<typeof vi.fn>;
            const call = mockFn.mock.calls[0][0] as string;
            expect(call).toContain('"userId":"123"');
            expect(call).toContain('"action":"test"');
        });
    });
});
