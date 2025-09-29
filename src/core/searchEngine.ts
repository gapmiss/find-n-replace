import { App, Notice } from 'obsidian';
import { SearchResult, SearchOptions, SessionFilters } from '../types';
import { Logger } from '../utils';
import VaultFindReplacePlugin from '../main';

/**
 * Handles all search operations and regex building logic
 */
export class SearchEngine {
    private app: App;
    private plugin: VaultFindReplacePlugin;
    private logger: Logger;
    private lastCompiledRegex: RegExp | null = null;
    private lastSearchOptions: string = '';
    private failedFiles: string[] = []; // Track files that failed during search

    constructor(app: App, plugin: VaultFindReplacePlugin) {
        this.app = app;
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'SearchEngine');
    }

    /**
     * Clears the regex cache to ensure fresh compilation
     * Should be called when search options change
     */
    clearCache(): void {
        this.logger.debug('Clearing regex cache');
        this.lastCompiledRegex = null;
        this.lastSearchOptions = '';
    }

    /**
     * Filters files based on plugin settings or session filters
     * @param files - Array of files to filter
     * @param sessionFilters - Optional session-only filters (overrides plugin settings)
     * @returns Filtered array of files
     */
    private filterFiles(files: any[], sessionFilters?: SessionFilters): any[] {
        // Use session filters if provided, otherwise fall back to plugin settings
        const settings = sessionFilters ? {
            fileExtensions: sessionFilters.fileExtensions || [],
            searchInFolders: sessionFilters.searchInFolders || [],
            includePatterns: sessionFilters.includePatterns || [],
            excludeFolders: sessionFilters.excludeFolders || [],
            excludePatterns: sessionFilters.excludePatterns || []
        } : {
            fileExtensions: this.plugin.settings.fileExtensions || [],
            searchInFolders: this.plugin.settings.searchInFolders || [],
            includePatterns: this.plugin.settings.includePatterns || [],
            excludeFolders: this.plugin.settings.excludeFolders || [],
            excludePatterns: this.plugin.settings.excludePatterns || []
        };
        let filteredFiles = [...files];

        this.logger.debug('Filtering files with settings:', {
            fileExtensions: settings.fileExtensions,
            searchInFolders: settings.searchInFolders,
            includePatterns: settings.includePatterns,
            excludeFolders: settings.excludeFolders,
            excludePatterns: settings.excludePatterns
        });

        // Filter by file extensions if specified
        if (settings.fileExtensions.length > 0) {
            filteredFiles = filteredFiles.filter(file => {
                const extension = file.extension;
                // Support both '.md' and 'md' formats in settings
                const included = settings.fileExtensions.some(ext =>
                    ext === extension || ext === '.' + extension
                );
                this.logger.trace(`File ${file.path}: extension ${extension}, included: ${included}`);
                return included;
            });
        }

        // Filter by folder inclusion if specified
        if (settings.searchInFolders.length > 0) {
            filteredFiles = filteredFiles.filter(file => {
                const filePath = file.path;
                const included = settings.searchInFolders.some(folder => {
                    // Normalize folder path (handle both 'Notes/' and 'Notes' formats)
                    const normalizedFolder = folder.endsWith('/') || folder.endsWith('\\') ? folder : folder + '/';
                    return filePath.startsWith(normalizedFolder) || filePath === folder;
                });
                this.logger.trace(`File ${filePath}: included in searchInFolders: ${included}`);
                return included;
            });
        }

        // Filter by folder exclusion
        if (settings.excludeFolders.length > 0) {
            filteredFiles = filteredFiles.filter(file => {
                const filePath = file.path;
                const excluded = settings.excludeFolders.some(folder => {
                    // Normalize folder path (handle both 'Notes/' and 'Notes' formats)
                    const normalizedFolder = folder.endsWith('/') || folder.endsWith('\\') ? folder : folder + '/';
                    return filePath.startsWith(normalizedFolder) || filePath === folder;
                });
                this.logger.trace(`File ${filePath}: excluded by excludeFolders: ${excluded}`);
                return !excluded;
            });
        }

        // Filter by include patterns (glob-like patterns)
        if (settings.includePatterns && settings.includePatterns.length > 0) {
            filteredFiles = filteredFiles.filter(file => {
                const filePath = file.path;
                const included = settings.includePatterns.some(pattern =>
                    this.matchesPattern(filePath, pattern)
                );
                this.logger.trace(`File ${filePath}: included by patterns: ${included}`);
                return included;
            });
        }

        // Filter by exclude patterns (glob-like patterns)
        if (settings.excludePatterns.length > 0) {
            filteredFiles = filteredFiles.filter(file => {
                const filePath = file.path;
                const excluded = settings.excludePatterns.some(pattern =>
                    this.matchesPattern(filePath, pattern)
                );
                this.logger.trace(`File ${filePath}: excluded by patterns: ${excluded}`);
                return !excluded;
            });
        }

        this.logger.debug(`Filtered ${files.length} files down to ${filteredFiles.length} files`);
        return filteredFiles;
    }

    /**
     * Simple glob-like pattern matching
     * Supports * (any characters) and ? (single character)
     * @param path - File path to test
     * @param pattern - Pattern to match against
     * @returns True if path matches pattern
     */
    private matchesPattern(path: string, pattern: string): boolean {
        // Convert glob pattern to regex
        // Escape special regex characters except * and ?
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
            .replace(/\*/g, '.*') // * becomes .*
            .replace(/\?/g, '.'); // ? becomes .

        const regex = new RegExp('^' + regexPattern + '$', 'i');
        return regex.test(path);
    }

    /**
     * Main search function - searches filtered files in the vault
     * @param query - The search query string
     * @param options - Search configuration options
     * @param sessionFilters - Optional session-only filters (overrides plugin settings)
     * @returns Promise resolving to array of search results
     */
    async performSearch(query: string, options: SearchOptions, sessionFilters?: SessionFilters): Promise<SearchResult[]> {
        const trimmedQuery = query.trim();
        this.logger.debug('performSearch called:', { query: trimmedQuery, options });

        // Clear previous failures
        this.failedFiles = [];

        if (!trimmedQuery) {
            this.logger.debug('Empty query, returning 0 results');
            return [];
        }

        const results: SearchResult[] = [];
        // Use getAllLoadedFiles() when any filtering is configured via session filters
        const hasSessionFilters = sessionFilters && (
            (sessionFilters.fileExtensions && sessionFilters.fileExtensions.length > 0) ||
            (sessionFilters.searchInFolders && sessionFilters.searchInFolders.length > 0) ||
            (sessionFilters.includePatterns && sessionFilters.includePatterns.length > 0) ||
            (sessionFilters.excludeFolders && sessionFilters.excludeFolders.length > 0) ||
            (sessionFilters.excludePatterns && sessionFilters.excludePatterns.length > 0)
        );

        // Always search all files when no specific filtering is configured
        // This ensures comprehensive search coverage by default
        const shouldUseAllFiles = hasSessionFilters || !sessionFilters;

        const allFiles = shouldUseAllFiles ?
            this.app.vault.getAllLoadedFiles() :
            this.app.vault.getMarkdownFiles();

        const files = this.filterFiles(allFiles, sessionFilters);
        this.logger.debug('Found', files.length, shouldUseAllFiles ? 'files' : 'markdown files', 'to search');

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

                    // Use multiline processing if multiline option is enabled and we're using regex
                    if (options.multiline === true && options.useRegex && regex) {
                        // Process entire file content for multiline matches
                        for (const m of Array.from(content.matchAll(regex))) {
                            if (!m[0]) continue; // Skip empty matches

                            // Find which line this match starts on
                            const beforeMatch = content.substring(0, m.index ?? 0);
                            const lineNumber = beforeMatch.split('\n').length - 1;
                            const lineStartPos = beforeMatch.lastIndexOf('\n') + 1;
                            const colInLine = (m.index ?? 0) - lineStartPos;

                            // Get the line content for display (show first line of match)
                            const lines = content.split('\n');
                            const lineContent = lines[lineNumber] || '';

                            results.push({
                                file,
                                line: lineNumber,
                                content: lineContent,
                                matchText: m[0],
                                col: colInLine,
                                pattern: query
                            });
                        }
                        return; // Skip line-by-line processing
                    }

                    // Default line-by-line processing
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
                        for (const m of Array.from(lineText.matchAll(regex))) {
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
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    this.logger.warn(`Failed to read file ${file.path}: ${errorMsg}`, error);

                    // Track failed files for user notification
                    this.failedFiles.push(file.path);

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

        this.logger.debug('Search completed:', {
            query: trimmedQuery,
            options,
            resultCount: results.length,
            fileCount: files.length,
            failedFiles: this.failedFiles.length
        });

        // Notify user about partial failures if any occurred
        if (this.failedFiles.length > 0) {
            const failedCount = this.failedFiles.length;
            const totalCount = files.length;
            const successfulCount = totalCount - failedCount;

            if (failedCount < 5) {
                // Show specific files if few failures
                this.logger.error(
                    `Search completed with ${failedCount} file${failedCount > 1 ? 's' : ''} inaccessible: ${this.failedFiles.join(', ')}`,
                    undefined,
                    true
                );
            } else {
                // Show summary if many failures
                this.logger.error(
                    `Search partially completed: ${successfulCount}/${totalCount} files searched (${failedCount} files inaccessible)`,
                    undefined,
                    true
                );
            }
        }

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
            this.logger.debug('Using cached regex for:', cacheKey);
            return this.lastCompiledRegex;
        }

        this.logger.debug('Building new regex for:', cacheKey);
        this.logger.debug('Previous cache key was:', this.lastSearchOptions);

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

        // Build flags: 'g' for global, 'i' for case-insensitive if needed, 'm' for multiline
        try {
            const flags = (options.matchCase ? '' : 'i') + 'g' + (options.multiline === true ? 'm' : '');
            const regex = new RegExp(pattern, flags);

            // Cache the compiled regex
            this.lastCompiledRegex = regex;
            this.lastSearchOptions = cacheKey;

            return regex;
        } catch (error) {
            // This should not happen since validation is done in the view first
            this.logger.error('Unexpected regex error during buildSearchRegex:', error);
            this.logger.error('Pattern that failed:', pattern);
            this.logger.error('Options:', options);
            throw new Error(`Unexpected regex compilation error: ${error.message}`);
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
     * Cleanup method for when the engine is no longer needed
     * Clears all cached data and references
     */
    dispose(): void {
        this.clearCache();
        // Clear reference to app for garbage collection
        this.app = null as any;
    }
}