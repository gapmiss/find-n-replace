import { App, Notice, TFile } from 'obsidian';
import { SearchResult, SearchOptions, ReplacementMode, ReplacementTarget, ReplacementResult, AffectedResults } from '../types';
import { SearchEngine } from './searchEngine';
import { Logger } from '../utils';
import VaultFindReplacePlugin from '../main';

/**
 * Handles all replacement operations and replacement text expansion
 */
export class ReplacementEngine {
    private app: App;
    private plugin: VaultFindReplacePlugin;
    private logger: Logger;
    private searchEngine: SearchEngine;

    constructor(app: App, plugin: VaultFindReplacePlugin, searchEngine: SearchEngine) {
        this.app = app;
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'ReplacementEngine');
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
     * @returns ReplacementResult with metadata for incremental UI updates
     */
    async dispatchReplace(
        mode: ReplacementMode,
        results: SearchResult[],
        selectedIndices: Set<number>,
        replaceText: string,
        searchOptions: SearchOptions,
        target?: ReplacementTarget
    ): Promise<ReplacementResult> {
        const startTime = Date.now();

        // Group matches by file for efficient processing and track metadata
        const grouped = new Map<TFile, SearchResult[]>();
        const replacedResultIndices: number[] = [];
        const modifiedFiles = new Set<TFile>();
        const modifiedLines = new Map<TFile, Set<number>>();

        // Determine which results will be replaced and build metadata
        switch (mode) {
            case "one": {
                // Replace a single specific match
                const res = target as SearchResult;
                grouped.set(res.file, [res]);

                // Find the index of this specific result
                const resultIndex = results.findIndex(r =>
                    r === res || (
                        r.file.path === res.file.path &&
                        r.line === res.line &&
                        r.col === res.col &&
                        r.matchText === res.matchText
                    )
                );
                if (resultIndex !== -1) {
                    replacedResultIndices.push(resultIndex);
                }
                modifiedFiles.add(res.file);
                if (!modifiedLines.has(res.file)) modifiedLines.set(res.file, new Set());
                modifiedLines.get(res.file)!.add(res.line);
                break;
            }

            case "selected": {
                // Replace all user-selected matches
                for (const idx of Array.from(selectedIndices)) {
                    const res = results[idx];
                    if (!grouped.has(res.file)) grouped.set(res.file, []);
                    grouped.get(res.file)!.push(res);
                    replacedResultIndices.push(idx);
                    modifiedFiles.add(res.file);
                    if (!modifiedLines.has(res.file)) modifiedLines.set(res.file, new Set());
                    modifiedLines.get(res.file)!.add(res.line);
                }
                break;
            }

            case "file": {
                // Replace all matches in a specific file
                const file = target as TFile;
                if (!file?.path) {
                    this.logger.error("Invalid file target for replacement", file);
                    break;
                }
                const fileResults = results.filter(r => r.file?.path === file.path);
                if (fileResults.length) {
                    grouped.set(file, fileResults);
                    // Find all indices for results in this file
                    for (let i = 0; i < results.length; i++) {
                        if (results[i].file?.path === file.path) {
                            replacedResultIndices.push(i);
                        }
                    }
                    modifiedFiles.add(file);
                    modifiedLines.set(file, new Set(fileResults.map(r => r.line)));
                }
                break;
            }

            case "vault": {
                // Replace all matches in the entire vault
                for (let i = 0; i < results.length; i++) {
                    const res = results[i];
                    if (!grouped.has(res.file)) grouped.set(res.file, []);
                    grouped.get(res.file)!.push(res);
                    replacedResultIndices.push(i);
                    modifiedFiles.add(res.file);
                    if (!modifiedLines.has(res.file)) modifiedLines.set(res.file, new Set());
                    modifiedLines.get(res.file)!.add(res.line);
                }
                break;
            }
        }

        // Process each file's replacements
        let total = 0;
        const errors: string[] = [];

        for (const [file, matches] of Array.from(grouped)) {
            try {
                const replaceAllInFile = mode === "file" || mode === "vault";
                await this.applyReplacements(file, matches, replaceText, searchOptions, replaceAllInFile);
                total += matches.length;
            } catch (error) {
                const errorMsg = `Failed to replace matches in ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(errorMsg);
                this.logger.error(errorMsg, error);
            }
        }

        // Show success notification
        this.showReplacementNotification(mode, total);

        // Build AffectedResults metadata
        const affectedResults: AffectedResults = {
            replacedResultIndices,
            modifiedFiles,
            modifiedLines,
            // Complex replacements that might affect other results require full revalidation
            requiresFullRevalidation: searchOptions.useRegex && (
                replaceText.includes('$') || // Capture groups or special tokens
                mode === "vault" // Vault-wide changes might have complex interactions
            )
        };

        const duration = Date.now() - startTime;

        return {
            mode,
            totalReplacements: total,
            filesModified: modifiedFiles.size,
            duration,
            errors,
            affectedResults
        };
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
        try {
            let content = await this.app.vault.read(file);

            const regex = this.searchEngine.buildSearchRegex(matches[0]?.pattern || '', searchOptions);

            // Handle multiline replacements differently
            if (searchOptions.multiline === true && searchOptions.useRegex) {
                // For multiline, work on entire content instead of line-by-line
                if (replaceAllInFile) {
                    // Replace all matches in entire content
                    content = content.replace(regex, (match, ...rest: (string | number)[]) => {
                        const offset = rest[rest.length - 2] as number;
                        const input = rest[rest.length - 1] as string;
                        const groups = rest.slice(0, -2) as string[];

                        // Reconstruct RegExpExecArray-like object
                        interface RegExpExecArrayLike extends Array<string> {
                            index: number;
                            input: string;
                        }
                        const execArray = [match, ...groups] as RegExpExecArrayLike;
                        execArray.index = offset;
                        execArray.input = input;

                        return this.expandReplacement(execArray as RegExpExecArray, replaceText, input, searchOptions);
                    });
                } else {
                    // Replace only specific matches - sort by position to maintain order
                    const sortedMatches = [...matches].sort((a, b) => {
                        const aPos = this.getCharacterPosition(content, a.line, a.col || 0);
                        const bPos = this.getCharacterPosition(content, b.line, b.col || 0);
                        return bPos - aPos; // Reverse order for safe replacement
                    });

                    // Replace in reverse order to maintain positions
                    for (const match of sortedMatches) {
                        const charPos = this.getCharacterPosition(content, match.line, match.col || 0);

                        // Find the actual match at this position
                        regex.lastIndex = 0;
                        let regexMatch: RegExpExecArray | null;
                        while ((regexMatch = regex.exec(content)) !== null) {
                            if (regexMatch.index === charPos && regexMatch[0] === match.matchText) {
                                const replacement = this.expandReplacement(regexMatch, replaceText, content, searchOptions);
                                content = content.slice(0, regexMatch.index) + replacement + content.slice(regexMatch.index + regexMatch[0].length);
                                break;
                            }
                            if (regexMatch[0].length === 0) {
                                regex.lastIndex++;
                                if (regex.lastIndex >= content.length) break;
                            }
                        }
                    }
                }

                // Write back the modified content
                await this.app.vault.modify(file, content);
                return;
            }

            // Original line-by-line processing for non-multiline
            const lines = content.split('\n');

        if (replaceAllInFile) {
            // Replace all matches in the file (once per unique line to prevent repeated replacements)
            const uniqueLines = Array.from(new Set(matches.map(m => m.line)));
            for (const lineNum of uniqueLines) {
                const lineText = lines[lineNum] ?? '';
                lines[lineNum] = lineText.replace(regex, (match, ...rest: (string | number)[]) => {
                    // Extract capture groups and match info from regex replace callback
                    // rest = [group1, group2, ..., offset, input]
                    const offset = rest[rest.length - 2] as number;
                    const input = rest[rest.length - 1] as string;
                    const groups = rest.slice(0, -2) as string[];

                    // Reconstruct a RegExpExecArray-like object for replacement expansion
                    interface RegExpExecArrayLike extends Array<string> {
                        index: number;
                        input: string;
                    }
                    const execArray = [match, ...groups] as RegExpExecArrayLike;
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
                // Protection against infinite loops and runaway regex patterns
                const startTime = Date.now();
                const REGEX_TIMEOUT_MS = 5000; // 5 second timeout for complex patterns

                let foundMatch = false;
                while ((matchArr = regex.exec(lineText)) !== null) {
                    // SECURITY: Check for timeout to prevent runaway regex (ReDoS protection)
                    if (Date.now() - startTime > REGEX_TIMEOUT_MS) {
                        const userMessage = `Regex pattern timed out in file "${file.path}". Try simplifying your search pattern.`;
                        this.logger.error(userMessage, undefined, true);
                        throw new Error(`Regex execution timeout after ${REGEX_TIMEOUT_MS}ms. Pattern may be too complex or unsafe.`);
                    }

                    if (matchArr.index === res.col) {
                        // Found the exact match - perform replacement
                        const replacement = this.expandReplacement(matchArr, replaceText, lineText, searchOptions);
                        lines[res.line] =
                            lineText.slice(0, matchArr.index) +
                            replacement +
                            lineText.slice(matchArr.index + matchArr[0].length);
                        foundMatch = true;
                        break;
                    }

                    // CRITICAL: Prevent infinite loops with zero-length matches
                    // Examples: /(?=x)/, /\b/, /^/, /$/, /(?!x)/, etc.
                    // Without this, regex.exec() will match at the same position forever
                    if (matchArr[0].length === 0) {
                        regex.lastIndex++;
                        // Safety check: don't go past the end of the string
                        if (regex.lastIndex >= lineText.length) {
                            break;
                        }
                    }
                }

                // If we didn't find the match at the expected position, this could indicate a logic error
                if (!foundMatch) {
                    this.logger.warn(`Could not find match at expected position - line ${res.line}, col ${res.col}, text: "${res.matchText}"`);
                }
            }
        }

            // Write the modified content back to the file
            await this.app.vault.modify(file, lines.join('\n'));
        } catch (error) {
            // Handle file operation errors gracefully
            this.logger.error(`Failed to replace content in file ${file.path}:`, error);
            throw new Error(`Replacement failed for file "${file.path}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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

    /**
     * Converts line/column position to character position in content
     * @param content - The full content string
     * @param line - Zero-based line number
     * @param col - Zero-based column number
     * @returns Character position in the content string
     */
    private getCharacterPosition(content: string, line: number, col: number): number {
        const lines = content.split('\n');
        let charPos = 0;

        // Add characters from all previous lines (including their \n characters)
        for (let i = 0; i < line && i < lines.length; i++) {
            charPos += lines[i].length + 1; // +1 for the \n character
        }

        // Add column position within the target line
        charPos += col;

        return charPos;
    }
}