import { describe, it, expect, beforeEach } from 'vitest';
import { fc } from 'fast-check';
import { SearchEngine } from '../../core/searchEngine';
import { ReplacementEngine } from '../../core/replacementEngine';
import { createMockApp, createMockPlugin } from '../mocks';

describe('Property-Based Testing (Fuzzing)', () => {
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

    describe('Search Engine Fuzzing', () => {
        it('should handle arbitrary Unicode input without crashing', () => {
            fc.assert(
                fc.property(
                    fc.unicodeString({ minLength: 1, maxLength: 100 }),
                    async (searchTerm) => {
                        // Search should never crash, regardless of input
                        const results = await searchEngine.performSearch(searchTerm, {
                            matchCase: false,
                            wholeWord: false,
                            useRegex: false
                        });

                        // Should always return an array
                        expect(Array.isArray(results)).toBe(true);

                        // All results should have required properties
                        results.forEach(result => {
                            expect(result).toHaveProperty('file');
                            expect(result).toHaveProperty('line');
                            expect(result).toHaveProperty('content');
                            expect(result).toHaveProperty('matchText');
                            expect(result).toHaveProperty('col');
                            expect(result).toHaveProperty('pattern');

                            // Column should be valid
                            expect(typeof result.col === 'number').toBe(true);
                            expect(result.col! >= 0).toBe(true);
                            expect(result.col!).toBeLessThanOrEqual(result.content.length);

                            // Match text should be found in content at correct position
                            const actualText = result.content.substring(
                                result.col!,
                                result.col! + result.matchText.length
                            );
                            expect(actualText.toLowerCase()).toBe(result.matchText.toLowerCase());
                        });
                    }
                ),
                { numRuns: 50 } // Run 50 random test cases
            );
        });

        it('should handle arbitrary regex patterns safely', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 }),
                    async (pattern) => {
                        // Skip obviously malicious patterns for this test
                        if (pattern.includes('(a+)+') || pattern.length > 30) {
                            return;
                        }

                        try {
                            const results = await searchEngine.performSearch(pattern, {
                                matchCase: false,
                                wholeWord: false,
                                useRegex: true
                            });

                            expect(Array.isArray(results)).toBe(true);

                            // If results are found, they should be valid
                            results.forEach(result => {
                                expect(result.col! >= 0).toBe(true);
                                expect(result.line >= 0).toBe(true);
                                expect(result.matchText.length > 0).toBe(true);
                            });
                        } catch (error) {
                            // Invalid regex should be caught gracefully
                            expect(error).toBeInstanceOf(Error);
                        }
                    }
                ),
                { numRuns: 30 }
            );
        });

        it('should maintain column position accuracy with random content', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.unicodeString({ maxLength: 200 }), { minLength: 1, maxLength: 10 }),
                    fc.unicodeString({ minLength: 1, maxLength: 20 }),
                    async (contentLines, searchTerm) => {
                        // Create test file with random content
                        const content = contentLines.join('\\n');
                        mockApp.vault.addTestFile('fuzzing-test.md', content);

                        const results = await searchEngine.performSearch(searchTerm, {
                            matchCase: false,
                            wholeWord: false,
                            useRegex: false
                        });

                        // Filter to only our test file
                        const testFileResults = results.filter(r => r.file.path === 'fuzzing-test.md');

                        // Verify each match position is accurate
                        testFileResults.forEach(result => {
                            const lines = content.split('\\n');
                            const lineContent = lines[result.line] || '';

                            // Extract text at reported position
                            const extractedText = lineContent.substring(
                                result.col!,
                                result.col! + result.matchText.length
                            );

                            // Should match (case-insensitive)
                            expect(extractedText.toLowerCase()).toBe(result.matchText.toLowerCase());
                        });
                    }
                ),
                { numRuns: 25 }
            );
        });
    });

    describe('Replacement Engine Fuzzing', () => {
        it('should handle arbitrary replacement text without corruption', () => {
            fc.assert(
                fc.property(
                    fc.unicodeString({ maxLength: 100 }),
                    async (replacementText) => {
                        const results = await searchEngine.performSearch('test', {
                            matchCase: false,
                            wholeWord: false,
                            useRegex: false
                        });

                        if (results.length === 0) return;

                        const replaceResult = await replacementEngine.dispatchReplace(
                            'one',
                            results,
                            new Set(),
                            replacementText,
                            { matchCase: false, wholeWord: false, useRegex: false },
                            results[0]
                        );

                        // Should complete without error
                        expect(replaceResult.totalReplacements).toBe(1);
                        expect(replaceResult.filesModified).toBe(1);

                        // Verify replacement appears in content
                        const updatedContent = mockApp.vault.getContent(results[0].file.path);
                        if (replacementText.length > 0) {
                            expect(updatedContent).toContain(replacementText);
                        }
                    }
                ),
                { numRuns: 30 }
            );
        });

        it('should maintain file integrity with random operations', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            searchTerm: fc.string({ minLength: 1, maxLength: 10 }),
                            replacement: fc.string({ maxLength: 20 }),
                            useRegex: fc.boolean()
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (operations) => {
                        // Reset to clean state
                        mockApp.vault.reset();

                        for (const op of operations) {
                            try {
                                const results = await searchEngine.performSearch(op.searchTerm, {
                                    matchCase: false,
                                    wholeWord: false,
                                    useRegex: op.useRegex
                                });

                                if (results.length > 0) {
                                    await replacementEngine.dispatchReplace(
                                        'one',
                                        results,
                                        new Set(),
                                        op.replacement,
                                        { matchCase: false, wholeWord: false, useRegex: op.useRegex },
                                        results[0]
                                    );
                                }
                            } catch (error) {
                                // Some operations may fail due to invalid regex, which is acceptable
                                if (op.useRegex) {
                                    expect(error).toBeInstanceOf(Error);
                                } else {
                                    // Non-regex operations should not fail
                                    throw error;
                                }
                            }
                        }

                        // Verify all files are still readable
                        const files = mockApp.vault.getMarkdownFiles();
                        for (const file of files) {
                            const content = await mockApp.vault.read(file);
                            expect(typeof content).toBe('string');
                        }
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should handle edge case column positions correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 1000 }),
                    fc.string({ minLength: 1, maxLength: 50 }),
                    async (lineNumber, content) => {
                        // Create a file with content at specific line
                        const lines = Array(lineNumber).fill('padding line').concat([content]);
                        const testContent = lines.join('\\n');

                        mockApp.vault.addTestFile('edge-case-test.md', testContent);

                        const results = await searchEngine.performSearch('padding', {
                            matchCase: false,
                            wholeWord: false,
                            useRegex: false
                        });

                        // Find results from our test line
                        const testResults = results.filter(r =>
                            r.file.path === 'edge-case-test.md' && r.line < lineNumber
                        );

                        // Each result should have valid column position
                        testResults.forEach(result => {
                            expect(result.col! >= 0).toBe(true);
                            expect(result.col!).toBeLessThanOrEqual(result.content.length);

                            // Try replacing one
                            if (testResults.length > 0) {
                                return replacementEngine.dispatchReplace(
                                    'one',
                                    results,
                                    new Set(),
                                    'FUZZ_REPLACED',
                                    { matchCase: false, wholeWord: false, useRegex: false },
                                    testResults[0]
                                );
                            }
                        });
                    }
                ),
                { numRuns: 15 }
            );
        });
    });

    describe('Stress Testing with Random Data', () => {
        it('should handle high-volume operations without memory leaks', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.string({ minLength: 1, maxLength: 5 }), { minLength: 10, maxLength: 50 }),
                    async (searchTerms) => {
                        const startMemory = process.memoryUsage?.().heapUsed ?? 0;

                        // Perform many search operations
                        for (const term of searchTerms) {
                            const results = await searchEngine.performSearch(term, {
                                matchCase: false,
                                wholeWord: false,
                                useRegex: false
                            });

                            // Perform replacements on some results
                            if (results.length > 0 && Math.random() > 0.5) {
                                await replacementEngine.dispatchReplace(
                                    'one',
                                    results,
                                    new Set(),
                                    'STRESS_TEST',
                                    { matchCase: false, wholeWord: false, useRegex: false },
                                    results[0]
                                );
                            }
                        }

                        const endMemory = process.memoryUsage?.().heapUsed ?? 0;
                        const memoryIncrease = endMemory - startMemory;

                        // Memory should not increase dramatically (> 50MB would be concerning)
                        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
                    }
                ),
                { numRuns: 5 } // Fewer runs for stress test
            );
        });

        it('should maintain search result consistency under random inputs', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 10 }),
                    fc.boolean(),
                    fc.boolean(),
                    async (searchTerm, matchCase, wholeWord) => {
                        // Perform same search twice
                        const results1 = await searchEngine.performSearch(searchTerm, {
                            matchCase,
                            wholeWord,
                            useRegex: false
                        });

                        const results2 = await searchEngine.performSearch(searchTerm, {
                            matchCase,
                            wholeWord,
                            useRegex: false
                        });

                        // Results should be identical
                        expect(results1.length).toBe(results2.length);

                        // Compare each result
                        for (let i = 0; i < results1.length; i++) {
                            const r1 = results1[i];
                            const r2 = results2[i];

                            expect(r1.file.path).toBe(r2.file.path);
                            expect(r1.line).toBe(r2.line);
                            expect(r1.col).toBe(r2.col);
                            expect(r1.matchText).toBe(r2.matchText);
                            expect(r1.content).toBe(r2.content);
                        }
                    }
                ),
                { numRuns: 30 }
            );
        });
    });
});