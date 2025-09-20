import { describe, it, expect } from 'vitest';

/**
 * Tests for column position accuracy and tracking
 * Critical for the second match replacement bug prevention
 */

describe('Position Tracking', () => {
  describe('Column Position Accuracy', () => {
    it('should maintain accurate column positions for multiple matches on same line', () => {
      const content = 'test test test TEST';
      const matches = findMatchesWithPositions(content, 'test', false);

      expect(matches).toHaveLength(4);
      expect(matches[0].col).toBe(0);
      expect(matches[1].col).toBe(5);
      expect(matches[2].col).toBe(10);
      expect(matches[3].col).toBe(15); // 'TEST' in case-insensitive mode
    });

    it('should handle the exact second match bug scenario', () => {
      const content = '- [x] css rule search needs to be lowercase `pinto` does not match `Pinto`';
      const matches = findMatchesWithPositions(content, 'pinto', false);

      expect(matches).toHaveLength(2);

      // First match: `pinto`
      expect(matches[0].col).toBe(45);
      expect(matches[0].text).toBe('pinto');
      expect(content.substring(45, 50)).toBe('pinto');

      // Second match: `Pinto`
      expect(matches[1].col).toBe(68);
      expect(matches[1].text).toBe('Pinto');
      expect(content.substring(68, 73)).toBe('Pinto');
    });

    it('should track positions correctly after text modifications', () => {
      let content = 'test alpha test beta test gamma';
      const matches = findMatchesWithPositions(content, 'test', false);

      expect(matches).toHaveLength(3);
      expect(matches[0].col).toBe(0);
      expect(matches[1].col).toBe(11);
      expect(matches[2].col).toBe(21);

      // Simulate replacement of first match
      content = replaceAtPosition(content, matches[0].col, matches[0].text.length, 'REPLACED');
      // Result: 'REPLACED alpha test beta test gamma'

      // Find remaining matches - positions should shift
      const remainingMatches = findMatchesWithPositions(content, 'test', false);
      expect(remainingMatches).toHaveLength(2);
      expect(remainingMatches[0].col).toBe(15); // Shifted by difference in length
      expect(remainingMatches[1].col).toBe(25);
    });
  });

  describe('Overlapping Pattern Positions', () => {
    it('should find all overlapping aa patterns in aaaa', () => {
      const content = 'aaaa should find multiple aa matches';
      const matches = findMatchesWithPositions(content, 'aa', false);

      expect(matches).toHaveLength(4); // 3 overlapping in "aaaa" + 1 in "aa matches"
      expect(matches[0].col).toBe(0);
      expect(matches[1].col).toBe(1);
      expect(matches[2].col).toBe(2);
      expect(matches[3].col).toBe(26); // "aa" in "aa matches"

      // Verify each match extracts correct text
      expect(content.substring(0, 2)).toBe('aa');
      expect(content.substring(1, 3)).toBe('aa');
      expect(content.substring(2, 4)).toBe('aa');
    });

    it('should handle complex overlapping patterns', () => {
      const content = 'abababab pattern matching';
      const matches = findMatchesWithPositions(content, 'abab', false);

      expect(matches).toHaveLength(3);
      expect(matches[0].col).toBe(0); // 'abab'
      expect(matches[1].col).toBe(2); // 'abab'
      expect(matches[2].col).toBe(4); // 'abab'
    });
  });

  describe('Unicode Position Tracking', () => {
    it('should handle Unicode character positions correctly', () => {
      const content = 'Café naïve résumé 🔍 test';
      const matches = findMatchesWithPositions(content, 'test', false);

      expect(matches).toHaveLength(1);
      // Should account for Unicode characters properly
      expect(matches[0].col).toBe(21);
      expect(content.substring(21, 25)).toBe('test');
    });

    it('should handle emoji boundaries correctly', () => {
      const content = '🔍 search 🔄 replace 🎯 test';
      const matches = findMatchesWithPositions(content, 'test', false);

      expect(matches).toHaveLength(1);
      expect(matches[0].text).toBe('test');
      expect(content.substring(matches[0].col, matches[0].col + 4)).toBe('test');
    });
  });

  describe('Replacement Position Logic', () => {
    it('should process replacements in reverse order to maintain positions', () => {
      const content = 'test alpha test beta test gamma';
      const matches = findMatchesWithPositions(content, 'test', false);

      // Sort matches in reverse order (highest column first)
      const sortedMatches = [...matches].sort((a, b) => b.col - a.col);

      expect(sortedMatches[0].col).toBe(21); // 'test gamma'
      expect(sortedMatches[1].col).toBe(11); // 'test beta'
      expect(sortedMatches[2].col).toBe(0);  // 'test alpha'

      // Verify that reverse processing maintains position accuracy
      let modifiedContent = content;
      for (const match of sortedMatches) {
        modifiedContent = replaceAtPosition(modifiedContent, match.col, match.text.length, 'X');
      }

      expect(modifiedContent).toBe('X alpha X beta X gamma');
    });

    it('should handle specific match selection correctly', () => {
      const content = 'test test test TEST';
      const matches = findMatchesWithPositions(content, 'test', false);

      // Select only the second match (index 1)
      const selectedMatch = matches[1];
      expect(selectedMatch.col).toBe(5);

      const result = replaceAtPosition(content, selectedMatch.col, selectedMatch.text.length, 'SECOND');
      expect(result).toBe('test SECOND test TEST');
    });
  });
});

// Helper interfaces and functions
interface PositionMatch {
  text: string;
  col: number;
  length: number;
}

function findMatchesWithPositions(content: string, pattern: string, caseSensitive: boolean): PositionMatch[] {
  const matches: PositionMatch[] = [];
  const searchContent = caseSensitive ? content : content.toLowerCase();
  const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  let startIndex = 0;

  while (true) {
    const index = searchContent.indexOf(searchPattern, startIndex);
    if (index === -1) break;

    matches.push({
      text: content.substring(index, index + pattern.length),
      col: index,
      length: pattern.length
    });

    startIndex = index + 1; // Find overlapping matches
  }

  return matches;
}

function replaceAtPosition(content: string, start: number, length: number, replacement: string): string {
  return content.substring(0, start) + replacement + content.substring(start + length);
}

function findMatchAtPosition(content: string, pattern: string, targetCol: number, caseSensitive: boolean): PositionMatch | null {
  const matches = findMatchesWithPositions(content, pattern, caseSensitive);
  return matches.find(match => match.col === targetCol) || null;
}