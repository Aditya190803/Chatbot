import { ChatMode } from '../config';

/**
 * Analyzes a query and selects the most appropriate model
 */
export const selectModelForQuery = (query: string, hasImage: boolean = false): ChatMode => {
    const lowerQuery = query.toLowerCase();
    const tokens = query.split(/\s+/);
    const length = tokens.length;

    // Image-related queries
    if (hasImage || /\b(image|photo|picture|screenshot|diagram|chart|graph|visual)\b/i.test(query)) {
        return ChatMode.GEMINI_2_5_FLASH; // Fast multimodal
    }

    // Code-heavy queries (prioritize DeepSeek for coding)
    const codeIndicators = [
        'code', 'function', 'class', 'algorithm', 'debug', 'error', 'bug',
        'implement', 'refactor', 'optimize', 'python', 'javascript', 'typescript',
        'java', 'c++', 'rust', 'go', 'sql', 'api', 'regex', 'git'
    ];
    const codeScore = codeIndicators.filter(word => lowerQuery.includes(word)).length;
    if (codeScore >= 2) {
        return ChatMode.DEEPSEEK_CHAT_V3_1; // Best for coding
    }

    // Math and reasoning (DeepSeek R1 for chain-of-thought)
    const mathIndicators = [
        'calculate', 'solve', 'equation', 'math', 'proof', 'theorem',
        'reasoning', 'logic', 'derive', 'compute', 'algorithm complexity'
    ];
    const mathScore = mathIndicators.filter(word => lowerQuery.includes(word)).length;
    if (mathScore >= 2 || /\b(prove|theorem|∫|∑|∏|∂)\b/i.test(query)) {
        return ChatMode.DEEPSEEK_R1; // Chain-of-thought reasoning
    }

    // Current events / news (use models with internet access)
    const currentYear = new Date().getFullYear();
    const recentYearMentions = query.match(new RegExp(`\\b(${currentYear}|${currentYear - 1}|202[0-9])\\b`, 'g'));
    const newsIndicators = ['news', 'latest', 'recent', 'today', 'yesterday', 'current', 'breaking', 'trending'];
    const newsScore = newsIndicators.filter(word => lowerQuery.includes(word)).length;
    
    if (recentYearMentions || newsScore >= 2) {
        return ChatMode.GROK_4_FAST; // Fast with internet access
    }

    // Research-intensive queries (long, complex questions)
    if (length > 50 || /\b(research|analyze|compare|comprehensive|detailed|explain)\b/i.test(query)) {
        return ChatMode.GEMINI_2_5_PRO; // Best for deep research
    }

    // Creative writing
    const creativeIndicators = [
        'write', 'story', 'poem', 'creative', 'fiction', 'essay',
        'article', 'blog', 'script', 'dialogue', 'character'
    ];
    const creativeScore = creativeIndicators.filter(word => lowerQuery.includes(word)).length;
    if (creativeScore >= 2) {
        return ChatMode.GLM_4_5_AIR; // Good for creative tasks
    }

    // Translation queries
    if (/\b(translate|translation|language)\b/i.test(query) && length < 30) {
        return ChatMode.GEMINI_2_5_FLASH; // Fast multilingual
    }

    // Default: Fast, balanced model for general queries
    // Short queries (< 20 tokens) get Flash for speed
    if (length < 20) {
        return ChatMode.GEMINI_2_5_FLASH;
    }

    // Medium queries get balanced model
    return ChatMode.DEEPSEEK_CHAT_V3_1;
};

/**
 * Gets a human-readable explanation for why a model was selected
 */
export const getModelSelectionReason = (query: string, selectedModel: ChatMode): string => {
    const lowerQuery = query.toLowerCase();
    
    switch (selectedModel) {
        case ChatMode.GEMINI_2_5_FLASH:
            if (/\b(image|photo|picture)\b/i.test(query)) {
                return 'Multimodal capabilities for image analysis';
            }
            return 'Fast response for quick queries';
        
        case ChatMode.GEMINI_2_5_PRO:
            return 'Deep research and comprehensive analysis';
        
        case ChatMode.DEEPSEEK_CHAT_V3_1:
            if (lowerQuery.includes('code')) {
                return 'Optimized for coding tasks';
            }
            return 'Balanced performance for general queries';
        
        case ChatMode.DEEPSEEK_R1:
            return 'Advanced reasoning with chain-of-thought';
        
        case ChatMode.GROK_4_FAST:
            return 'Real-time information with internet access';
        
        case ChatMode.GLM_4_5_AIR:
            return 'Creative content generation';
        
        default:
            return 'General-purpose model';
    }
};
