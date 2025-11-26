import { describe, it, expect } from 'vitest';
import { getHostname, getHost } from './url';

describe('url utils', () => {
    describe('getHostname', () => {
        it('should extract hostname without www', () => {
            expect(getHostname('https://github.com/user/repo')).toBe('github');
        });

        it('should handle www prefix', () => {
            expect(getHostname('https://www.google.com/search')).toBe('google');
        });

        it('should handle subdomains', () => {
            expect(getHostname('https://docs.google.com/document')).toBe('docs');
        });

        it('should return original url for invalid urls', () => {
            expect(getHostname('not-a-valid-url')).toBe('not-a-valid-url');
        });

        it('should handle urls with ports', () => {
            expect(getHostname('http://localhost:3000/path')).toBe('localhost');
        });
    });

    describe('getHost', () => {
        it('should return full hostname', () => {
            expect(getHost('https://github.com/user/repo')).toBe('github.com');
        });

        it('should return undefined for invalid urls', () => {
            expect(getHost('not-a-valid-url')).toBeUndefined();
        });

        it('should handle subdomains', () => {
            expect(getHost('https://docs.google.com/document')).toBe('docs.google.com');
        });

        it('should handle urls with ports', () => {
            expect(getHost('http://localhost:3000/path')).toBe('localhost');
        });

        it('should handle www prefix', () => {
            expect(getHost('https://www.example.com/page')).toBe('www.example.com');
        });
    });
});
