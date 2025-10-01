type LogContext = Record<string, any>;

export const logger = {
    // Log errors to console
    error: (message: string, error?: any, context: LogContext = {}) => {
        console.error(message, error, context);
    },

    // For important operational events
    info: (message: string, context: LogContext = {}) => {
        console.log(message, context);
    },

    // For potential issues that aren't errors
    warn: (message: string, context: LogContext = {}) => {
        console.warn(message, context);
    },

    // Debug logging
    debug: (message: string, context: LogContext = {}) => {
        if (process.env.LOG_LEVEL === 'debug') {
            console.debug(message, context);
        }
    },
};

