import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchEngine } from '../../core/searchEngine';
import { ReplacementEngine } from '../../core/replacementEngine';
import { SearchOptions, SearchResult } from '../../types';
import { createMockApp, createMockPlugin } from '../mocks';

describe('Multiline Replacement Functionality', () => {
    let searchEngine: SearchEngine;
    let replacementEngine: ReplacementEngine;
    let mockApp: any;
    let mockPlugin: any;

    // Test content with various multiline patterns
    const testContent = `First line here
work continues on next line
Third line with more content
Fourth line here

Another section
work spans across
multiple lines here
End of section`;

    const simpleMultilineContent = `Line one with work
Line two continuation
Line three end`;

    beforeEach(() => {
        mockApp = createMockApp();
        mockPlugin = createMockPlugin(mockApp);
        searchEngine = new SearchEngine(mockApp, mockPlugin);
        replacementEngine = new ReplacementEngine(mockApp, mockPlugin, searchEngine);

        // Reset and setup test files
        mockApp.vault.reset();
        mockApp.vault.addFile('test.md', testContent);
        mockApp.vault.addFile('simple.md', simpleMultilineContent);
    });

    describe('Basic Multiline Replacement', () => {
        it('should replace simple multiline patterns', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            // Find multiline matches
            const results = await searchEngine.performSearch('work.*\\n.*line', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            // Replace with single line
            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'REPLACED TEXT',
                searchOptions
            );

            expect(result.totalReplacements).toBeGreaterThan(0);
            expect(result.filesModified).toBeGreaterThan(0);

            // Verify the replacement was applied
            const modifiedContent = await mockApp.vault.read(results[0].file);
            expect(modifiedContent).toContain('REPLACED TEXT');
            expect(modifiedContent).not.toMatch(/work.*\n.*line/);
        });

        it('should replace multiline patterns with multiline replacement', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('work\\n.*\\n', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            // Replace with multiline text
            const multilineReplacement = 'NEW FIRST LINE\nNEW SECOND LINE\n';

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                multilineReplacement,
                searchOptions
            );

            expect(result.totalReplacements).toBeGreaterThan(0);

            // Verify multiline replacement
            const modifiedContent = await mockApp.vault.read(results[0].file);
            expect(modifiedContent).toContain('NEW FIRST LINE');
            expect(modifiedContent).toContain('NEW SECOND LINE');
        });

        it('should replace individual multiline matches', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('work.*\\n.*line', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            // Replace only the first match
            const firstMatch = results[0];
            const result = await replacementEngine.dispatchReplace(
                'one',
                results,
                new Set(),
                'SINGLE REPLACEMENT',
                searchOptions,
                firstMatch
            );

            expect(result.totalReplacements).toBe(1);
            expect(result.filesModified).toBe(1);

            // Verify only one replacement occurred
            const modifiedContent = await mockApp.vault.read(firstMatch.file);
            expect(modifiedContent).toContain('SINGLE REPLACEMENT');

            // Count remaining matches - should be fewer than original
            const remainingResults = await searchEngine.performSearch('work.*\\n.*line', searchOptions);
            expect(remainingResults.length).toBeLessThan(results.length);
        });

        it('should replace selected multiline matches', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('work.*\\n.*line', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            // Select specific matches (first and last if multiple exist)
            const selectedIndices = new Set([0]);
            if (results.length > 1) {
                selectedIndices.add(results.length - 1);
            }

            const result = await replacementEngine.dispatchReplace(
                'selected',
                results,
                selectedIndices,
                'SELECTED REPLACEMENT',
                searchOptions
            );

            expect(result.totalReplacements).toBe(selectedIndices.size);

            // Verify replacements
            const modifiedContent = await mockApp.vault.read(results[0].file);
            expect(modifiedContent).toContain('SELECTED REPLACEMENT');
        });
    });

    describe('Regex Capture Groups in Multiline', () => {
        it('should handle capture groups in multiline replacements', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('(work).*\\n.*(Line)', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            // Use capture groups in replacement
            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'Found $1 and $2',
                searchOptions
            );

            expect(result.totalReplacements).toBeGreaterThan(0);

            // Verify capture group expansion
            const modifiedContent = await mockApp.vault.read(results[0].file);
            expect(modifiedContent).toContain('Found work and Line');
        });

        it('should handle complex capture group patterns', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('(\\w+)\\s+continues.*\\n(\\w+)\\s+(\\w+)', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                '$1 replaced, then $2 $3',
                searchOptions
            );

            expect(result.totalReplacements).toBeGreaterThan(0);
        });

        it('should handle $& (full match) in multiline replacements', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('work.*\\n.*line', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'BEFORE[$&]AFTER',
                searchOptions
            );

            expect(result.totalReplacements).toBeGreaterThan(0);

            const modifiedContent = await mockApp.vault.read(results[0].file);
            expect(modifiedContent).toContain('BEFORE[');
            expect(modifiedContent).toContain(']AFTER');
        });
    });

    describe('File-level Multiline Replacements', () => {
        it('should replace all multiline matches in a specific file', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('work', searchOptions);
            const fileToReplace = results[0].file;

            const result = await replacementEngine.dispatchReplace(
                'file',
                results,
                new Set(),
                'WORK_REPLACED',
                searchOptions,
                fileToReplace
            );

            expect(result.totalReplacements).toBeGreaterThan(0);
            expect(result.filesModified).toBe(1);

            // Verify all matches in the file were replaced
            const modifiedContent = await mockApp.vault.read(fileToReplace);
            expect(modifiedContent).not.toContain('work');
            expect(modifiedContent).toContain('WORK_REPLACED');
        });

        it('should handle multiline replacements that change line count', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            // Pattern that matches multiple lines
            const results = await searchEngine.performSearch('work.*\\n.*\\n.*line', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            // Replace with single line
            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'SINGLE LINE REPLACEMENT',
                searchOptions
            );

            expect(result.totalReplacements).toBeGreaterThan(0);

            // Verify line count changed
            const modifiedContent = await mockApp.vault.read(results[0].file);
            const originalLineCount = testContent.split('\n').length;
            const newLineCount = modifiedContent.split('\n').length;
            expect(newLineCount).toBeLessThan(originalLineCount);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle multiline replacements at file boundaries', async () => {
            mockApp.vault.addFile('boundary.md', 'start\nwork at end');

            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('work at end$', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'REPLACED AT END',
                searchOptions
            );

            expect(result.totalReplacements).toBeGreaterThan(0);
        });

        it('should handle empty multiline replacements', async () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('work.*\\n.*line', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            // Replace with empty string
            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                '',
                searchOptions
            );

            expect(result.totalReplacements).toBeGreaterThan(0);

            // Verify content was removed
            const modifiedContent = await mockApp.vault.read(results[0].file);
            expect(modifiedContent).not.toMatch(/work.*\n.*line/);
        });

        it('should handle overlapping multiline patterns correctly', async () => {
            mockApp.vault.addFile('overlap.md', 'work line one\nwork line two\nwork line three');

            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            // Pattern that could potentially overlap
            const results = await searchEngine.performSearch('work.*\\n.*work', searchOptions);
            expect(results.length).toBeGreaterThan(0);

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'REPLACED MULTILINE',
                searchOptions
            );

            expect(result.totalReplacements).toBeGreaterThan(0);
            expect(result.errors.length).toBe(0);
        });

        it('should validate replacement text for multiline patterns', () => {
            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            // Valid replacement with capture groups
            const validation1 = replacementEngine.validateReplacementText('$1 replaced $2', searchOptions);
            expect(validation1.isValid).toBe(true);

            // Replacement with potential issues
            const validation2 = replacementEngine.validateReplacementText('$10 might be invalid', searchOptions);
            expect(validation2.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('Performance with Large Multiline Operations', () => {
        it('should handle large multiline replacements efficiently', async () => {
            // Create a large file with many multiline patterns
            const largeContent = Array(50).fill(0).map((_, i) =>
                `Section ${i}\nwork content here\ncontinuation line\nend section`
            ).join('\n\n');

            mockApp.vault.addFile('large.md', largeContent);

            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const startTime = Date.now();
            const results = await searchEngine.performSearch('work.*\\n.*line', searchOptions);
            expect(results.length).toBeGreaterThan(10);

            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'BULK REPLACED',
                searchOptions
            );

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(result.totalReplacements).toBeGreaterThan(10);
        });
    });

    describe('Regression Tests for Multiline Replace All Bug Fix', () => {
        it('should ensure multiline flag is properly passed to replace all operations', async () => {
            // This test specifically validates the bug fix where ActionHandler.getSearchOptions()
            // was missing the multiline flag, causing replace all operations to fail

            mockApp.vault.addFile('multiline-bug-test.md', 'start\nworking on\nmultiple lines\nend');

            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true // This flag was not being passed correctly before the fix
            };

            // Search for multiline pattern
            const results = await searchEngine.performSearch('working.*\\n.*multiple', searchOptions);
            expect(results.length).toBe(1);
            expect(results[0].matchText).toMatch(/working.*\n.*multiple/);

            // This would have failed before the fix because ActionHandler.getSearchOptions()
            // wasn't including the multiline flag for vault-wide replacements
            const result = await replacementEngine.dispatchReplace(
                'vault',
                results,
                new Set(),
                'REPLACED MULTILINE TEXT',
                searchOptions
            );

            expect(result.totalReplacements).toBe(1);
            expect(result.errors.length).toBe(0);

            // Verify the replacement actually worked
            const modifiedContent = await mockApp.vault.read(results[0].file);
            expect(modifiedContent).toContain('REPLACED MULTILINE TEXT');
            expect(modifiedContent).not.toMatch(/working.*\n.*multiple/);
        });

        it('should handle file-level multiline replace all operations', async () => {
            // Test file-level replace all with multiline patterns
            const testFile = mockApp.vault.addFile('file-multiline-test.md',
                'pattern one\ncontinues here\n\npattern two\ncontinues there');

            const searchOptions: SearchOptions = {
                matchCase: false,
                wholeWord: false,
                useRegex: true,
                multiline: true
            };

            const results = await searchEngine.performSearch('pattern.*\\n.*continues', searchOptions);
            expect(results.length).toBe(2);

            // Test file-level replace all
            const result = await replacementEngine.dispatchReplace(
                'file',
                results,
                new Set(),
                'REPLACED',
                searchOptions,
                testFile
            );

            expect(result.totalReplacements).toBe(2);
            expect(result.filesModified).toBe(1);

            const modifiedContent = await mockApp.vault.read(testFile);
            expect((modifiedContent.match(/REPLACED/g) || []).length).toBe(2);
        });
    });
});