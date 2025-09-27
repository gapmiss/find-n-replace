import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchEngine } from '../../core/searchEngine';
import { ReplacementEngine } from '../../core/replacementEngine';
import { SearchOptions } from '../../types';
import { createMockApp, createMockPlugin } from '../mocks';

describe('Multiline Search Functionality', () => {
    let searchEngine: SearchEngine;
    let replacementEngine: ReplacementEngine;
    let mockApp: any;
    let mockPlugin: any;

    // Test file content with multiline patterns
    const multilineContent = `First line content here
Second line with work
Third line continuation
Fourth line with more text

Another paragraph here
work continues on next line
and more content after`;

    const singleLineContent = `Just a single line with work keyword here`;

    beforeEach(() => {
        mockApp = createMockApp();
        mockPlugin = createMockPlugin(mockApp);
        searchEngine = new SearchEngine(mockApp, mockPlugin);
        replacementEngine = new ReplacementEngine(mockApp, mockPlugin, searchEngine);

        // Reset and setup test files
        mockApp.vault.reset();

        // Add test files with multiline and single line content
        mockApp.vault.addFile('multiline.md', multilineContent);
        mockApp.vault.addFile('singleline.md', singleLineContent);
    });

    describe('Multiline Pattern Matching', () => {
        it('should find multiline patterns when multiline is enabled', async () => {
            const results = await searchEngine.performSearch('work\\nThird', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);

            // Verify the match spans multiple lines
            const match = results[0];
            expect(match.matchText).toContain('\n');
            expect(match.matchText).toContain('work');
            expect(match.matchText).toContain('Third');
        });

        it('should NOT find multiline patterns when multiline is disabled', async () => {
            const results = await searchEngine.performSearch('work\\nThird', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: false
            });

            expect(results.length).toBe(0);
        });

        it('should NOT find multiline patterns when regex is disabled', async () => {
            const results = await searchEngine.performSearch('work\\nThird', {
                matchCase: false,
                wholeWord: false,
                useRegex: false,
                multiline: true
            });

            expect(results.length).toBe(0);
        });

        it('should find patterns with line endings (\\n)', async () => {
            const results = await searchEngine.performSearch('work\\n', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].matchText).toMatch(/work\n/);
        });

        it('should find patterns that span multiple lines with capture groups', async () => {
            const results = await searchEngine.performSearch('(work)\\n(\\w+)', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
            const match = results[0];
            expect(match.matchText).toContain('work');
            expect(match.matchText).toContain('\n');
        });

        it('should work with start and end anchors in multiline mode', async () => {
            const results = await searchEngine.performSearch('^work.*\\n.*content', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
        });

        it('should properly calculate line and column positions for multiline matches', async () => {
            const results = await searchEngine.performSearch('work.*\\n.*and', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
            const match = results[0];

            // Should start at the line containing "work"
            expect(match.line).toBeGreaterThanOrEqual(0);
            expect(match.col).toBeGreaterThanOrEqual(0);

            // Verify the line content contains the start of the match
            expect(match.content).toContain('work');
        });
    });

    describe('Mixed Mode Search Behavior', () => {
        it('should find single-line matches when multiline is enabled', async () => {
            const results = await searchEngine.performSearch('work', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);

            // Should find matches in both files
            const filesPaths = results.map(r => r.file.path);
            expect(filesPaths).toContain('multiline.md');
            expect(filesPaths).toContain('singleline.md');
        });

        it('should handle empty matches in multiline mode', async () => {
            const results = await searchEngine.performSearch('^\\w', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
            // Should find start-of-line word characters
        });

        it('should handle complex multiline patterns', async () => {
            const results = await searchEngine.performSearch('work continues.*\\n.*and', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
            const match = results[0];
            expect(match.matchText).toContain('work continues');
            expect(match.matchText).toContain('and');
            expect(match.matchText).toContain('\n');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle multiline patterns at file boundaries', async () => {
            // Test pattern that matches at the end of file
            const results = await searchEngine.performSearch('content after$', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
        });

        it('should handle very long multiline matches', async () => {
            // Add a file with long content spanning many lines
            const longContent = Array(100).fill(0).map((_, i) => `Line ${i} with content`).join('\n');
            mockApp.vault.addFile('longfile.md', longContent);

            const results = await searchEngine.performSearch('Line 0.*\\n.*Line 1.*\\n.*Line 2', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
        });

        it('should handle multiline patterns with special characters', async () => {
            mockApp.vault.addFile('special.md', 'Line with [brackets]\nNext line with (parens)');

            const results = await searchEngine.performSearch('\\[brackets\\]\\n.*\\(parens\\)', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
        });

        it('should validate multiline search queries properly', () => {
            // Test valid multiline regex
            expect(searchEngine.validateSearchQuery('work\\n.*line', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            })).toBe(true);

            // Test invalid regex
            expect(searchEngine.validateSearchQuery('[invalid', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            })).toBe(false);
        });
    });

    describe('Performance and Caching', () => {
        it('should cache multiline regex patterns properly', async () => {
            const options: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            // First search
            const results1 = await searchEngine.performSearch('work\\n.*line', options);

            // Second search with same pattern and options
            const results2 = await searchEngine.performSearch('work\\n.*line', options);

            // Results should be consistent
            expect(results1.length).toBe(results2.length);
        });

        it('should clear cache when options change', async () => {
            // Search with multiline enabled
            await searchEngine.performSearch('work\\n.*line', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            // Clear cache
            searchEngine.clearCache();

            // Search with multiline disabled should work without cached interference
            const results = await searchEngine.performSearch('work\\n.*line', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: false
            });

            expect(results.length).toBe(0);
        });

        it('should provide proper matchText for replacement preview', async () => {
            const results = await searchEngine.performSearch('(work)\\n', {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            });

            expect(results.length).toBeGreaterThan(0);
            const match = results[0];

            // The matchText should contain the newline for proper replacement preview
            expect(match.matchText).toContain('\n');
            expect(match.matchText).toContain('work');

            // Should be useful for replacement with capture groups like $1xxxx
            expect(match.matchText).toMatch(/work\n/);
        });
    });
});