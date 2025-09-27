import { debounce } from 'obsidian';
import { Logger } from '../../utils';
import VaultFindReplacePlugin from '../../main';
import { FindReplaceElements, SearchOptions, ViewState, SessionFilters } from '../../types';
import { SearchEngine } from '../../core';

/**
 * SearchController manages all search operations and state
 * Extracted from FindReplaceView for better separation of concerns
 */
export class SearchController {
    private plugin: VaultFindReplacePlugin;
    private logger: Logger;
    private elements: FindReplaceElements;
    private searchEngine: SearchEngine;
    private state: ViewState;
    private renderResultsCallback: (searchOptions: SearchOptions) => void;
    private clearResultsCallback: () => void;
    private getSessionFiltersCallback: () => SessionFilters;

    // Search state management
    private currentSearchController: AbortController | null = null;
    private isSearching: boolean = false;

    constructor(
        plugin: VaultFindReplacePlugin,
        elements: FindReplaceElements,
        searchEngine: SearchEngine,
        state: ViewState,
        renderResultsCallback: (searchOptions: SearchOptions) => void,
        clearResultsCallback: () => void,
        getSessionFiltersCallback: () => SessionFilters
    ) {
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'SearchController');
        this.elements = elements;
        this.searchEngine = searchEngine;
        this.state = state;
        this.renderResultsCallback = renderResultsCallback;
        this.clearResultsCallback = clearResultsCallback;
        this.getSessionFiltersCallback = getSessionFiltersCallback;
    }

    /**
     * Gets the current searching state
     */
    getSearchingState(): boolean {
        return this.isSearching;
    }

    /**
     * Sets up basic navigation with Enter key search functionality
     */
    setupBasicNavigation(): void {
        // Set up Enter key handlers for inputs
        const elements = [
            this.elements.searchInput,
            this.elements.replaceInput,
        ];

        // Add Enter key search for input elements
        elements.forEach(el => {
            el.addEventListener('keydown', async (evt) => {
                if (evt.key === 'Enter') {
                    try {
                        await this.performSearch();
                    } catch (error) {
                        this.logger.error('Search on Enter key error', error, true);
                    }
                }
            });
        });

        // Add Enter/Space key support for toggle buttons
        const toggleButtons = [
            this.elements.matchCaseCheckbox,
            this.elements.wholeWordCheckbox,
            this.elements.regexCheckbox,
            this.elements.multilineCheckbox
        ];

        toggleButtons.forEach(btn => {
            btn.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter' || evt.key === ' ') {
                    evt.preventDefault();
                    btn.click(); // Trigger the toggle
                }
            });
        });
    }

    /**
     * Sets up auto-search with proper debouncing
     */
    setupAutoSearch(): void {
        const debouncedSearch = debounce(async () => {
            const query = this.elements.searchInput.value.trim();
            this.logger.debug(`[AutoSearch] Debounced search triggered for query: "${query}"`);

            // Only auto-search if there's actual content
            if (query.length > 0) {
                this.logger.debug(`[AutoSearch] Calling performSearch for: "${query}"`);
                await this.performSearch();
            } else {
                this.logger.debug(`[AutoSearch] Empty query, clearing results`);
                // Clear results if search is empty
                this.clearResultsCallback();
                this.state.results = [];
            }
        }, this.plugin.settings.searchDebounceDelay);

        this.logger.debug(`[AutoSearch] Setting up input listener with debounce: ${this.plugin.settings.searchDebounceDelay}ms`);
        this.elements.searchInput.addEventListener("input", debouncedSearch);
    }

    /**
     * Main search function - handles all search logic and state management
     */
    async performSearch(): Promise<void> {
        const callId = Date.now().toString();
        this.logger.debug(`[${callId}] ===== SEARCH START =====`);

        // FORCE CANCEL ANY RUNNING SEARCH IMMEDIATELY
        if (this.currentSearchController) {
            this.logger.debug(`[${callId}] FORCE CANCELLING previous search controller`);
            this.currentSearchController.abort();
        }

        // Create new controller for this search
        this.currentSearchController = new AbortController();

        // FORCE CLEAR SearchEngine cache to prevent stale state
        this.searchEngine.clearCache();
        this.logger.debug(`[${callId}] Cleared SearchEngine cache`);

        // WAIT for any previous search to fully complete before starting new one
        if (this.isSearching) {
            this.logger.error(`[${callId}] CONCURRENT SEARCH DETECTED! Waiting for completion...`);
            let waitCount = 0;
            while (this.isSearching && waitCount < 100) { // Max 1000ms wait
                await new Promise(resolve => setTimeout(resolve, 10));
                waitCount++;
            }
            if (this.isSearching) {
                this.logger.error(`[${callId}] Previous search FAILED to complete, FORCE RESETTING`);
                this.isSearching = false;
            }
        }

        // NOW we can safely start the new search
        this.currentSearchController = new AbortController();
        const searchId = callId;
        const timerName = `performSearch-${searchId}`;
        this.isSearching = true;

        this.logger.debug(`[${searchId}] Search lock acquired, starting execution`);
        this.logger.time(timerName);

        try {
            const query = this.elements.searchInput?.value;
            this.logger.debug(`[${searchId}] Query: "${query}"`);

            // Read search options ONCE at the start and FREEZE them for entire search
            // This PREVENTS race conditions from option changes during search
            const searchOptions = this.readSearchOptionsOnce();
            this.logger.debug(`[${searchId}] Search options FROZEN:`, searchOptions);

            if (!query || query.trim().length === 0) {
                this.logger.debug(`[${searchId}] Empty query, clearing results`);
                this.clearResultsCallback();
                this.state.results = [];
                return;
            }

            // Check if search was cancelled
            if (this.currentSearchController.signal.aborted) {
                this.logger.debug(`[${searchId}] Search cancelled before starting`);
                return;
            }

            // Validate regex if regex mode is enabled (ONLY validation here, not in SearchEngine)
            if (searchOptions.useRegex) {
                try {
                    new RegExp(query.trim());
                    this.logger.debug(`[${searchId}] Regex validation passed`);
                } catch (regexError) {
                    this.logger.error(`[${searchId}] Invalid regex pattern`, regexError, true);
                    return;
                }
            }

            // Check if search was cancelled before performing search
            if (this.currentSearchController.signal.aborted) {
                this.logger.debug(`[${searchId}] Search cancelled before execution`);
                return;
            }

            this.logger.debug(`[${searchId}] Starting SearchEngine.performSearch`);
            // Get session filters for this search
            const sessionFilters = this.getSessionFiltersCallback();
            // Perform the actual search with session filters
            const results = await this.searchEngine.performSearch(query, searchOptions, sessionFilters);
            this.logger.debug(`[${searchId}] SearchEngine.performSearch completed: ${results.length} results`);

            // Check if search was cancelled after completion
            if (this.currentSearchController.signal.aborted) {
                this.logger.debug(`[${searchId}] Search cancelled after completion, not updating UI`);
                return;
            }

            this.logger.info(`[${searchId}] Search completed: found ${results.length} results for "${query}"`);

            // Apply consistent result limiting based on settings
            const maxResults = this.plugin.settings.maxResults;
            let finalResults = results;
            let isLimited = false;

            if (results.length > maxResults) {
                finalResults = results.slice(0, maxResults);
                isLimited = true;
                this.logger.info(`Results limited to ${maxResults} of ${results.length} total results`);
            }

            // Update state and render results using FROZEN search options
            this.state.results = finalResults;
            this.state.totalResults = results.length; // Store total for UI feedback
            this.state.isLimited = isLimited;
            this.renderResultsCallback(searchOptions);

            this.logger.timeEnd(timerName);
            this.logger.debug(`[${searchId}] ===== SEARCH COMPLETED SUCCESSFULLY =====`);

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                this.logger.warn(`[${searchId}] Search was CANCELLED (AbortError)`);
            } else {
                this.logger.error(`[${searchId}] Search operation FAILED`, error, true);
            }
            // Safe timeEnd - only call if timer exists
            try {
                this.logger.timeEnd(timerName);
            } catch (timerError) {
                // Timer may not exist if error occurred early
                this.logger.debug('Timer cleanup failed (expected in some cases)');
            }
        } finally {
            // CRITICAL: Always reset the search state
            this.isSearching = false;
            this.currentSearchController = null;
            this.logger.debug(`[${searchId}] ===== SEARCH LOCK RELEASED =====`);
        }
    }

    /**
     * Reads search options ONCE for freezing during search execution
     * This method should only be called at the START of a search
     */
    private readSearchOptionsOnce(): { matchCase: boolean; wholeWord: boolean; useRegex: boolean; multiline: boolean } {
        const matchCase = this.getToggleValue(this.elements.matchCaseCheckbox);
        const wholeWord = this.getToggleValue(this.elements.wholeWordCheckbox);
        const useRegex = this.getToggleValue(this.elements.regexCheckbox);
        const multiline = this.getToggleValue(this.elements.multilineCheckbox) || false;

        const optionsSnapshot = { matchCase, wholeWord, useRegex, multiline };

        this.logger.debug('readSearchOptionsOnce() creating frozen snapshot:', {
            matchCase: { value: matchCase, pressed: this.elements.matchCaseCheckbox?.getAttribute('aria-pressed') },
            wholeWord: { value: wholeWord, pressed: this.elements.wholeWordCheckbox?.getAttribute('aria-pressed') },
            useRegex: { value: useRegex, pressed: this.elements.regexCheckbox?.getAttribute('aria-pressed') },
            multiline: { value: multiline, pressed: this.elements.multilineCheckbox?.getAttribute('aria-pressed') },
            snapshot: optionsSnapshot
        });

        return optionsSnapshot;
    }

    /**
     * Gets current search options (for non-search operations)
     */
    getSearchOptions(): { matchCase: boolean; wholeWord: boolean; useRegex: boolean; multiline: boolean } {
        const matchCase = this.getToggleValue(this.elements.matchCaseCheckbox);
        const wholeWord = this.getToggleValue(this.elements.wholeWordCheckbox);
        const useRegex = this.getToggleValue(this.elements.regexCheckbox);
        const multiline = this.getToggleValue(this.elements.multilineCheckbox) || false;

        const optionsSnapshot = { matchCase, wholeWord, useRegex, multiline };

        // If search is in progress, warn about option state changes
        if (this.isSearching) {
            this.logger.error('RACE CONDITION: Search options read while search is in progress!');
        }

        return optionsSnapshot;
    }

    /**
     * Safely gets toggle button value from aria-pressed attribute
     */
    private getToggleValue(toggleBtn: HTMLElement): boolean {
        if (!toggleBtn) {
            return false;
        }
        return toggleBtn.getAttribute('aria-pressed') === 'true';
    }

    /**
     * Validates search input and provides visual feedback
     */
    validateSearchInput(query: string, useRegex: boolean): boolean {
        const input = this.elements.searchInput;

        // Remove any existing validation classes
        input.classList.remove('invalid-regex', 'empty-search');

        if (!query.trim()) {
            input.classList.add('empty-search');
            return false;
        }

        if (useRegex) {
            try {
                new RegExp(query);
                return true;
            } catch {
                input.classList.add('invalid-regex');
                return false;
            }
        }

        return true;
    }

    /**
     * Cancels any ongoing search operation
     */
    cancelSearch(): void {
        if (this.currentSearchController) {
            this.currentSearchController.abort();
            this.currentSearchController = null;
        }
        this.isSearching = false;
    }

    /**
     * Cleanup method - cancels searches and clears state
     */
    cleanup(): void {
        this.cancelSearch();
        this.logger.debug('SearchController cleanup completed');
    }
}