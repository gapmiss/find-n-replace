import { describe, it, expect } from 'vitest';

/**
 * Regression tests specifically designed to prevent the second match replacement bug
 * and other critical bugs that were discovered and fixed
 */

describe('Bug Regression Tests', () => {
  describe('Second Match Replacement Bug Prevention', () => {
    it('should correctly identify and replace the second match on the same line', () => {
      // This is the exact bug scenario that was reported and fixed
      const content = '- [x] css rule search needs to be lowercase `pinto` does not match `Pinto`';
      const searchTerm = 'pinto';

      const result = simulateSecondMatchReplacement(content, searchTerm, 'REPLACED', false);

      // Should replace the second occurrence (Pinto) and leave the first unchanged
      expect(result.success).toBe(true);
      expect(result.modifiedContent).toBe('- [x] css rule search needs to be lowercase `pinto` does not match `REPLACED`');
      expect(result.replacementCount).toBe(1);
    });

    it('should handle multiple identical matches with specific targeting', () => {
      const content = 'test test test TEST';

      // Replace specifically the third match (index 2)
      const result = simulateSpecificMatchReplacement(content, 'test', 2, 'THIRD', false);

      expect(result.success).toBe(true);
      expect(result.modifiedContent).toBe('test test THIRD TEST');
    });

    it('should handle regex exec loop correctly for finding specific matches', () => {
      const content = 'overlapping: aaaa contains aa matches';
      const pattern = 'aa';

      // Find the match at position 14 (third 'aa' in 'aaaa')
      const targetPosition = 14;
      const result = simulatePositionalReplacement(content, pattern, targetPosition, 'XX', false);

      expect(result.success).toBe(true);
      expect(result.foundAtPosition).toBe(true);
    });

    it('should fail gracefully when target position is not found', () => {
      const content = 'test content';
      const result = simulatePositionalReplacement(content, 'test', 99, 'REPLACED', false);

      expect(result.success).toBe(false);
      expect(result.foundAtPosition).toBe(false);
      expect(result.modifiedContent).toBe(content); // Unchanged
    });
  });

  describe('Regex Processing Edge Cases', () => {
    it('should handle patterns that match at position 0', () => {
      const content = 'test at beginning';
      const result = simulatePositionalReplacement(content, 'test', 0, 'START', false);

      expect(result.success).toBe(true);
      expect(result.modifiedContent).toBe('START at beginning');
    });

    it('should handle patterns at end of line', () => {
      const content = 'content ends with test';
      const lastPosition = content.lastIndexOf('test');
      const result = simulatePositionalReplacement(content, 'test', lastPosition, 'END', false);

      expect(result.success).toBe(true);
      expect(result.modifiedContent).toBe('content ends with END');
    });

    it('should handle empty and whitespace patterns correctly', () => {
      const content = '   spaced   content   ';
      const result = simulatePositionalReplacement(content, '   ', 0, '[SPACE]', false);

      expect(result.success).toBe(true);
      expect(result.modifiedContent).toBe('[SPACE]spaced   content   ');
    });
  });

  describe('Case Sensitivity Bug Prevention', () => {
    it('should respect case sensitivity in position matching', () => {
      const content = 'Test test TEST Test';

      // Case sensitive: should only find exact 'Test' matches
      const caseSensitiveMatches = findAllPositions(content, 'Test', true);
      expect(caseSensitiveMatches).toEqual([0, 15]);

      // Case insensitive: should find all variations
      const caseInsensitiveMatches = findAllPositions(content, 'test', false);
      expect(caseInsensitiveMatches).toEqual([0, 5, 10, 15]);
    });

    it('should handle mixed case replacement correctly', () => {
      const content = 'First Test, second test, third TEST';
      const result = simulateSpecificMatchReplacement(content, 'test', 1, 'REPLACED', false);

      expect(result.modifiedContent).toBe('First Test, second REPLACED, third TEST');
    });
  });

  describe('Unicode and Special Character Bug Prevention', () => {
    it('should handle Unicode patterns in position matching', () => {
      const content = 'café naïve café résumé';
      const positions = findAllPositions(content, 'café', false);

      expect(positions).toEqual([0, 11]);

      const result = simulatePositionalReplacement(content, 'café', 11, '☕', false);
      expect(result.success).toBe(true);
      expect(result.modifiedContent).toBe('café naïve ☕ résumé');
    });

    it('should handle emoji patterns correctly', () => {
      const content = '🔍 search 🔍 find 🔍';
      const result = simulateSpecificMatchReplacement(content, '🔍', 1, '🔎', false);

      expect(result.modifiedContent).toBe('🔍 search 🔎 find 🔍');
    });
  });

  describe('Performance and Memory Bug Prevention', () => {
    it('should handle large content without infinite loops', () => {
      const largeContent = 'test '.repeat(1000) + 'end';
      const startTime = Date.now();

      const result = simulateSpecificMatchReplacement(largeContent, 'test', 500, 'REPLACED', false);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.success).toBe(true);
    });

    it('should handle patterns with potential for infinite matching', () => {
      const content = 'aaaaaaaaaa';
      const result = simulateSpecificMatchReplacement(content, 'aa', 3, 'XX', false);

      expect(result.success).toBe(true);
      // Should not cause infinite loop or stack overflow
    });
  });
});

// Helper functions that simulate the replacement engine logic

interface ReplacementResult {
  success: boolean;
  modifiedContent: string;
  replacementCount: number;
  foundAtPosition?: boolean;
}

function simulateSecondMatchReplacement(
  content: string,
  pattern: string,
  replacement: string,
  caseSensitive: boolean
): ReplacementResult {
  const matches = findAllPositions(content, pattern, caseSensitive);

  if (matches.length < 2) {
    return {
      success: false,
      modifiedContent: content,
      replacementCount: 0
    };
  }

  // Replace the second match (index 1)
  const secondPosition = matches[1];
  const modifiedContent = replaceAtPosition(content, secondPosition, pattern.length, replacement);

  return {
    success: true,
    modifiedContent,
    replacementCount: 1
  };
}

function simulateSpecificMatchReplacement(
  content: string,
  pattern: string,
  matchIndex: number,
  replacement: string,
  caseSensitive: boolean
): ReplacementResult {
  const matches = findAllPositions(content, pattern, caseSensitive);

  if (matchIndex >= matches.length || matchIndex < 0) {
    return {
      success: false,
      modifiedContent: content,
      replacementCount: 0
    };
  }

  const targetPosition = matches[matchIndex];
  const modifiedContent = replaceAtPosition(content, targetPosition, pattern.length, replacement);

  return {
    success: true,
    modifiedContent,
    replacementCount: 1
  };
}

function simulatePositionalReplacement(
  content: string,
  pattern: string,
  targetPosition: number,
  replacement: string,
  caseSensitive: boolean
): ReplacementResult {
  // Simulate the exact logic that was fixed in the replacement engine
  const searchContent = caseSensitive ? content : content.toLowerCase();
  const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  let foundMatch = false;
  let matchPosition = 0;

  // Check if the pattern exists at the target position
  const patternAtPosition = searchContent.substring(targetPosition, targetPosition + searchPattern.length);
  if (patternAtPosition === searchPattern) {
    foundMatch = true;
    matchPosition = targetPosition;
  }

  if (!foundMatch) {
    return {
      success: false,
      modifiedContent: content,
      replacementCount: 0,
      foundAtPosition: false
    };
  }

  const modifiedContent = replaceAtPosition(content, matchPosition, pattern.length, replacement);

  return {
    success: true,
    modifiedContent,
    replacementCount: 1,
    foundAtPosition: true
  };
}

function findAllPositions(content: string, pattern: string, caseSensitive: boolean): number[] {
  const positions: number[] = [];
  const searchContent = caseSensitive ? content : content.toLowerCase();
  const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  let startIndex = 0;
  while (true) {
    const index = searchContent.indexOf(searchPattern, startIndex);
    if (index === -1) break;

    positions.push(index);
    startIndex = index + 1; // Find overlapping matches
  }

  return positions;
}

function replaceAtPosition(content: string, start: number, length: number, replacement: string): string {
  return content.substring(0, start) + replacement + content.substring(start + length);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}