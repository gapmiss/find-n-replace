/**
 * Log levels for controlling console output granularity
 */
export enum LogLevel {
    SILENT = 0,    // No logging (production end users)
    ERROR = 1,     // Only critical errors (default for end users)
    WARN = 2,      // Warnings + errors (power users)
    INFO = 3,      // Info + warnings + errors (advanced users)
    DEBUG = 4,     // All logging (developers/troubleshooting)
    TRACE = 5      // Verbose tracing (core development)
}

/**
 * Plugin settings interface
 */
export interface VaultFindReplaceSettings {
    // Core functionality settings (implemented)
    maxResults: number;
    enableAutoSearch: boolean;
    searchDebounceDelay: number;
    logLevel: LogLevel; // Replaces enableDebugLogging with granular control
    fileGroupStates: Record<string, boolean>; // Persistent collapse/expand states by file path

    // File filtering defaults (VSCode-style)
    defaultIncludePatterns: string[]; // Default patterns for "files to include" input
    defaultExcludePatterns: string[]; // Default patterns for "files to exclude" input

    // TODO: Implement these features (see ROADMAP.md)
    highlightDuration: number; // in ms
    persistentHighlight: boolean;
    showLineNumbers: boolean;
    showFileExtensions: boolean;

    // Legacy settings for migration (will be removed after migration)
    excludePatterns?: string[];
    fileExtensions?: string[];
    searchInFolders?: string[];
    includePatterns?: string[];
    excludeFolders?: string[];

    // Legacy setting for migration (will be removed)
    enableDebugLogging?: boolean;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: VaultFindReplaceSettings = {
    // Core functionality settings (implemented)
    maxResults: 1000,
    enableAutoSearch: true,
    searchDebounceDelay: 300,
    logLevel: LogLevel.ERROR, // Default to clean console for end users
    fileGroupStates: {}, // Start with empty collapse/expand states

    // File filtering defaults (VSCode-style)
    defaultIncludePatterns: [], // Start with no default filters
    defaultExcludePatterns: [], // Start with no default filters

    // TODO: Implement these features (see ROADMAP.md)
    highlightDuration: 2000,
    persistentHighlight: false,
    showLineNumbers: true,
    showFileExtensions: false,
};