export const generateErrorMessage = (error: Error | string) => {
    if (error instanceof Error) {
        if (error.name === 'MissingProviderKeyError') {
            return error.message;
        }
        
        // Rate limiting errors
        if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
            return 'Rate limit exceeded. Please wait a moment and try again.';
        }

        // Authentication errors
        if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
            return 'API authentication failed. Please check your API key in Settings → API Keys.';
        }

        // Authorization errors
        if (error.message.includes('403') || error.message.toLowerCase().includes('forbidden')) {
            return 'Access denied. Please verify your API key has the required permissions.';
        }
        
        // Not found errors
        if (error.message.includes('404')) {
            return 'The requested resource was not found. The API endpoint may have changed.';
        }
        
        // Server errors
        if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
            return 'The AI service is temporarily unavailable. Please try again in a few moments.';
        }

        // Timeout errors
        if (error.message.toLowerCase().includes('timeout') || error.message.toLowerCase().includes('timed out')) {
            return 'The request timed out. The AI model may be overloaded. Please try again.';
        }
        
        // Abort errors
        if (error.message.toLowerCase().includes('abort') || error.message.toLowerCase().includes('cancelled')) {
            return 'The request was cancelled.';
        }

        // API key errors
        if (
            error.message.toLowerCase().includes('api') &&
            error.message.toLowerCase().includes('key')
        ) {
            return 'Invalid API key. Please check your configuration in Settings → API Keys.';
        }
        
        // Missing credentials
        if (error.message.toLowerCase().includes('missing') && error.message.toLowerCase().includes('credential')) {
            return 'API credentials are missing. Please add your API keys in Settings → API Keys.';
        }
        
        // Network errors
        if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }
        
        // Content filtering errors
        if (error.message.toLowerCase().includes('blocked') || error.message.toLowerCase().includes('content policy')) {
            return 'Your request was blocked by content filters. Please modify your prompt and try again.';
        }
        
        // Token limit errors
        if (error.message.toLowerCase().includes('token') && (error.message.toLowerCase().includes('limit') || error.message.toLowerCase().includes('exceeded'))) {
            return 'Message too long. Please shorten your input and try again.';
        }

        // Log the actual error for debugging in development
        console.error('[generateErrorMessage] Unhandled error:', error.message);
        
        return 'Something went wrong. Please try again later.';
    }

    return 'Something went wrong. Please try again later.';
};
