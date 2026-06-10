import { Logger } from '../utils';
import VaultFindReplacePlugin from '../main';

/**
 * Settings keys for the history arrays managed by HistoryManager
 */
type HistoryKey = 'searchHistory' | 'replaceHistory' | 'includeHistory' | 'excludeHistory';

const ALL_HISTORY_KEYS: HistoryKey[] = ['searchHistory', 'replaceHistory', 'includeHistory', 'excludeHistory'];

/**
 * Manages search, replace, and file filter history with LRU caching
 * Provides persistent storage across sessions via plugin settings
 */
export class HistoryManager {
    private plugin: VaultFindReplacePlugin;
    private logger: Logger;

    constructor(plugin: VaultFindReplacePlugin) {
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'HistoryManager');
    }

    /**
     * Gets the current max history size from settings
     */
    private getMaxSize(): number {
        return this.plugin.settings.maxHistorySize || 50;
    }

    /**
     * Checks if history is enabled
     */
    private isHistoryEnabled(): boolean {
        return this.plugin.settings.enableSearchHistory !== false;
    }

    /**
     * Adds a pattern to the given history array
     * Implements LRU: moves existing entry to front, deduplicates consecutive entries
     * @param key - Which history array to add to
     * @param pattern - The pattern to add
     * @param trim - Whether to trim the pattern and skip blank values
     *               (false preserves whitespace and allows empty strings, e.g. replace text)
     */
    private addEntry(key: HistoryKey, pattern: string, trim: boolean): void {
        if (!this.isHistoryEnabled()) {
            this.logger.debug('History is disabled, skipping save');
            return;
        }

        if (pattern === null || pattern === undefined) {
            this.logger.debug(`Skipping null/undefined ${key} pattern`);
            return;
        }

        if (trim) {
            if (pattern.trim() === '') {
                this.logger.debug(`Skipping empty ${key} pattern`);
                return;
            }
            pattern = pattern.trim();
        }

        const history = this.plugin.settings[key];

        // Don't add if identical to most recent entry (deduplication)
        if (history.length > 0 && history[0] === pattern) {
            this.logger.debug(`Skipping duplicate ${key} pattern:`, pattern);
            return;
        }

        // Remove existing occurrence (LRU: move to front)
        const existingIndex = history.indexOf(pattern);
        if (existingIndex > 0) {
            history.splice(existingIndex, 1);
            this.logger.debug(`Moved existing ${key} pattern to front:`, pattern);
        }

        // Add to front
        history.unshift(pattern);

        // Enforce max size
        const maxSize = this.getMaxSize();
        if (history.length > maxSize) {
            const removed = history.splice(maxSize);
            this.logger.debug(`Trimmed ${key}: removed ${removed.length} old entries`);
        }

        // Persist to settings
        void this.plugin.saveSettings();
        this.logger.debug(`Added ${key} entry:`, pattern, `(total: ${history.length})`);
    }

    /**
     * Gets a copy of the given history array (newest first)
     */
    private getEntries(key: HistoryKey): string[] {
        return [...this.plugin.settings[key]];
    }

    /**
     * Clears the given history array
     */
    private clearEntries(key: HistoryKey): void {
        this.plugin.settings[key] = [];
        void this.plugin.saveSettings();
        this.logger.info(`Cleared ${key}`);
    }

    /**
     * Removes a specific entry from the given history array
     */
    private removeEntry(key: HistoryKey, pattern: string): void {
        const history = this.plugin.settings[key];
        const index = history.indexOf(pattern);
        if (index !== -1) {
            history.splice(index, 1);
            void this.plugin.saveSettings();
            this.logger.debug(`Removed ${key} entry:`, pattern);
        }
    }

    /**
     * Adds a search pattern to history
     * @param pattern - The search pattern to add
     */
    addSearch(pattern: string): void {
        this.addEntry('searchHistory', pattern, true);
    }

    /**
     * Adds a replace pattern to history
     * Empty strings are allowed (common use case: delete matches), whitespace is preserved
     * @param pattern - The replace pattern to add
     */
    addReplace(pattern: string): void {
        this.addEntry('replaceHistory', pattern, false);
    }

    /**
     * Adds a "files to include" filter pattern to history
     * @param pattern - The include pattern to add
     */
    addInclude(pattern: string): void {
        this.addEntry('includeHistory', pattern, true);
    }

    /**
     * Adds a "files to exclude" filter pattern to history
     * @param pattern - The exclude pattern to add
     */
    addExclude(pattern: string): void {
        this.addEntry('excludeHistory', pattern, true);
    }

    /**
     * Gets the search history (newest first)
     */
    getSearchHistory(): string[] {
        return this.getEntries('searchHistory');
    }

    /**
     * Gets the replace history (newest first)
     */
    getReplaceHistory(): string[] {
        return this.getEntries('replaceHistory');
    }

    /**
     * Gets the "files to include" history (newest first)
     */
    getIncludeHistory(): string[] {
        return this.getEntries('includeHistory');
    }

    /**
     * Gets the "files to exclude" history (newest first)
     */
    getExcludeHistory(): string[] {
        return this.getEntries('excludeHistory');
    }

    /**
     * Clears all search history
     */
    clearSearchHistory(): void {
        this.clearEntries('searchHistory');
    }

    /**
     * Clears all replace history
     */
    clearReplaceHistory(): void {
        this.clearEntries('replaceHistory');
    }

    /**
     * Clears all "files to include" history
     */
    clearIncludeHistory(): void {
        this.clearEntries('includeHistory');
    }

    /**
     * Clears all "files to exclude" history
     */
    clearExcludeHistory(): void {
        this.clearEntries('excludeHistory');
    }

    /**
     * Clears all history (search, replace, include, exclude)
     */
    clearAllHistory(): void {
        ALL_HISTORY_KEYS.forEach(key => this.clearEntries(key));
        this.logger.info('Cleared all history');
    }

    /**
     * Removes a specific entry from search history
     * @internal Test utility - individual entry removal UI not implemented
     * @param pattern - The pattern to remove
     */
    removeSearchEntry(pattern: string): void {
        this.removeEntry('searchHistory', pattern);
    }

    /**
     * Removes a specific entry from replace history
     * @internal Test utility - individual entry removal UI not implemented
     * @param pattern - The pattern to remove
     */
    removeReplaceEntry(pattern: string): void {
        this.removeEntry('replaceHistory', pattern);
    }

    /**
     * Trims history arrays to match current max size setting
     * Called when max history size setting is changed
     */
    updateMaxSize(): void {
        const maxSize = this.getMaxSize();

        ALL_HISTORY_KEYS.forEach(key => {
            const history = this.plugin.settings[key];
            if (history.length > maxSize) {
                const removed = history.length - maxSize;
                history.splice(maxSize);
                this.logger.info(`Trimmed ${key} to ${maxSize} entries (removed ${removed})`);
            }
        });

        void this.plugin.saveSettings();
    }

}
