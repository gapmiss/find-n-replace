/**
 * Unified replacement string expansion
 * Used by both the actual replacement engine and the preview renderer
 * to ensure preview matches actual replacement behavior
 */

/**
 * Expands replacement tokens in a template string
 * Handles: $$ (literal $), $& (full match), $` (before), $' (after), $1-$99 (capture groups)
 * Also handles \n and \t escape sequences
 *
 * @param template - The replacement template (e.g., "prefix-$1-suffix")
 * @param match - The RegExpExecArray from the search
 * @returns The expanded replacement string
 */
export function expandReplacement(template: string, match: RegExpExecArray): string {
    const input = match.input ?? '';
    const offset = match.index ?? 0;

    // Single regex handles all tokens atomically to avoid order-dependent bugs
    // e.g., "$$1" is correctly parsed as "$" + "1", not "$" + capture group 1
    let result = template.replace(/\$(\$|&|`|'|\d{1,2})/g, (_, token: string) => {
        if (token === '$') return '$';
        if (token === '&') return match[0];
        if (token === '`') return input.slice(0, offset);
        if (token === "'") return input.slice(offset + match[0].length);
        // Numeric capture group
        const groupNum = parseInt(token, 10);
        return match[groupNum] ?? '';
    });

    // Handle escaped whitespace characters
    result = result.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

    return result;
}
