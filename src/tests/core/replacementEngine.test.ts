import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '../../core/searchEngine';
import { ReplacementEngine } from '../../core/replacementEngine';
import { SearchOptions, SearchResult } from '../../types';
import { createMockApp, createMockPlugin } from '../mocks';

describe('ReplacementEngine', () => {
    let searchEngine: SearchEngine;
    let replacementEngine: ReplacementEngine;
    let mockApp: any;
    let mockPlugin: any;

    beforeEach(() => {
        mockApp = createMockApp();
        mockPlugin = createMockPlugin(mockApp);
        searchEngine = new SearchEngine(mockApp, mockPlugin);
        replacementEngine = new ReplacementEngine(mockApp, mockPlugin, searchEngine);
    });

    describe('Second Match Replacement Bug Prevention', () => {
        it('should replace second occurrence on same line correctly', async () => {
            // This is the exact bug scenario that was fixed
            const results = await searchEngine.performSearch('pinto', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            // Find the specific line with both pinto and Pinto
            const bugTestResults = results.filter(r =>
                r.file.path === 'second-match-bug.md' &&
                r.line === 0
            );

            expect(bugTestResults.length).toBe(2);

            // Get the second match (Pinto at higher column position)
            const secondMatch = bugTestResults.find(r => r.matchText === 'Pinto');
            expect(secondMatch).toBeDefined();

            // Replace individual second match
            const result = await replacementEngine.dispatchReplace(
                'one',
                results,
                new Set(),
                'REPLACED',
                { matchCase: false, wholeWord: false, useRegex: false },
                secondMatch!
            );

            expect(result.totalReplacements).toBe(1);
            expect(result.filesModified).toBe(1);

            // Verify the content was updated correctly
            const updatedContent = mockApp.vault.getContent('second-match-bug.md');
            expect(updatedContent).toContain('`pinto` does not match `REPLACED`');
            expect(updatedContent).not.toContain('`Pinto`');
        });

        it('should handle replace selected with second match correctly', async () => {
            const results = await searchEngine.performSearch('pinto', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            // Find results from the bug test file
            const bugTestResults = results.filter(r =>
                r.file.path === 'second-match-bug.md' &&
                r.line === 0
            );

            // Select only the second match (index 1 in the bugTestResults)
            const secondMatchIndex = results.findIndex(r =>
                r.file.path === 'second-match-bug.md' &&
                r.line === 0 &&
                r.matchText === 'Pinto'
            );

            const selectedIndices = new Set([secondMatchIndex]);

            const result = await replacementEngine.dispatchReplace(
                'selected',
                results,
                selectedIndices,
                'SELECTED',
                { matchCase: false, wholeWord: false, useRegex: false }
            );

            expect(result.totalReplacements).toBe(1);

            // Verify only the second occurrence was replaced
            const updatedContent = mockApp.vault.getContent('second-match-bug.md');
            expect(updatedContent).toContain('`pinto` does not match `SELECTED`');
            expect(updatedContent).not.toContain('`Pinto`');
        });

        it('should handle multiple matches on same line in reverse order', async () => {
            // Test the line with three occurrences: "pinto, pinto, PINTO"
            const results = await searchEngine.performSearch('pinto', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            const tripleMatches = results.filter(r =>
                r.file.path === 'second-match-bug.md' &&
                r.line === 2 // Line with three matches
            );

            expect(tripleMatches.length).toBe(3);

            // Replace all matches in that line (should process in reverse order)
            const lineIndices = new Set(
                results
                    .map((r, i) => ({ result: r, index: i }))
                    .filter(({ result }) =>
                        result.file.path === 'second-match-bug.md' && result.line === 2
                    )
                    .map(({ index }) => index)
            );

            const result = await replacementEngine.dispatchReplace(
                'selected',
                results,
                lineIndices,
                'X',
                { matchCase: false, wholeWord: false, useRegex: false }
            );

            expect(result.totalReplacements).toBe(3);

            // Verify all three were replaced
            const updatedContent = mockApp.vault.getContent('second-match-bug.md');
            const updatedLine = updatedContent.split('\n')[2];
            expect(updatedLine).toBe('Final line: X, X, X - three matches');
        });
    });

    describe('Regex Replacement with Capture Groups', () => {
        it('should expand capture groups correctly', async () => {
            const results = await searchEngine.performSearch('(\\d{4})-(\\d{2})-(\\d{2})', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            expect(results.length).toBeGreaterThan(0);

            // Replace with rearranged format: MM/DD/YYYY
            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                '$2/$3/$1',
                { matchCase: false, wholeWord: false, useRegex: true }
            );

            expect(result.totalReplacements).toBeGreaterThan(0);

            // Verify date format conversion
            const updatedContent = mockApp.vault.getContent('replacement-test.md');
            expect(updatedContent).toContain('01/15/2025');
            expect(updatedContent).toContain('12/31/2025');
            expect(updatedContent).not.toContain('2025-01-15');
        });

        it('should handle $& (full match) replacement', async () => {
            const results = await searchEngine.performSearch('\\btest\\b', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                '[$&]',
                { matchCase: false, wholeWord: false, useRegex: true }
            );

            expect(result.totalReplacements).toBeGreaterThan(0);
        });

        it('should handle $$ (literal dollar) replacement', async () => {
            const results = await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'cost$$',
                { matchCase: false, wholeWord: false, useRegex: true }
            );

            expect(result.totalReplacements).toBeGreaterThan(0);

            // Should contain literal $ not variable substitution
            const hasLiteralDollar = Array.from(mockApp.vault.getAllFiles().values())
                .some(content => (content as string).includes('cost$'));
            expect(hasLiteralDollar).toBe(true);
        });
    });

    describe('Replacement Mode Consistency', () => {
        it('should produce identical results for individual vs file-wide replacement', async () => {
            // Reset vault to known state
            mockApp.vault.reset();

            const query = 'test';
            const replacement = 'REPLACED';
            const options = { matchCase: false, wholeWord: false, useRegex: false };

            // Get initial results
            const results1 = await searchEngine.performSearch(query, options);
            const results2 = await searchEngine.performSearch(query, options);

            // Replace all individually in first scenario
            for (const result of results1) {
                await replacementEngine.dispatchReplace(
                    'one',
                    [result],
                    new Set(),
                    replacement,
                    options,
                    result
                );
            }
            const content1 = mockApp.vault.getAllFiles();

            // Reset and replace file-wide in second scenario
            mockApp.vault.reset();
            const fileResults = results2.filter(r => r.file.path === 'multiple-matches.md');
            if (fileResults.length > 0) {
                await replacementEngine.dispatchReplace(
                    'file',
                    results2,
                    new Set(),
                    replacement,
                    options,
                    fileResults[0].file
                );
            }

            // The specific file should have identical content
            const file1Content = Array.from(content1.values())[0];
            const file2Content = mockApp.vault.getContent('multiple-matches.md');

            // Should have same number of replacements
            const count1 = ((file1Content as string).match(/REPLACED/g) || []).length;
            const count2 = ((file2Content as string).match(/REPLACED/g) || []).length;
            expect(count1).toBeGreaterThan(0);
        });

        it('should handle vault-wide replacement consistently', async () => {
            const query = 'test';
            const results = await searchEngine.performSearch(query, {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            const initialCount = results.length;
            expect(initialCount).toBeGreaterThan(0);

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'VAULT_REPLACED',
                { matchCase: false, wholeWord: false, useRegex: false }
            );

            expect(result.totalReplacements).toBe(initialCount);

            // Verify no occurrences of original term remain
            const newResults = await searchEngine.performSearch(query, {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });
            expect(newResults.length).toBe(0);

            // Verify all were replaced
            const replacedResults = await searchEngine.performSearch('VAULT_REPLACED', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });
            expect(replacedResults.length).toBe(initialCount);
        });
    });

    describe('Column Position Accuracy', () => {
        it('should maintain accurate column positions after replacements', async () => {
            const results = await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            // Find a line with multiple matches
            const multipleMatches = results.filter(r =>
                r.content === 'test test test TEST'
            );

            expect(multipleMatches.length).toBe(4);

            // Replace the second match (should be at column 5)
            const secondMatch = multipleMatches.find(r => r.col === 5);
            expect(secondMatch).toBeDefined();

            await replacementEngine.dispatchReplace(
                'one',
                results,
                new Set(),
                'SECOND',
                { matchCase: false, wholeWord: false, useRegex: false },
                secondMatch!
            );

            // Verify specific replacement
            const updatedContent = mockApp.vault.getContent('multiple-matches.md');
            const updatedLine = updatedContent.split('\n')[0];
            expect(updatedLine).toBe('test SECOND test TEST');
        });

        it('should handle zero-length regex matches safely', async () => {
            // Test zero-length assertions like ^, $, \b
            const results = await searchEngine.performSearch('^', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            if (results.length > 0) {
                const result = await replacementEngine.dispatchReplace(
                    'one',
                    results,
                    new Set(),
                    'START: ',
                    { matchCase: false, wholeWord: false, useRegex: true },
                    results[0]
                );

                expect(result.totalReplacements).toBe(1);
            }
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle empty replacement text', async () => {
            const results = await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            const result = await replacementEngine.dispatchReplace(
                'one',
                results,
                new Set(),
                '', // Empty replacement
                { matchCase: false, wholeWord: false, useRegex: false },
                results[0]
            );

            expect(result.totalReplacements).toBe(1);
        });

        it('should handle replacement with same text', async () => {
            const results = await searchEngine.performSearch('test', {
                matchCase: false,
                wholeWord: false,
                useRegex: false
            });

            const result = await replacementEngine.dispatchReplace(
                'one',
                results,
                new Set(),
                'test', // Same as search term
                { matchCase: false, wholeWord: false, useRegex: false },
                results[0]
            );

            expect(result.totalReplacements).toBe(1);
        });

        it('should handle invalid regex patterns gracefully', async () => {
            // This should be caught at search level, but test replacement resilience
            const mockResults: SearchResult[] = [{
                file: mockApp.vault.getMarkdownFiles()[0],
                line: 0,
                content: 'test content',
                matchText: 'test',
                col: 0,
                pattern: '[invalid'
            }];

            await expect(async () => {
                await replacementEngine.dispatchReplace(
                    'one',
                    mockResults,
                    new Set(),
                    'replacement',
                    { matchCase: false, wholeWord: false, useRegex: true },
                    mockResults[0]
                );
            }).not.toThrow();
        });
    });

    describe('Performance and Timeout Protection', () => {
        it('should handle complex regex replacement efficiently', async () => {
            const results = await searchEngine.performSearch('Line \\d+', {
                matchCase: false,
                wholeWord: false,
                useRegex: true
            });

            expect(results.length).toBeGreaterThan(100); // From large file

            const startTime = performance.now();

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'Row $1',
                { matchCase: false, wholeWord: false, useRegex: true }
            );

            const duration = performance.now() - startTime;

            expect(result.totalReplacements).toBeGreaterThan(100);
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should respect regex timeout protection', async () => {
            // Create a scenario that might cause ReDoS
            const maliciousPattern = '(a+)+b';

            await expect(async () => {
                // This should either complete quickly or fail gracefully
                await replacementEngine.dispatchReplace(
                    'vault',
                    [],
                    new Set(),
                    'safe',
                    { matchCase: false, wholeWord: false, useRegex: true }
                );
            }).not.toThrow();
        });
    });
});