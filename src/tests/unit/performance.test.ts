import { describe, it, expect } from 'vitest';

/**
 * Performance and stress testing for search and replace operations
 * Ensures operations complete within reasonable time limits
 */

describe('Performance and Edge Cases', () => {
  describe('Large Content Performance', () => {
    it('should handle large content efficiently', () => {
      const largeContent = generateLargeContent(10000, 'test');
      const startTime = performance.now();

      const matches = findAllMatches(largeContent, 'test', false);

      const duration = performance.now() - startTime;

      expect(matches.length).toBeGreaterThan(1000);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle many replacements efficiently', () => {
      const content = 'test '.repeat(1000);
      const startTime = performance.now();

      const result = performBulkReplacement(content, 'test', 'REPLACED', false);

      const duration = performance.now() - startTime;

      expect(result.replacementCount).toBe(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle complex regex patterns efficiently', () => {
      const content = generateDateContent(1000);
      const startTime = performance.now();

      const matches = findRegexMatches(content, '\\d{4}-\\d{2}-\\d{2}');

      const duration = performance.now() - startTime;

      expect(matches.length).toBe(1000);
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks with repeated operations', () => {
      const baseMemory = getMemoryUsage();

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        const content = `test content ${i} `.repeat(100);
        findAllMatches(content, 'test', false);
        performBulkReplacement(content, 'test', 'replaced', false);
      }

      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory - baseMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle overlapping patterns without exponential memory growth', () => {
      const content = 'a'.repeat(1000);
      const startMemory = getMemoryUsage();

      const matches = findAllMatches(content, 'aa', false);

      const endMemory = getMemoryUsage();
      const memoryUsed = endMemory - startMemory;

      expect(matches.length).toBe(999); // 999 overlapping 'aa' patterns
      expect(memoryUsed).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle empty content gracefully', () => {
      const matches = findAllMatches('', 'test', false);
      expect(matches).toEqual([]);

      const result = performBulkReplacement('', 'test', 'replaced', false);
      expect(result.replacementCount).toBe(0);
      expect(result.content).toBe('');
    });

    it('should handle very long patterns', () => {
      const longPattern = 'x'.repeat(1000);
      const content = `start ${longPattern} middle ${longPattern} end`;

      const matches = findAllMatches(content, longPattern, false);
      expect(matches.length).toBe(2);
    });

    it('should handle patterns longer than content', () => {
      const content = 'short';
      const longPattern = 'this pattern is much longer than the content';

      const matches = findAllMatches(content, longPattern, false);
      expect(matches).toEqual([]);
    });

    it('should handle special Unicode combinations', () => {
      const content = '👨‍👩‍👧‍👦 family emoji and café résumé';
      const matches = findAllMatches(content, 'é', false);

      expect(matches.length).toBe(3); // One in café, two in résumé (é and é)
    });
  });

  describe('Regex Security and Performance', () => {
    it('should handle potential ReDoS patterns safely', () => {
      const content = 'a'.repeat(100);
      const startTime = performance.now();

      // This pattern could cause catastrophic backtracking
      try {
        const matches = findRegexMatches(content, '(a+)+b?');
        const duration = performance.now() - startTime;

        // Should complete quickly or fail gracefully
        expect(duration).toBeLessThan(1000);
      } catch (error) {
        // Acceptable to throw error for dangerous patterns
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle deeply nested regex groups', () => {
      const content = 'test ((nested (groups) here)) test';
      const startTime = performance.now();

      const matches = findRegexMatches(content, '\\(+.*?\\)+');

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should handle patterns with many alternations efficiently', () => {
      const pattern = Array.from({length: 100}, (_, i) => `word${i}`).join('|');
      const content = 'word50 is in the middle of many options';

      const startTime = performance.now();
      const matches = findRegexMatches(content, pattern);
      const duration = performance.now() - startTime;

      expect(matches.length).toBe(1);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Stress Testing', () => {
    it('should handle maximum realistic file sizes', () => {
      // Simulate a very large Obsidian note (1MB)
      const largeContent = generateRealisticContent(1024 * 1024);
      const startTime = performance.now();

      const matches = findAllMatches(largeContent, 'note', false);

      const duration = performance.now() - startTime;

      expect(matches.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // 2 seconds for 1MB file
    });

    it('should handle rapid sequential operations', () => {
      const content = 'rapid test operations on this content';
      const startTime = performance.now();

      // Perform 1000 search operations rapidly
      for (let i = 0; i < 1000; i++) {
        findAllMatches(content, 'test', false);
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent-like operations', async () => {
      const operations = [];
      const content = 'concurrent testing content';

      // Create multiple promises (simulating concurrent operations)
      for (let i = 0; i < 50; i++) {
        operations.push(
          new Promise(resolve => {
            setTimeout(() => {
              const matches = findAllMatches(content, 'test', false);
              resolve(matches.length);
            }, Math.random() * 10);
          })
        );
      }

      const results = await Promise.all(operations);
      // All operations should complete and return same result
      expect(results.every(count => count === 1)).toBe(true);
    });
  });
});

// Helper functions for performance testing

interface Match {
  text: string;
  position: number;
}

interface BulkReplacementResult {
  content: string;
  replacementCount: number;
}

function findAllMatches(content: string, pattern: string, caseSensitive: boolean): Match[] {
  const matches: Match[] = [];
  const searchContent = caseSensitive ? content : content.toLowerCase();
  const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  let startIndex = 0;
  while (true) {
    const index = searchContent.indexOf(searchPattern, startIndex);
    if (index === -1) break;

    matches.push({
      text: content.substring(index, index + pattern.length),
      position: index
    });

    startIndex = index + 1;
  }

  return matches;
}

function findRegexMatches(content: string, pattern: string): Match[] {
  const matches: Match[] = [];
  const regex = new RegExp(pattern, 'g');
  let match;

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      text: match[0],
      position: match.index
    });
  }

  return matches;
}

function performBulkReplacement(
  content: string,
  pattern: string,
  replacement: string,
  caseSensitive: boolean
): BulkReplacementResult {
  const matches = findAllMatches(content, pattern, caseSensitive);
  let modifiedContent = content;
  let offset = 0;

  // Replace in reverse order to maintain positions
  const sortedMatches = matches.sort((a, b) => b.position - a.position);

  for (const match of sortedMatches) {
    const start = match.position;
    const end = start + pattern.length;
    modifiedContent = modifiedContent.substring(0, start) +
                     replacement +
                     modifiedContent.substring(end);
  }

  return {
    content: modifiedContent,
    replacementCount: matches.length
  };
}

function generateLargeContent(lines: number, pattern: string): string {
  const lineTemplates = [
    `This is line {i} containing ${pattern} for testing`,
    `Line {i} has multiple ${pattern} instances with ${pattern} repetition`,
    `Content line {i} - ${pattern} appears here`,
    `Test line {i} without the target pattern`,
    `Another ${pattern} line {i} for comprehensive testing`
  ];

  const result: string[] = [];
  for (let i = 0; i < lines; i++) {
    const template = lineTemplates[i % lineTemplates.length];
    result.push(template.replace(/\{i\}/g, i.toString()));
  }

  return result.join('\n');
}

function generateDateContent(count: number): string {
  const dates: string[] = [];
  const baseDate = new Date(2025, 0, 1);

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    dates.push(`Entry ${i}: Date ${dateStr} - content here`);
  }

  return dates.join('\n');
}

function generateRealisticContent(targetSize: number): string {
  const words = [
    'note', 'content', 'text', 'information', 'data', 'knowledge',
    'research', 'study', 'analysis', 'observation', 'insight',
    'conclusion', 'summary', 'detail', 'example', 'reference'
  ];

  let content = '';
  while (content.length < targetSize) {
    const sentence = Array.from({length: 10 + Math.floor(Math.random() * 10)}, () =>
      words[Math.floor(Math.random() * words.length)]
    ).join(' ') + '. ';

    content += sentence;
  }

  return content.substring(0, targetSize);
}

function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0; // Fallback for environments without process.memoryUsage
}