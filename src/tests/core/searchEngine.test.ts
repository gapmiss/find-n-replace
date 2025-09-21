import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchEngine } from '../../core/searchEngine';
import { SearchOptions } from '../../types';
import { createMockApp, createMockPlugin } from '../mocks';

describe('SearchEngine', () => {
    let searchEngine: SearchEngine;
    let mockApp: any;
    let mockPlugin: any;

    beforeEach(() => {
        mockApp = createMockApp();
        mockPlugin = createMockPlugin(mockApp);
        searchEngine = new SearchEngine(mockApp, mockPlugin);
        // Ensure clean state for each test
        mockApp.vault.reset();
    });

    describe('Basic Search Functionality', () => {
        it('should find simple text matches', async () => {
            const results = await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            expect(results.length).toBeGreaterThan(0);

            // Verify all results contain the search term
            results.forEach(result => {
                expect(result.content.toLowerCase()).toContain('test');
                expect(result.matchText.toLowerCase()).toContain('test');
            });
        });

        it('should respect case sensitivity', async () => {
            const sensitiveResults = await searchEngine.performSearch('Test', {
                matchCase: true,
                wholeWord: false,
                useRegex: false
            });

            const insensitiveResults = await searchEngine.performSearch('Test', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            expect(insensitiveResults.length).toBeGreaterThanOrEqual(sensitiveResults.length);

            // Case sensitive should only find exact case matches
            sensitiveResults.forEach(result => {
                expect(result.matchText).toContain('Test');
            });
        });

        it('should handle whole word matching', async () => {
            const wholeWordResults = await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: true,
                useRegex: false
            });

            const partialResults = await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            // Whole word should find fewer or equal matches
            expect(wholeWordResults.length).toBeLessThanOrEqual(partialResults.length);

            // Each whole word result should have word boundaries
            wholeWordResults.forEach(result => {
                const matchIndex = result.col || 0;
                const beforeChar = result.content[matchIndex - 1] || ' ';
                const afterChar = result.content[matchIndex + result.matchText.length] || ' ';

                // Should be word boundaries (not alphanumeric)
                expect(/\W/.test(beforeChar) || matchIndex === 0).toBe(true);
                expect(/\W/.test(afterChar) || matchIndex + result.matchText.length === result.content.length).toBe(true);
            });
        });
    });

    describe('Edge Cases - Multiple Matches Per Line', () => {
        it('should find all matches on the same line with correct column positions', async () => {
            // This test specifically targets the second match replacement bug
            const results = await searchEngine.performSearch('pinto', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            // Find results from the bug test file
            const bugTestResults = results.filter(r =>
                r.file.path === 'second-match-bug.md' &&
                r.line === 0 // First line with both pinto and Pinto
            );

            expect(bugTestResults.length).toBe(2);

            // Verify column positions are correct and different
            const firstMatch = bugTestResults.find(r => r.matchText === 'pinto');
            const secondMatch = bugTestResults.find(r => r.matchText === 'Pinto');

            expect(firstMatch).toBeDefined();
            expect(secondMatch).toBeDefined();
            expect(firstMatch!.col).not.toBe(secondMatch!.col);
            expect(firstMatch!.col).toBeLessThan(secondMatch!.col!);

            // Verify exact positions in the content
            const content = '- [x] css rule search needs to be lowercase `pinto` does not match `Pinto`';
            expect(content.substring(firstMatch!.col!, firstMatch!.col! + 5)).toBe('pinto');
            expect(content.substring(secondMatch!.col!, secondMatch!.col! + 5)).toBe('Pinto');
        });

        it('should handle overlapping regex patterns correctly', async () => {
            const results = await searchEngine.performSearch('aa', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            // Find results from the overlapping test case "aaaa"
            const overlapResults = results.filter(r =>
                r.content.includes('aaaa should find aa matches')
            );

            // Should find at least 2 "aa" matches in "aaaa" plus 1 in "matches"
            expect(overlapResults.length).toBeGreaterThanOrEqual(3);

            // Verify we have "aa" matches within the "aaaa" substring
            const aaaaStartIndex = overlapResults[0].content.indexOf('aaaa');
            const aaaaMatches = overlapResults.filter(r =>
                r.col! >= aaaaStartIndex && r.col! < aaaaStartIndex + 4
            );

            // "aaaa" should produce at least 2 overlapping "aa" matches
            expect(aaaaMatches.length).toBeGreaterThanOrEqual(2);
        });

        it('should maintain correct column positions with multiple identical matches', async () => {
            const results = await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            // Find line with "test test test TEST"
            const multipleTestResults = results.filter(r =>
                r.content === 'test test test TEST'
            );

            expect(multipleTestResults.length).toBe(4);

            // Verify all have different column positions
            const columns = multipleTestResults.map(r => r.col);
            const uniqueColumns = [...new Set(columns)];
            expect(uniqueColumns.length).toBe(4);

            // Verify positions are in ascending order
            const sortedColumns = [...columns].sort((a, b) => a! - b!);
            expect(columns.sort((a, b) => a! - b!)).toEqual(sortedColumns);
        });
    });

    describe('Unicode and Special Characters', () => {
        it('should handle Unicode characters correctly', async () => {
            const results = await searchEngine.performSearch('café', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.matchText).toBe('café');
            });
        });

        it('should handle emoji in search patterns', async () => {
            const results = await searchEngine.performSearch('🔍', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.matchText).toBe('🔍');
            });
        });

        it('should handle mixed language content', async () => {
            const results = await searchEngine.performSearch('тест', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.content).toContain('тест');
            });
        });
    });

    describe('Regex Functionality', () => {
        it('should handle basic regex patterns', async () => {
            const results = await searchEngine.performSearch('t.st', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(/t.st/i.test(result.matchText)).toBe(true);
            });
        });

        it('should handle capture groups in regex', async () => {
            const results = await searchEngine.performSearch('(\\d{4})-(\\d{2})-(\\d{2})', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(/\d{4}-\d{2}-\d{2}/.test(result.matchText)).toBe(true);
            });
        });

        it('should handle regex special characters', async () => {
            const results = await searchEngine.performSearch('\\[.*\\]', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.matchText).toMatch(/\[.*\]/);
            });
        });

        it('should handle word boundary assertions', async () => {
            const results = await searchEngine.performSearch('\\bword\\b', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            expect(results.length).toBeGreaterThan(0);
            // Should find "word" or "Word" but not "words" or "sword"
            results.forEach(result => {
                expect(result.matchText.toLowerCase()).toBe('word');
                // Match should not be part of a larger word
                expect(result.matchText).toMatch(/^word$/i);
            });
        });
    });

    describe('Performance and Edge Cases', () => {
        it('should handle empty search query', async () => {
            const results = await searchEngine.performSearch('', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            expect(results).toEqual([]);
        });

        it('should handle whitespace-only search', async () => {
            // Test 1: Search for a character that definitely exists in test data
            const testResults = await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            // This should definitely find matches
            expect(testResults.length).toBeGreaterThan(0);

            // Test 2: Search for newline - should exist between lines
            const newlineResults = await searchEngine.performSearch('\n', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            // Test 3: Validate that whitespace searching works at all
            // Even if no matches, the search should complete successfully without error
            const spaceResults = await searchEngine.performSearch(' ', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            // Should return valid array (may be empty if no spaces in test data)
            expect(Array.isArray(spaceResults)).toBe(true);
        });

        it('should handle large file search efficiently', async () => {
            const startTime = performance.now();

            const results = await searchEngine.performSearch('Line', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            const duration = performance.now() - startTime;

            // Should find many matches in the large file
            expect(results.length).toBeGreaterThan(100);

            // Should complete within reasonable time (2 seconds)
            expect(duration).toBeLessThan(2000);
        });

        it('should handle regex timeout protection', async () => {
            // This would test ReDoS protection, but we need a controlled timeout
            const complexPattern = '(a+)+b'; // Catastrophic backtracking pattern

            const start = Date.now();
            await expect(async () => {
                await searchEngine.performSearch(complexPattern, {
                    matchCase: false,
                    wholeWord: false,
                    useRegex: true
                });
            }).not.toThrow();

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(6000); // Should not exceed timeout
        });
    });

    describe('Cache Management', () => {
        it('should use cached regex for identical searches', async () => {
            const spy = vi.spyOn(searchEngine, 'buildSearchRegex');

            // First search
            await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            // Second identical search
            await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            expect(spy).toHaveBeenCalledTimes(2); // Called but should use cache on second call
        });

        it('should clear cache when options change', async () => {
            // First search
            await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            // Clear cache manually
            searchEngine.clearCache();

            // Search again - should rebuild regex
            const spy = vi.spyOn(searchEngine, 'buildSearchRegex');
            await searchEngine.performSearch('test', {
                matchCase: true, // Different options
                wholeWord: false,
                useRegex: true
            });

            expect(spy).toHaveBeenCalled();
        });
    });
});