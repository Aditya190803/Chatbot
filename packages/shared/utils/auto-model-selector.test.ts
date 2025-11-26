import { describe, it, expect } from 'vitest';
import { selectModelForQuery, getModelSelectionReason } from './auto-model-selector';
import { ChatMode } from '../config';

describe('auto-model-selector', () => {
    describe('selectModelForQuery', () => {
        it('should select Flash for image-related queries', () => {
            expect(selectModelForQuery('analyze this image')).toBe(ChatMode.GEMINI_2_5_FLASH);
            expect(selectModelForQuery('what is in this photo')).toBe(ChatMode.GEMINI_2_5_FLASH);
        });

        it('should select Flash when hasImage is true', () => {
            expect(selectModelForQuery('describe what you see', true)).toBe(ChatMode.GEMINI_2_5_FLASH);
        });

        it('should select DeepSeek Chat for coding queries', () => {
            expect(selectModelForQuery('write a python function to sort an array')).toBe(ChatMode.DEEPSEEK_CHAT_V3_1);
            expect(selectModelForQuery('debug this javascript code error')).toBe(ChatMode.DEEPSEEK_CHAT_V3_1);
        });

        it('should select DeepSeek R1 for math/reasoning queries', () => {
            expect(selectModelForQuery('solve this equation and prove the theorem')).toBe(ChatMode.DEEPSEEK_R1);
            // 'calculate' and 'algorithm' also match code indicators, so use pure math query
            expect(selectModelForQuery('prove the mathematical theorem using logic and reasoning')).toBe(ChatMode.DEEPSEEK_R1);
        });

        it('should select Gemini Pro for research-intensive queries', () => {
            const longQuery = 'I need a comprehensive detailed analysis of ' + 
                'the economic factors affecting global supply chains '.repeat(3);
            expect(selectModelForQuery(longQuery)).toBe(ChatMode.GEMINI_2_5_PRO);
        });

        it('should select GLM for creative writing queries', () => {
            expect(selectModelForQuery('write a creative story about a character in fiction')).toBe(ChatMode.GLM_4_5_AIR);
        });

        it('should select Flash for short queries', () => {
            expect(selectModelForQuery('what is the weather')).toBe(ChatMode.GEMINI_2_5_FLASH);
        });

        it('should select Flash for translation queries', () => {
            expect(selectModelForQuery('translate this to Spanish')).toBe(ChatMode.GEMINI_2_5_FLASH);
        });
    });

    describe('getModelSelectionReason', () => {
        it('should explain image selection', () => {
            const reason = getModelSelectionReason('analyze this image', ChatMode.GEMINI_2_5_FLASH);
            expect(reason).toContain('Multimodal');
        });

        it('should explain coding selection', () => {
            const reason = getModelSelectionReason('write some code', ChatMode.DEEPSEEK_CHAT_V3_1);
            expect(reason).toContain('coding');
        });

        it('should explain reasoning selection', () => {
            const reason = getModelSelectionReason('prove this', ChatMode.DEEPSEEK_R1);
            expect(reason).toContain('reasoning');
        });

        it('should explain research selection', () => {
            const reason = getModelSelectionReason('research this topic', ChatMode.GEMINI_2_5_PRO);
            expect(reason).toContain('research');
        });

        it('should provide default explanation for unknown model', () => {
            const reason = getModelSelectionReason('test', 'unknown' as ChatMode);
            expect(reason).toBe('General-purpose model');
        });
    });
});
