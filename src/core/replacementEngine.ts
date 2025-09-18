import { App, Notice, TFile } from 'obsidian';
import { SearchResult, SearchOptions, ReplacementMode, ReplacementTarget } from '../types';
import { SearchEngine } from './searchEngine';

/**
 * Handles all replacement operations and replacement text expansion
 */
export class ReplacementEngine {
    private app: App;
    private searchEngine: SearchEngine;

    constructor(app: App, searchEngine: SearchEngine) {
        this.app = app;
        this.searchEngine = searchEngine;
    }

    /**
     * Central dispatch method for all replacement operations
     * Handles different replacement modes and groups operations by file for efficiency
     * @param mode - Type of replacement: "one" | "selected" | "file" | "vault"
     * @param results - All search results
     * @param selectedIndices - Set of selected result indices
     * @param replaceText - The replacement text
     * @param searchOptions - Current search options
     * @param target - Optional target (SearchResult for "one", TFile for "file")
     */
    async dispatchReplace(
        mode: ReplacementMode,
        results: SearchResult[],
        selectedIndices: Set<number>,
        replaceText: string,
        searchOptions: SearchOptions,
        target?: ReplacementTarget
    ): Promise<number> {
        // Group matches by file for efficient processing
        const grouped = new Map<TFile, SearchResult[]>();

        switch (mode) {
            case "one": {
                // Replace a single specific match
                const res = target as SearchResult;
                grouped.set(res.file, [res]);
                break;
            }

            case "selected": {
                // Replace all user-selected matches
                for (const idx of selectedIndices) {
                    const res = results[idx];
                    if (!grouped.has(res.file)) grouped.set(res.file, []);
                    grouped.get(res.file)!.push(res);
                }
                break;
            }

            case "file": {
                // Replace all matches in a specific file
                const file = target as TFile;
                const fileResults = results.filter(r => r.file.path === file.path);
                if (fileResults.length) grouped.set(file, fileResults);
                break;
            }

            case "vault": {
                // Replace all matches in the entire vault
                for (const res of results) {
                    if (!grouped.has(res.file)) grouped.set(res.file, []);
                    grouped.get(res.file)!.push(res);
                }
                break;
            }
        }

        // Process each file's replacements
        let total = 0;
        for (const [file, matches] of grouped) {
            const replaceAllInFile = mode === "file" || mode === "vault";
            await this.applyReplacements(file, matches, replaceText, searchOptions, replaceAllInFile);
            total += matches.length;
        }

        // Show success notification
        this.showReplacementNotification(mode, total);

        return total;
    }

    /**
     * Applies replacement text to specified matches in a file
     * @param file - The file to modify
     * @param matches - Array of SearchResult objects to replace
     * @param replaceText - The replacement text
     * @param searchOptions - Current search options
     * @param replaceAllInFile - If true, replaces all matches in file; if false, only specified matches
     */
    private async applyReplacements(
        file: TFile,
        matches: SearchResult[],
        replaceText: string,
        searchOptions: SearchOptions,
        replaceAllInFile: boolean = false
    ): Promise<void> {
        let content = await this.app.vault.read(file);
        const lines = content.split('\n');

        const regex = this.searchEngine.buildSearchRegex(matches[0]?.pattern || '', searchOptions);

        if (replaceAllInFile) {
            // Replace all matches in the file (once per unique line to prevent repeated replacements)
            const uniqueLines = Array.from(new Set(matches.map(m => m.line)));
            for (const lineNum of uniqueLines) {
                const lineText = lines[lineNum] ?? '';
                lines[lineNum] = lineText.replace(regex, (match, ...rest: any[]) => {
                    // Extract capture groups and match info from regex replace callback
                    // rest = [group1, group2, ..., offset, input]
                    const offset = rest[rest.length - 2] as number;
                    const input = rest[rest.length - 1] as string;
                    const groups = rest.slice(0, -2) as string[];

                    // Reconstruct a RegExpExecArray-like object for replacement expansion
                    const execArray: any = [match, ...groups];
                    execArray.index = offset;
                    execArray.input = input;

                    return this.expandReplacement(execArray as RegExpExecArray, replaceText, input, searchOptions);
                });
            }
        } else {
            // Replace only the specified matches (use reverse-sorted order to keep indices valid)
            matches.sort((a, b) =>
                a.line === b.line ? (b.col || 0) - (a.col || 0) : b.line - a.line
            );

            // Process matches in reverse order so string indices remain valid
            for (const res of matches) {
                const lineText = lines[res.line] ?? '';
                let matchArr: RegExpExecArray | null;
                regex.lastIndex = 0; // Reset regex state

                // Find the specific match at the expected position
                while ((matchArr = regex.exec(lineText)) !== null) {
                    if (matchArr.index === res.col) {
                        // Found the exact match - perform replacement
                        const replacement = this.expandReplacement(matchArr, replaceText, lineText, searchOptions);
                        lines[res.line] =
                            lineText.slice(0, matchArr.index) +
                            replacement +
                            lineText.slice(matchArr.index + matchArr[0].length);
                        break;
                    }
                }
            }
        }

        // Write the modified content back to the file
        await this.app.vault.modify(file, lines.join('\n'));
    }

    /**
     * Expands replacement text with special tokens like $1, $&, etc.
     * Handles regex capture groups and special replacement sequences
     * @param matchArr - The RegExp match result with capture groups
     * @param replacement - The replacement text template
     * @param input - The original input string
     * @param searchOptions - Current search options
     * @returns The final replacement string
     */
    expandReplacement(
        matchArr: RegExpExecArray,
        replacement: string,
        input: string,
        searchOptions: SearchOptions
    ): string {
        // Handle replacement tokens like $1, $&, $$, $` and $' and escaped \n/\t.
        // If regex mode is OFF, return the replacement text literally (no special processing).
        if (!searchOptions.useRegex) return replacement; // No expansion in non-regex mode

        const offset = matchArr.index ?? 0;
        let out = replacement;

        // Replace numbered capture groups: $1, $2, $3, etc.
        out = out.replace(/\$(\d+)/g, (_, n) => matchArr[Number(n)] ?? '');

        // Replace special regex tokens
        out = out
            .replace(/\$\$/g, '$')           // $$ -> literal $
            .replace(/\$&/g, matchArr[0])    // $& -> entire match
            .replace(/\$`/g, input.slice(0, offset))                       // $` -> text before match
            .replace(/\$'/g, input.slice(offset + (matchArr[0]?.length ?? 0))); // $' -> text after match

        // Handle escaped whitespace characters
        out = out.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

        return out;
    }

    /**
     * Shows appropriate notification after replacement operation
     * @param mode - The replacement mode that was used
     * @param count - Number of matches that were replaced
     */
    private showReplacementNotification(mode: ReplacementMode, count: number): void {
        if (mode === 'vault') {
            new Notice('All matches replaced');
        } else {
            if (count > 0) {
                new Notice(`${count} match${count > 1 ? 'es' : ''} replaced`);
            }
        }
    }

    /**
     * Validates replacement text for potential issues
     * @param replaceText - The replacement text to validate
     * @param searchOptions - Current search options
     * @returns Object with validation result and any warnings
     */
    validateReplacementText(
        replaceText: string,
        searchOptions: SearchOptions
    ): { isValid: boolean; warnings: string[] } {
        const warnings: string[] = [];

        // Check for potentially problematic patterns in regex mode
        if (searchOptions.useRegex) {
            // Check for invalid capture group references
            const captureGroupRefs = replaceText.match(/\$(\d+)/g);
            if (captureGroupRefs) {
                const highestRef = Math.max(...captureGroupRefs.map(ref => parseInt(ref.slice(1))));
                if (highestRef > 9) {
                    warnings.push(`High capture group reference ($${highestRef}) - ensure your regex has enough groups`);
                }
            }

            // Check for unescaped dollar signs that might be intended as literal
            const literalDollars = replaceText.match(/\$(?![&'`$]|\d)/g);
            if (literalDollars) {
                warnings.push('Unescaped $ characters found - use $$ for literal dollar signs');
            }
        }

        return {
            isValid: true, // For now, we allow all replacement text
            warnings
        };
    }
}