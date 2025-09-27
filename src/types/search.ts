import { TFile } from 'obsidian';

/**
 * Interface defining the structure of a search result
 * Each SearchResult represents a single match found in a file
 */
export interface SearchResult {
    file: TFile;        // The Obsidian file containing the match
    line: number;       // Zero-based line number where the match was found
    content: string;    // The full text content of the line containing the match
    matchText: string;  // The actual text that matched the search pattern
    col?: number | undefined;  // Optional: Zero-based column position of the match within the line
    pattern: string;    // The original search pattern that produced this match
}

/**
 * Search configuration options
 */
export interface SearchOptions {
    matchCase: boolean;     // Whether search is case-sensitive
    wholeWord: boolean;     // Whether to match whole words only
    useRegex: boolean;      // Whether to use regex pattern matching
    multiline?: boolean;    // Whether to enable multiline regex matching (allows patterns like \n to work)
}

/**
 * Search statistics
 */
export interface SearchStatistics {
    totalResults: number;
    filesWithResults: number;
    searchDuration: number; // in milliseconds
    averageResultsPerFile: number;
}

/**
 * Session-only filter settings (separate from persistent plugin settings)
 */
export interface SessionFilters {
    fileExtensions?: string[];
    searchInFolders?: string[];
    includePatterns?: string[];
    excludeFolders?: string[];
    excludePatterns?: string[];
}