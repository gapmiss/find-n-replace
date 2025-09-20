/**
 * Test utilities and helpers for Vault Find Replace testing
 */

import { SearchResult, SearchOptions } from '../../types';

/**
 * Creates a mock SearchResult for testing
 */
export function createMockSearchResult(
    filePath: string,
    line: number,
    content: string,
    matchText: string,
    col: number,
    pattern: string
): SearchResult {
    return {
        file: createMockFile(filePath, content),
        line,
        content,
        matchText,
        col,
        pattern
    };
}

/**
 * Creates default search options for testing
 */
export function createDefaultSearchOptions(overrides: Partial<SearchOptions> = {}): SearchOptions {
    return {
        matchCase: false,
        wholeWord: false,
        useRegex: false,
        ...overrides
    };
}

/**
 * Generates test content with known patterns for edge case testing
 */
export function generateEdgeCaseContent(): Map<string, string> {
    const testFiles = new Map<string, string>();

    // Multiple matches per line
    testFiles.set('multi-match.md',
        'test test test TEST\n' +
        'overlapping: aaaa contains aa matches\n' +
        'Mixed: Test tEsT TEST test\n' +
        'Special: (test) [test] {test} test-test'
    );

    // Unicode and special characters
    testFiles.set('unicode.md',
        'Café naïve résumé piñata\n' +
        '🔍 🔄 🎯 emojis in content\n' +
        'Mixed: test-тест-テスト-测试\n' +
        'Quotes: "test" 'test' «test»'
    );

    // Regex edge cases
    testFiles.set('regex.md',
        'Dates: 2025-01-15, 2025-12-31\n' +
        'Links: [text](url) and [more](path)\n' +
        'Groups: (capture) and (group)\n' +
        'Boundaries: word in words and sword'
    );

    // Empty and whitespace
    testFiles.set('whitespace.md',
        '   \n' +
        '\t\t\n' +
        '  test  \n' +
        '\n'
    );

    // Large content for performance testing
    testFiles.set('large.md', generateLargeTestContent());

    return testFiles;
}

/**
 * Generates large content for performance testing
 */
export function generateLargeTestContent(): string {
    const lines: string[] = [];
    const patterns = [
        'This is a test line with search terms',
        'Another test pattern for matching',
        'Performance test content with test words',
        'Edge case: test, Test, TEST variations',
        'Unicode test: café test 🔍 test'
    ];

    for (let i = 0; i < 1000; i++) {
        const pattern = patterns[i % patterns.length];
        lines.push(`Line ${i}: ${pattern}`);
    }

    return lines.join('\n');
}

/**
 * Validates SearchResult array for consistency
 */
export function validateSearchResults(results: SearchResult[]): void {
    results.forEach((result, index) => {
        // Basic property validation
        expect(result).toHaveProperty('file');
        expect(result).toHaveProperty('line');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('matchText');
        expect(result).toHaveProperty('col');
        expect(result).toHaveProperty('pattern');

        // Type validation
        expect(typeof result.line).toBe('number');
        expect(typeof result.content).toBe('string');
        expect(typeof result.matchText).toBe('string');
        expect(typeof result.col).toBe('number');
        expect(typeof result.pattern).toBe('string');

        // Range validation
        expect(result.line).toBeGreaterThanOrEqual(0);
        expect(result.col).toBeGreaterThanOrEqual(0);
        expect(result.col).toBeLessThanOrEqual(result.content.length);
        expect(result.matchText.length).toBeGreaterThan(0);

        // Content validation - match should exist at specified position
        const extractedText = result.content.substring(
            result.col,
            result.col + result.matchText.length
        );
        expect(extractedText).toBe(result.matchText);
    });
}

/**
 * Counts occurrences of a pattern in text (case-insensitive)
 */
export function countOccurrences(text: string, pattern: string, caseSensitive = false): number {
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

    let count = 0;
    let position = 0;

    while ((position = searchText.indexOf(searchPattern, position)) !== -1) {
        count++;
        position += searchPattern.length;
    }

    return count;
}

/**
 * Creates test scenarios for the second match replacement bug
 */
export function createSecondMatchBugScenarios(): Array<{
    content: string;
    searchTerm: string;
    expectedMatches: number;
    expectedPositions: number[];
}> {
    return [
        {
            content: '- [x] css rule search needs to be lowercase `pinto` does not match `Pinto`',
            searchTerm: 'pinto',
            expectedMatches: 2,
            expectedPositions: [47, 72] // Approximate positions
        },
        {
            content: 'test test test TEST',
            searchTerm: 'test',
            expectedMatches: 4,
            expectedPositions: [0, 5, 10, 15]
        },
        {
            content: 'aaaa should find multiple aa matches',
            searchTerm: 'aa',
            expectedMatches: 3,
            expectedPositions: [0, 1, 2]
        }
    ];
}

/**
 * Performance timing helper
 */
export class PerformanceTimer {
    private startTime: number = 0;

    start(): void {
        this.startTime = performance.now();
    }

    end(): number {
        return performance.now() - this.startTime;
    }

    expectWithinLimit(maxMs: number): void {
        const duration = this.end();
        expect(duration).toBeLessThan(maxMs);
    }
}

/**
 * Async timeout helper for testing
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}