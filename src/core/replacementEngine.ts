import { App, Notice, TFile } from 'obsidian';
import { SearchResult, SearchOptions, ReplacementMode, ReplacementTarget, ReplacementResult, AffectedResults } from '../types';
import { SearchEngine } from './searchEngine';
import { Logger, expandReplacement } from '../utils';
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
                // Validate target is a SearchResult before casting
                if (!target || typeof target !== 'object' || !('file' in target) || !('line' in target) || !('matchText' in target)) {
                    this.logger.error("Invalid target for single replacement - not a SearchResult", target);
                    break;
                }
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
                    // Bounds check to prevent undefined access
                    if (idx < 0 || idx >= results.length) {
                        this.logger.warn(`Invalid selection index ${idx} (results length: ${results.length}), skipping`);
                        continue;
                    }
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
                if (!(target instanceof TFile)) {
                    this.logger.error("Invalid file target for replacement - not a TFile instance", target);
                    break;
                }
                const file = target;
                if (!file.path) {
                    this.logger.error("Invalid file target for replacement - missing path", file);
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
            // Use vault.process() for atomic read-modify-write (Obsidian Rule #19)
            // Prevents data loss if file changes between read and write
            await this.app.vault.process(file, (content) => {
                return this.transformContent(content, matches, replaceText, searchOptions, replaceAllInFile, file.path);
            });
        } catch (error) {
            this.logger.error(`Failed to replace content in file ${file.path}:`, error);
            throw new Error(`Replacement failed for file "${file.path}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Pure transformation function for file content replacement
     * @param content - Original file content
     * @param matches - Array of SearchResult objects to replace
     * @param replaceText - The replacement text
     * @param searchOptions - Current search options
     * @param replaceAllInFile - If true, replaces all matches; if false, only specified matches
     * @param filePath - File path for logging
     * @returns Modified content
     */
    private transformContent(
        content: string,
        matches: SearchResult[],
        replaceText: string,
        searchOptions: SearchOptions,
        replaceAllInFile: boolean,
        filePath: string
    ): string {
        const regex = this.searchEngine.buildSearchRegex(matches[0]?.pattern || '', searchOptions);

        // Handle multiline replacements differently
        if (searchOptions.multiline === true && searchOptions.useRegex) {
            return this.transformMultilineContent(content, matches, replaceText, searchOptions, replaceAllInFile, regex);
        }

        // Line-by-line processing for non-multiline
        const lines = content.split('\n');

        if (replaceAllInFile) {
            this.replaceAllInLines(lines, matches, replaceText, searchOptions, regex);
        } else {
            this.replaceSpecificMatches(lines, matches, replaceText, searchOptions, regex, filePath);
        }

        return lines.join('\n');
    }

    /**
     * Handles multiline content transformation
     */
    private transformMultilineContent(
        content: string,
        matches: SearchResult[],
        replaceText: string,
        searchOptions: SearchOptions,
        replaceAllInFile: boolean,
        regex: RegExp
    ): string {
        if (replaceAllInFile) {
            // Replace all matches in entire content
            return content.replace(regex, (match, ...rest: (string | number)[]) => {
                const offset = rest[rest.length - 2] as number;
                const input = rest[rest.length - 1] as string;
                const groups = rest.slice(0, -2) as string[];

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

        // Replace only specific matches - sort by position (reverse order for safe replacement)
        const sortedMatches = [...matches].sort((a, b) => {
            const aPos = this.getCharacterPosition(content, a.line, a.col || 0);
            const bPos = this.getCharacterPosition(content, b.line, b.col || 0);
            return bPos - aPos;
        });

        let result = content;
        for (const match of sortedMatches) {
            const charPos = this.getCharacterPosition(result, match.line, match.col || 0);

            regex.lastIndex = 0;
            let regexMatch: RegExpExecArray | null;
            while ((regexMatch = regex.exec(result)) !== null) {
                if (regexMatch.index === charPos && regexMatch[0] === match.matchText) {
                    const replacement = this.expandReplacement(regexMatch, replaceText, result, searchOptions);
                    result = result.slice(0, regexMatch.index) + replacement + result.slice(regexMatch.index + regexMatch[0].length);
                    break;
                }
                if (regexMatch[0].length === 0) {
                    regex.lastIndex++;
                    if (regex.lastIndex >= result.length) break;
                }
            }
        }
        return result;
    }

    /**
     * Replaces all matches in the specified lines
     */
    private replaceAllInLines(
        lines: string[],
        matches: SearchResult[],
        replaceText: string,
        searchOptions: SearchOptions,
        regex: RegExp
    ): void {
        const uniqueLines = Array.from(new Set(matches.map(m => m.line)));
        for (const lineNum of uniqueLines) {
            const lineText = lines[lineNum] ?? '';
            lines[lineNum] = lineText.replace(regex, (match, ...rest: (string | number)[]) => {
                const offset = rest[rest.length - 2] as number;
                const input = rest[rest.length - 1] as string;
                const groups = rest.slice(0, -2) as string[];

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
    }

    /**
     * Replaces only specific matches at exact positions
     */
    private replaceSpecificMatches(
        lines: string[],
        matches: SearchResult[],
        replaceText: string,
        searchOptions: SearchOptions,
        regex: RegExp,
        filePath: string
    ): void {
        // Sort in reverse order to keep indices valid
        matches.sort((a, b) =>
            a.line === b.line ? (b.col || 0) - (a.col || 0) : b.line - a.line
        );

        for (const res of matches) {
            const lineText = lines[res.line] ?? '';
            let matchArr: RegExpExecArray | null;
            regex.lastIndex = 0;

            const startTime = Date.now();
            const REGEX_TIMEOUT_MS = 5000;

            let foundMatch = false;
            while ((matchArr = regex.exec(lineText)) !== null) {
                if (Date.now() - startTime > REGEX_TIMEOUT_MS) {
                    this.logger.error(`Regex pattern timed out in file "${filePath}". Try simplifying your search pattern.`, undefined, true);
                    throw new Error(`Regex execution timeout after ${REGEX_TIMEOUT_MS}ms. Pattern may be too complex or unsafe.`);
                }

                if (matchArr.index === res.col && matchArr[0] === res.matchText) {
                    // Position AND content match - safe to replace
                    const replacement = this.expandReplacement(matchArr, replaceText, lineText, searchOptions);
                    lines[res.line] =
                        lineText.slice(0, matchArr.index) +
                        replacement +
                        lineText.slice(matchArr.index + matchArr[0].length);
                    foundMatch = true;
                    break;
                }

                if (matchArr[0].length === 0) {
                    regex.lastIndex++;
                    if (regex.lastIndex >= lineText.length) break;
                }
            }

            if (!foundMatch) {
                this.logger.warn(`Could not find match at expected position - line ${res.line}, col ${res.col}, text: "${res.matchText}"`);
            }
        }
    }

    /**
     * Expands replacement text with special tokens like $1, $&, etc.
     * Delegates to shared expandReplacement utility for consistency with preview
     * @param matchArr - The RegExp match result with capture groups
     * @param replacement - The replacement text template
     * @param _input - The original input string (unused, match.input is used instead)
     * @param searchOptions - Current search options
     * @returns The final replacement string
     */
    expandReplacement(
        matchArr: RegExpExecArray,
        replacement: string,
        _input: string,
        searchOptions: SearchOptions
    ): string {
        // No expansion in non-regex mode - return replacement text literally
        if (!searchOptions.useRegex) return replacement;

        // Delegate to shared utility for consistency between preview and actual replacement
        return expandReplacement(replacement, matchArr);
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
     * @internal Test utility - validation not yet implemented in UI
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