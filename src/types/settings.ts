/**
 * Plugin settings interface
 */
export interface VaultFindReplaceSettings {
    highlightDuration: number; // in ms
    persistentHighlight: boolean;
    maxResults: number;
    excludePatterns: string[];
    fileExtensions: string[];
    searchInFolders: string[];
    excludeFolders: string[];
    enableAutoSearch: boolean;
    searchDebounceDelay: number;
    showLineNumbers: boolean;
    showFileExtensions: boolean;
    enableDebugLogging: boolean;
    fileGroupStates: Record<string, boolean>; // Persistent collapse/expand states by file path
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: VaultFindReplaceSettings = {
    highlightDuration: 2000,
    persistentHighlight: false,
    maxResults: 1000,
    excludePatterns: [],
    fileExtensions: ['md'],
    searchInFolders: [],
    excludeFolders: [],
    enableAutoSearch: true,
    searchDebounceDelay: 300,
    showLineNumbers: true,
    showFileExtensions: false,
    enableDebugLogging: false,
    fileGroupStates: {}, // Start with empty collapse/expand states
};