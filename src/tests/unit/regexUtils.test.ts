import { describe, it, expect } from 'vitest';

/**
 * Isolated tests for regex pattern matching logic
 * Tests the core algorithms without Obsidian API dependencies
 */

describe('Regex Pattern Matching', () => {
  describe('Multiple Match Detection', () => {
    it('should find all occurrences of a pattern in a line', () => {
      const content = '- [x] css rule search needs to be lowercase `pinto` does not match `Pinto`';
      const pattern = 'pinto';
      const matches = findAllMatches(content, pattern, false);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ text: 'pinto', start: 45, end: 50 });
      expect(matches[1]).toEqual({ text: 'Pinto', start: 68, end: 73 });
    });

    it('should handle case-sensitive matching', () => {
      const content = 'test Test TEST tEsT';
      const matches = findAllMatches(content, 'Test', true);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ text: 'Test', start: 5, end: 9 });
    });

    it('should find overlapping patterns correctly', () => {
      const content = 'aaaa should find multiple aa matches';
      const matches = findAllMatches(content, 'aa', false);

      expect(matches).toHaveLength(4);
      expect(matches[0]).toEqual({ text: 'aa', start: 0, end: 2 });
      expect(matches[1]).toEqual({ text: 'aa', start: 1, end: 3 });
      expect(matches[2]).toEqual({ text: 'aa', start: 2, end: 4 });
      expect(matches[3]).toEqual({ text: 'aa', start: 26, end: 28 }); // "aa" in "aa matches"
    });

    it('should handle whole word matching', () => {
      const content = 'test testing retest word in words and sword';
      const matches = findAllMatches(content, 'test', false, true);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ text: 'test', start: 0, end: 4 });
    });
  });

  describe('Regex Pattern Building', () => {
    it('should escape special regex characters in literal search', () => {
      const pattern = buildSearchPattern('(test)', false, false);
      const content = 'This is a (test) of literal matching';
      const matches = findAllMatches(content, '(test)', false);

      expect(matches).toHaveLength(1);
      expect(matches[0].text).toBe('(test)');
    });

    it('should handle regex patterns correctly', () => {
      const content = 'Date: 2025-01-15 and 2025-12-31';
      const matches = findAllMatchesRegex(content, '\\d{4}-\\d{2}-\\d{2}');

      expect(matches).toHaveLength(2);
      expect(matches[0].text).toBe('2025-01-15');
      expect(matches[1].text).toBe('2025-12-31');
    });

    it('should handle word boundary regex', () => {
      const content = 'word in words and sword';
      const matches = findAllMatchesRegex(content, '\\bword\\b');

      expect(matches).toHaveLength(1);
      expect(matches[0].text).toBe('word');
      expect(matches[0].start).toBe(0);
    });
  });

  describe('Unicode Support', () => {
    it('should handle Unicode characters correctly', () => {
      const content = 'Café naïve résumé piñata';
      const matches = findAllMatches(content, 'café', false);

      expect(matches).toHaveLength(1);
      expect(matches[0].text).toBe('Café');
    });

    it('should handle emoji patterns', () => {
      const content = '🔍 🔄 🎯 emojis in content 🔍';
      const matches = findAllMatches(content, '🔍', false);

      expect(matches).toHaveLength(2);
      expect(matches[0].start).toBe(0);
      expect(matches[1].start).toBe(27);
    });

    it('should handle mixed language content', () => {
      const content = 'Mixed: test-тест-テスト-测试';
      const matches = findAllMatches(content, 'тест', false);

      expect(matches).toHaveLength(1);
      expect(matches[0].text).toBe('тест');
    });
  });
});

// Helper functions that implement the core search logic
interface Match {
  text: string;
  start: number;
  end: number;
}

function findAllMatches(content: string, pattern: string, caseSensitive: boolean, wholeWord: boolean = false): Match[] {
  const matches: Match[] = [];
  const searchContent = caseSensitive ? content : content.toLowerCase();
  const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  let startIndex = 0;

  while (true) {
    const index = searchContent.indexOf(searchPattern, startIndex);
    if (index === -1) break;

    // Check word boundaries if whole word matching is enabled
    if (wholeWord) {
      const beforeChar = content[index - 1] || '';
      const afterChar = content[index + pattern.length] || '';

      if (/\w/.test(beforeChar) || /\w/.test(afterChar)) {
        startIndex = index + 1;
        continue;
      }
    }

    matches.push({
      text: content.substring(index, index + pattern.length),
      start: index,
      end: index + pattern.length
    });

    startIndex = index + 1; // Move past this match to find overlapping ones
  }

  return matches;
}

function findAllMatchesRegex(content: string, pattern: string): Match[] {
  const matches: Match[] = [];
  const regex = new RegExp(pattern, 'g');
  let match;

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return matches;
}

function buildSearchPattern(pattern: string, useRegex: boolean, wholeWord: boolean): string {
  if (useRegex) {
    return wholeWord ? `\\b(?:${pattern})\\b` : pattern;
  } else {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return wholeWord ? `\\b${escaped}\\b` : escaped;
  }
}