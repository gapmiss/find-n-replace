import { Logger } from '../utils';
import VaultFindReplacePlugin from '../main';

/**
 * Manages search and replace history with LRU caching
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
     * Adds a search pattern to history
     * Implements LRU: moves existing entry to front, deduplicates consecutive entries
     * @param pattern - The search pattern to add
     */
    addSearch(pattern: string): void {
        if (!this.isHistoryEnabled()) {
            this.logger.debug('History is disabled, skipping save');
            return;
        }

        if (!pattern || pattern.trim() === '') {
            this.logger.debug('Skipping empty search pattern');
            return;
        }

        const trimmed = pattern.trim();
        const history = this.plugin.settings.searchHistory;

        // Don't add if identical to most recent entry (deduplication)
        if (history.length > 0 && history[0] === trimmed) {
            this.logger.debug('Skipping duplicate search pattern:', trimmed);
            return;
        }

        // Remove existing occurrence (LRU: move to front)
        const existingIndex = history.indexOf(trimmed);
        if (existingIndex > 0) {
            history.splice(existingIndex, 1);
            this.logger.debug('Moved existing search pattern to front:', trimmed);
        }

        // Add to front
        history.unshift(trimmed);

        // Enforce max size
        const maxSize = this.getMaxSize();
        if (history.length > maxSize) {
            const removed = history.splice(maxSize);
            this.logger.debug(`Trimmed search history: removed ${removed.length} old entries`);
        }

        // Persist to settings
        this.plugin.saveSettings();
        this.logger.debug('Added search to history:', trimmed, `(total: ${history.length})`);
    }

    /**
     * Adds a replace pattern to history
     * Implements LRU: moves existing entry to front, deduplicates consecutive entries
     * @param pattern - The replace pattern to add
     */
    addReplace(pattern: string): void {
        if (!this.isHistoryEnabled()) {
            this.logger.debug('History is disabled, skipping save');
            return;
        }

        // Allow empty strings for replace (common use case: delete matches)
        if (pattern === null || pattern === undefined) {
            this.logger.debug('Skipping null/undefined replace pattern');
            return;
        }

        const history = this.plugin.settings.replaceHistory;

        // Don't add if identical to most recent entry (deduplication)
        if (history.length > 0 && history[0] === pattern) {
            this.logger.debug('Skipping duplicate replace pattern:', pattern);
            return;
        }

        // Remove existing occurrence (LRU: move to front)
        const existingIndex = history.indexOf(pattern);
        if (existingIndex > 0) {
            history.splice(existingIndex, 1);
            this.logger.debug('Moved existing replace pattern to front:', pattern);
        }

        // Add to front
        history.unshift(pattern);

        // Enforce max size
        const maxSize = this.getMaxSize();
        if (history.length > maxSize) {
            const removed = history.splice(maxSize);
            this.logger.debug(`Trimmed replace history: removed ${removed.length} old entries`);
        }

        // Persist to settings
        this.plugin.saveSettings();
        this.logger.debug('Added replace to history:', pattern, `(total: ${history.length})`);
    }

    /**
     * Gets the search history (newest first)
     * @returns Array of search patterns
     */
    getSearchHistory(): string[] {
        return [...this.plugin.settings.searchHistory];
    }

    /**
     * Gets the replace history (newest first)
     * @returns Array of replace patterns
     */
    getReplaceHistory(): string[] {
        return [...this.plugin.settings.replaceHistory];
    }

    /**
     * Clears all search history
     */
    clearSearchHistory(): void {
        this.plugin.settings.searchHistory = [];
        this.plugin.saveSettings();
        this.logger.info('Cleared search history');
    }

    /**
     * Clears all replace history
     */
    clearReplaceHistory(): void {
        this.plugin.settings.replaceHistory = [];
        this.plugin.saveSettings();
        this.logger.info('Cleared replace history');
    }

    /**
     * Clears all history (search and replace)
     */
    clearAllHistory(): void {
        this.clearSearchHistory();
        this.clearReplaceHistory();
        this.logger.info('Cleared all history');
    }

    /**
     * Removes a specific entry from search history
     * @internal Test utility - individual entry removal UI not implemented
     * @param pattern - The pattern to remove
     */
    removeSearchEntry(pattern: string): void {
        const history = this.plugin.settings.searchHistory;
        const index = history.indexOf(pattern);
        if (index !== -1) {
            history.splice(index, 1);
            this.plugin.saveSettings();
            this.logger.debug('Removed search entry:', pattern);
        }
    }

    /**
     * Removes a specific entry from replace history
     * @internal Test utility - individual entry removal UI not implemented
     * @param pattern - The pattern to remove
     */
    removeReplaceEntry(pattern: string): void {
        const history = this.plugin.settings.replaceHistory;
        const index = history.indexOf(pattern);
        if (index !== -1) {
            history.splice(index, 1);
            this.plugin.saveSettings();
            this.logger.debug('Removed replace entry:', pattern);
        }
    }

    /**
     * Trims history arrays to match current max size setting
     * Called when max history size setting is changed
     */
    updateMaxSize(): void {
        const maxSize = this.getMaxSize();

        // Trim search history if needed
        if (this.plugin.settings.searchHistory.length > maxSize) {
            const removed = this.plugin.settings.searchHistory.length - maxSize;
            this.plugin.settings.searchHistory.splice(maxSize);
            this.logger.info(`Trimmed search history to ${maxSize} entries (removed ${removed})`);
        }

        // Trim replace history if needed
        if (this.plugin.settings.replaceHistory.length > maxSize) {
            const removed = this.plugin.settings.replaceHistory.length - maxSize;
            this.plugin.settings.replaceHistory.splice(maxSize);
            this.logger.info(`Trimmed replace history to ${maxSize} entries (removed ${removed})`);
        }

        this.plugin.saveSettings();
    }

}