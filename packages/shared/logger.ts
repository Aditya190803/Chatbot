type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const getLogLevel = (): LogLevel => {
    const level = process.env.LOG_LEVEL as LogLevel;
    return LOG_LEVELS[level] !== undefined ? level : 'info';
};

const shouldLog = (level: LogLevel): boolean => {
    const currentLevel = getLogLevel();
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
};

const formatLogEntry = (entry: LogEntry): string => {
    const { timestamp, level, message, context, error } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    let output = `${prefix} ${message}`;
    
    if (context && Object.keys(context).length > 0) {
        output += ` ${JSON.stringify(context)}`;
    }
    
    if (error) {
        if (error instanceof Error) {
            output += ` | Error: ${error.message}`;
            if (error.stack) {
                output += `\n${error.stack}`;
            }
        } else {
            output += ` | Error: ${JSON.stringify(error)}`;
        }
    }
    
    return output;
};

const createLogEntry = (
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown
): LogEntry => ({
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error,
});

export const logger = {

    error: (message: string, error?: unknown, context: LogContext = {}) => {
        const entry = createLogEntry('error', message, context, error);
        console.error(formatLogEntry(entry));
    },

    info: (message: string, context: LogContext = {}) => {
        if (!shouldLog('info')) return;
        const entry = createLogEntry('info', message, context);
        console.log(formatLogEntry(entry));
    },

    warn: (message: string, context: LogContext = {}) => {
        if (!shouldLog('warn')) return;
        const entry = createLogEntry('warn', message, context);
        console.warn(formatLogEntry(entry));
    },

    debug: (message: string, context: LogContext = {}) => {
        if (!shouldLog('debug')) return;
        const entry = createLogEntry('debug', message, context);
        console.debug(formatLogEntry(entry));
    },

    child: (defaultContext: LogContext) => ({
        error: (message: string, error?: unknown, context: LogContext = {}) => 
            logger.error(message, error, { ...defaultContext, ...context }),
        info: (message: string, context: LogContext = {}) => 
            logger.info(message, { ...defaultContext, ...context }),
        warn: (message: string, context: LogContext = {}) => 
            logger.warn(message, { ...defaultContext, ...context }),
        debug: (message: string, context: LogContext = {}) => 
            logger.debug(message, { ...defaultContext, ...context }),
    }),
};