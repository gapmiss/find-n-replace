import { App, Notice } from 'obsidian';
import { SearchResult, SearchOptions } from '../types';

/**
 * Handles all search operations and regex building logic
 */
export class SearchEngine {
    private app: App;
    private lastCompiledRegex: RegExp | null = null;
    private lastSearchOptions: string = '';

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Main search function - searches all markdown files in the vault
     * @param query - The search query string
     * @param options - Search configuration options
     * @returns Promise resolving to array of search results
     */
    async performSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            return [];
        }

        const results: SearchResult[] = [];
        const files = this.app.vault.getMarkdownFiles();

        // Pre-build regex pattern if needed (for performance)
        let regex: RegExp | null = null;
        if (options.useRegex || options.wholeWord) {
            regex = this.buildSearchRegex(query, options);
        }

        // Performance optimization: pre-convert query once for case-insensitive searches
        // This eliminates thousands of repeated toLowerCase() calls during search
        const searchQuery = options.matchCase ? trimmedQuery : trimmedQuery.toLowerCase();

        // Performance optimization: process files in batches to prevent UI freezing
        const BATCH_SIZE = 10;   // Number of files to process at once
        const YIELD_DELAY = 0;   // Milliseconds to wait between batches

        // Process files in batches to maintain responsive UI
        for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
            const batch = files.slice(batchStart, batchStart + BATCH_SIZE);

            // Process all files in current batch concurrently
            await Promise.all(batch.map(async (file) => {
                try {
                    const content = await this.app.vault.read(file);
                    const lines = content.split('\n');

                // Special case: handle dot regex patterns that match everything
                const isDotRegex = options.useRegex && regex && (regex.source === '.' || regex.source === '.*');
                if (isDotRegex) {
                    // For dot regex, match every non-empty line
                    for (let i = 0; i < lines.length; i++) {
                        const lineText = lines[i];
                        if (lineText.trim() === '') continue; // Skip empty lines

                        results.push({
                            file,
                            line: i,
                            content: lineText,
                            matchText: lineText, // Entire line is the match
                            col: 0,
                            pattern: query
                        });
                    }
                    return;
                }

                // Normal processing: search each line for matches
                for (let i = 0; i < lines.length; i++) {
                    const lineText = lines[i];
                    if (lineText.trim() === '') continue; // Skip empty lines

                    if ((options.useRegex || options.wholeWord) && regex) {
                        // Use regex matching for regex mode or whole word mode
                        for (const m of lineText.matchAll(regex)) {
                            if (!m[0]) continue; // Skip empty matches
                            results.push({
                                file,
                                line: i,
                                content: lineText,
                                matchText: m[0],
                                col: m.index ?? 0,
                                pattern: query
                            });
                        }
                    } else {
                        // Use simple string matching for basic search
                        // Only convert line text case when needed (not for case-sensitive searches)
                        const haystack = options.matchCase ? lineText : lineText.toLowerCase();
                        const needle = searchQuery; // Use pre-converted query
                        if (!needle) continue;

                        // Find all occurrences of needle in haystack
                        let start = 0;
                        while (true) {
                            const idx = haystack.indexOf(needle, start);
                            if (idx === -1) break; // No more matches in this line

                            results.push({
                                file,
                                line: i,
                                content: lineText,
                                matchText: lineText.slice(idx, idx + needle.length),
                                col: idx,
                                pattern: query
                            });

                            // Move start position forward to find next match
                            start = idx + Math.max(needle.length, 1);
                        }
                    }
                }
                } catch (error) {
                    // Log file read errors but continue processing other files
                    console.warn(`Failed to read file ${file.path}:`, error);
                    // Skip this file and continue with others
                }
            }));

            // Yield control back to UI between batches
            await new Promise(r => setTimeout(r, YIELD_DELAY));
        }

        // Sort results by file path, then line number, then column
        results.sort((a, b) => {
            if (a.file.path < b.file.path) return -1;
            if (a.file.path > b.file.path) return 1;
            if (a.line !== b.line) return a.line - b.line;
            const colA = typeof a.col === "number" ? a.col : 0;
            const colB = typeof b.col === "number" ? b.col : 0;
            return colA - colB;
        });

        return results;
    }

    /**
     * Builds the RegExp object used for searching based on current options
     * Includes caching to avoid recompiling the same regex
     * @param query - The search query
     * @param options - Search configuration options
     * @returns RegExp configured with appropriate flags and pattern
     */
    buildSearchRegex(query: string, options: SearchOptions): RegExp {
        // Create cache key from options and query
        const cacheKey = JSON.stringify({ query, options });

        // Return cached regex if options haven't changed
        if (this.lastSearchOptions === cacheKey && this.lastCompiledRegex) {
            return this.lastCompiledRegex;
        }

        let pattern = query ?? '';

        // If not in regex mode, escape special regex characters so they're treated literally
        if (!options.useRegex) {
            pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        // Check if pattern already has word boundaries or anchors to avoid double-wrapping
        const looksAnchoredOrHasBoundaries = /(^\\b|\\b$|\^|\$|\(\?<!|\(\?=|\(\?!|\(\?<=)/.test(pattern);

        // Add word boundaries if whole word mode is enabled and pattern doesn't already have them
        if (options.wholeWord && !looksAnchoredOrHasBoundaries) {
            // When regex mode is ON, wrap in non-capturing group to preserve existing capture group indices
            pattern = options.useRegex ? `\\b(?:${pattern})\\b` : `\\b${pattern}\\b`;
        }

        // Build flags: 'g' for global, 'i' for case-insensitive if needed
        try {
            const flags = (options.matchCase ? '' : 'i') + 'g';
            const regex = new RegExp(pattern, flags);

            // Cache the compiled regex
            this.lastCompiledRegex = regex;
            this.lastSearchOptions = cacheKey;

            return regex;
        } catch (error) {
            // Handle invalid regex gracefully
            new Notice('Invalid regular expression pattern');
            throw new Error('Invalid regex pattern');
        }
    }

    /**
     * Validates if a search query is valid for the given options
     * @param query - The search query to validate
     * @param options - Search configuration options
     * @returns true if valid, false otherwise
     */
    validateSearchQuery(query: string, options: SearchOptions): boolean {
        if (!query.trim()) {
            return false;
        }

        if (options.useRegex) {
            try {
                new RegExp(query);
                return true;
            } catch {
                return false;
            }
        }

        return true;
    }

    /**
     * Clears the regex cache (useful when switching between different search contexts)
     */
    clearCache(): void {
        this.lastCompiledRegex = null;
        this.lastSearchOptions = '';
    }

    /**
     * Cleanup method for when the engine is no longer needed
     * Clears all cached data and references
     */
    dispose(): void {
        this.clearCache();
        // Clear reference to app for garbage collection
        this.app = null as any;
    }
}