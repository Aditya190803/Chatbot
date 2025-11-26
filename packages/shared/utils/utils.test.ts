import { describe, it, expect, vi } from 'vitest';
import {
    getRelativeDate,
    formatNumber,
    removeExtraSpaces,
    isValidUrl,
    generateShortUUID,
    formatTickerTime,
} from './utils';

describe('utils', () => {
    describe('getRelativeDate', () => {
        it('should return "Today" for today\'s date', () => {
            const today = new Date();
            expect(getRelativeDate(today)).toBe('Today');
        });

        it('should return "Yesterday" for yesterday\'s date', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(getRelativeDate(yesterday)).toBe('Yesterday');
        });

        it('should return formatted date for older dates', () => {
            const oldDate = new Date('2023-01-15');
            expect(getRelativeDate(oldDate)).toBe('15/01/2023');
        });

        it('should handle string dates', () => {
            const today = new Date().toISOString();
            expect(getRelativeDate(today)).toBe('Today');
        });
    });

    describe('formatNumber', () => {
        it('should return number as string for small numbers', () => {
            expect(formatNumber(500)).toBe('500');
            expect(formatNumber(999)).toBe('999');
        });

        it('should format thousands with K suffix', () => {
            expect(formatNumber(1000)).toBe('1K');
            expect(formatNumber(5500)).toBe('6K');
            expect(formatNumber(999000)).toBe('999K');
        });

        it('should format millions with M suffix', () => {
            expect(formatNumber(1000000)).toBe('1M');
            expect(formatNumber(5500000)).toBe('6M');
        });
    });

    describe('removeExtraSpaces', () => {
        it('should remove extra newlines', () => {
            expect(removeExtraSpaces('hello\n\n\n\nworld')).toBe('hello\n\nworld');
        });

        it('should trim whitespace', () => {
            expect(removeExtraSpaces('  hello  ')).toBe('hello');
        });

        it('should handle undefined', () => {
            expect(removeExtraSpaces(undefined)).toBeUndefined();
        });

        it('should preserve double newlines', () => {
            expect(removeExtraSpaces('hello\n\nworld')).toBe('hello\n\nworld');
        });
    });

    describe('isValidUrl', () => {
        it('should return true for valid URLs', () => {
            expect(isValidUrl('https://example.com')).toBe(true);
            expect(isValidUrl('http://localhost:3000')).toBe(true);
            expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
        });

        it('should return false for invalid URLs', () => {
            expect(isValidUrl('not-a-url')).toBe(false);
            expect(isValidUrl('')).toBe(false);
            expect(isValidUrl('://missing-protocol')).toBe(false);
        });
    });

    describe('generateShortUUID', () => {
        it('should generate a 12 character string', () => {
            const uuid = generateShortUUID();
            expect(uuid.length).toBe(12);
        });

        it('should only contain hex characters', () => {
            const uuid = generateShortUUID();
            expect(uuid).toMatch(/^[0-9a-f]+$/);
        });

        it('should generate unique values', () => {
            const uuids = new Set();
            for (let i = 0; i < 100; i++) {
                uuids.add(generateShortUUID());
            }
            expect(uuids.size).toBe(100);
        });
    });

    describe('formatTickerTime', () => {
        it('should format seconds correctly', () => {
            expect(formatTickerTime(0)).toBe('00:00');
            expect(formatTickerTime(30)).toBe('00:30');
            expect(formatTickerTime(59)).toBe('00:59');
        });

        it('should format minutes and seconds correctly', () => {
            expect(formatTickerTime(60)).toBe('01:00');
            expect(formatTickerTime(90)).toBe('01:30');
            expect(formatTickerTime(125)).toBe('02:05');
        });

        it('should handle larger values', () => {
            expect(formatTickerTime(3600)).toBe('60:00');
            expect(formatTickerTime(3661)).toBe('61:01');
        });
    });
});
