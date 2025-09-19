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

    // TODO: Implement these features (see ROADMAP.md)
    highlightDuration: number; // in ms
    persistentHighlight: boolean;
    excludePatterns: string[];
    fileExtensions: string[];
    searchInFolders: string[];
    excludeFolders: string[];
    showLineNumbers: boolean;
    showFileExtensions: boolean;

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

    // TODO: Implement these features (see ROADMAP.md)
    highlightDuration: 2000,
    persistentHighlight: false,
    excludePatterns: [],
    fileExtensions: ['md'],
    searchInFolders: [],
    excludeFolders: [],
    showLineNumbers: true,
    showFileExtensions: false,
};