import { debounce } from 'obsidian';
import { Logger } from '../../utils';
import VaultFindReplacePlugin from '../../main';
import { FindReplaceElements, SearchOptions, ReplacementResult } from '../../types';
import { SearchEngine, ReplacementEngine } from '../../core';
import { ConfirmModal } from '../../modals';

/**
 * ActionHandler manages all event handling and replace operations
 * Extracted from FindReplaceView for better separation of concerns
 */
export class ActionHandler {
    private plugin: VaultFindReplacePlugin;
    private logger: Logger;
    private elements: FindReplaceElements;
    private searchEngine: SearchEngine;
    private replacementEngine: ReplacementEngine;
    private performSearchCallback: () => Promise<void>;
    private renderResultsCallback: () => void;
    private isSearching: boolean = false;
    private getResultsCallback?: () => any[];
    private getSelectedIndicesCallback?: () => Set<number>;
    private toggleExpandCollapseCallback?: () => void;

    constructor(
        plugin: VaultFindReplacePlugin,
        elements: FindReplaceElements,
        searchEngine: SearchEngine,
        replacementEngine: ReplacementEngine,
        performSearchCallback: () => Promise<void>,
        renderResultsCallback: () => void
    ) {
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'ActionHandler');
        this.elements = elements;
        this.searchEngine = searchEngine;
        this.replacementEngine = replacementEngine;
        this.performSearchCallback = performSearchCallback;
        this.renderResultsCallback = renderResultsCallback;
    }

    /**
     * Sets up all event handlers for the UI
     */
    setupEventHandlers(): void {
        this.setupReplaceInputHandler();
        this.setupToggleHandlers();
        this.setupClearButtonHandler();
        this.setupExpandCollapseHandler();
    }

    /**
     * Updates the isSearching state (called from SearchController)
     */
    setSearchingState(isSearching: boolean): void {
        this.isSearching = isSearching;
    }

    /**
     * Sets callbacks for accessing view state
     */
    setStateCallbacks(
        getResultsCallback: () => any[],
        getSelectedIndicesCallback: () => Set<number>
    ): void {
        this.getResultsCallback = getResultsCallback;
        this.getSelectedIndicesCallback = getSelectedIndicesCallback;
    }

    /**
     * Sets the expand/collapse callback
     */
    setExpandCollapseCallback(callback: () => void): void {
        this.toggleExpandCollapseCallback = callback;
    }

    /**
     * Sets up replace input change handler for preview updates
     */
    private setupReplaceInputHandler(): void {
        this.elements.replaceInput.addEventListener('input', () => {
            this.renderResultsCallback();
        });
    }

    /**
     * Sets up toggle button handlers with debouncing
     */
    private setupToggleHandlers(): void {
        const toggleButtons = [
            this.elements.matchCaseCheckbox,
            this.elements.wholeWordCheckbox,
            this.elements.regexCheckbox
        ];

        toggleButtons.forEach(toggleBtn => {
            if (toggleBtn) {
                const toggleName = toggleBtn.getAttribute('aria-label') || 'unknown';
                const debouncedToggleSearch = debounce(() => {
                    const query = this.elements.searchInput.value.trim();
                    this.logger.debug(`[Toggle:${toggleName}] Click triggered for query: "${query}"`);

                    // Check if search is already in progress
                    if (this.isSearching) {
                        this.logger.warn(`[Toggle:${toggleName}] Search in progress, option change may cause inconsistency`);
                    }

                    // Clear SearchEngine cache when options change to prevent stale regex
                    this.searchEngine.clearCache();
                    this.logger.debug(`[Toggle:${toggleName}] Cleared SearchEngine cache due to option change`);

                    // Only re-search if there's an active query
                    if (query.length > 0) {
                        this.logger.debug(`[Toggle:${toggleName}] Calling performSearch for: "${query}"`);
                        this.performSearchCallback();
                    } else {
                        this.logger.debug(`[Toggle:${toggleName}] No query, skipping search`);
                    }
                }, this.plugin.settings.searchDebounceDelay);

                this.logger.debug(`[Toggle:${toggleName}] Setting up click listener with debounce: ${this.plugin.settings.searchDebounceDelay}ms`);
                toggleBtn.addEventListener('click', debouncedToggleSearch);
            }
        });
    }

    /**
     * Sets up clear button handler
     */
    private setupClearButtonHandler(): void {
        this.elements.clearAllBtn.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.elements.replaceInput.value = '';

            // Reset toggle states to inactive
            const toggleButtons = [
                this.elements.matchCaseCheckbox,
                this.elements.wholeWordCheckbox,
                this.elements.regexCheckbox
            ];

            toggleButtons.forEach(btn => {
                if (btn) {
                    btn.setAttribute('aria-pressed', 'false');
                    btn.classList.remove('is-active');

                }
            });

            // Clear results and hide adaptive toolbar
            this.elements.resultsContainer.empty();
            this.elements.adaptiveToolbar.classList.add('hidden');

            // Focus search input
            this.elements.searchInput.focus();
        });
    }

    /**
     * Sets up expand/collapse all functionality
     */
    private setupExpandCollapseHandler(): void {
        this.elements.toolbarBtn.addEventListener('click', () => {
            this.logger.debug('Expand/collapse button clicked - delegating to UIRenderer');
            if (this.toggleExpandCollapseCallback) {
                this.toggleExpandCollapseCallback();
            } else {
                this.logger.warn('No expand/collapse callback set');
            }
        });
    }

    /**
     * Replace all selected matches
     */
    async replaceSelectedMatches(): Promise<void> {
        this.logger.debug('=== REPLACE SELECTED START ===');
        this.logger.debug('replaceSelectedMatches called');

        const replaceText = this.elements.replaceInput.value;
        const searchOptions = this.getSearchOptions();

        try {
            // Get selected indices from callback
            if (!this.getSelectedIndicesCallback) {
                this.logger.error('No selected indices callback set');
                return;
            }

            const selectedIndices = this.getSelectedIndicesCallback();
            if (selectedIndices.size === 0) {
                this.logger.warn('No matches selected for replacement');
                return;
            }

            // Confirm if replacing with empty string
            if (!replaceText) {
                const confirmed = await this.showReplaceConfirmation('Replace selected matches with empty content? This cannot be undone.');
                if (!confirmed) return;
            }

            this.logger.info(`Starting replace operation for ${selectedIndices.size} selected matches`);

            // Get current results from callback
            if (!this.getResultsCallback) {
                this.logger.error('No results callback set');
                return;
            }

            const currentResults = this.getResultsCallback();

            // Perform replacement using dispatchReplace
            const result = await this.replacementEngine.dispatchReplace(
                'selected',
                currentResults,
                selectedIndices,
                replaceText,
                searchOptions
            );

            this.logger.success(`Successfully replaced ${result.totalReplacements} matches in ${result.filesModified} files`);

            // Refresh search results to show updated content
            await this.performSearchCallback();

        } catch (error) {
            this.logger.error('Failed to replace selected matches', error, true);
        }
    }

    /**
     * Replace all matches in the entire vault
     */
    async replaceAllInVault(): Promise<void> {
        this.logger.debug('=== REPLACE ALL IN VAULT START ===');

        const query = this.elements.searchInput.value.trim();
        const replaceText = this.elements.replaceInput.value;
        const searchOptions = this.getSearchOptions();

        if (!query) {
            this.logger.warn('No search query provided for replace all');
            return;
        }

        // Show confirmation modal for replace all operation
        const confirmResult = await this.showReplaceAllConfirmation(query, replaceText);
        if (!confirmResult) {
            this.logger.debug('Replace all operation cancelled by user');
            return;
        }

        try {
            this.logger.info(`Starting replace all operation: "${query}" → "${replaceText}"`);

            // Get current results from callback
            if (!this.getResultsCallback) {
                this.logger.error('No results callback set');
                return;
            }

            const currentResults = this.getResultsCallback();
            const selectedIndices = new Set<number>(); // Empty for vault-wide replacement

            // Perform replacement using dispatchReplace
            const result = await this.replacementEngine.dispatchReplace(
                'vault',
                currentResults,
                selectedIndices,
                replaceText,
                searchOptions
            );

            this.logger.success(`Successfully replaced ${result.totalReplacements} matches across ${result.filesModified} files`);

            // Refresh search results to show updated content
            await this.performSearchCallback();

        } catch (error) {
            this.logger.error('Failed to replace all matches in vault', error, true);
        }
    }

    /**
     * Shows confirmation modal for replace all operation
     */
    private async showReplaceAllConfirmation(query: string, replaceText: string): Promise<boolean> {
        const message = replaceText === ''
            ? 'Replace all matches across the vault with an empty value? This action cannot be undone.'
            : 'Replace all matches across the vault? This action cannot be undone.';

        return this.showReplaceConfirmation(message);
    }

    /**
     * Shows a general confirmation modal for replace operations
     */
    private async showReplaceConfirmation(message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ConfirmModal(this.plugin.app, message);
            modal.open();

            // Wait for the modal to close using polling
            const checkInterval = setInterval(() => {
                if (!modal.isOpen) {
                    clearInterval(checkInterval);
                    resolve(modal.result);
                }
            }, 50);
        });
    }

    /**
     * Gets current search options from toggle buttons
     */
    private getSearchOptions(): SearchOptions {
        const matchCase = this.getToggleValue(this.elements.matchCaseCheckbox);
        const wholeWord = this.getToggleValue(this.elements.wholeWordCheckbox);
        const useRegex = this.getToggleValue(this.elements.regexCheckbox);

        return { matchCase, wholeWord, useRegex };
    }

    /**
     * Gets the current value of a toggle button
     */
    private getToggleValue(toggleBtn: HTMLElement): boolean {
        if (!toggleBtn) {
            return false;
        }
        return toggleBtn.getAttribute('aria-pressed') === 'true';
    }

    /**
     * Sets up keyboard shortcuts for replace operations
     */
    setupKeyboardShortcuts(): void {
        // Ctrl/Cmd + Enter: Replace all
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                if (document.activeElement?.closest('.find-replace-container')) {
                    event.preventDefault();
                    if (!this.elements.ellipsisMenuBtn.disabled) {
                        this.replaceAllInVault();
                    }
                }
            }
        });

        // Alt + Enter: Replace selected
        document.addEventListener('keydown', (event) => {
            if (event.altKey && event.key === 'Enter') {
                if (document.activeElement?.closest('.find-replace-container')) {
                    event.preventDefault();
                    if (!this.elements.ellipsisMenuBtn.disabled) {
                        this.replaceSelectedMatches();
                    }
                }
            }
        });
    }

    /**
     * Cleans up event listeners
     */
    cleanup(): void {
        // Remove global keyboard listeners
        document.removeEventListener('keydown', this.setupKeyboardShortcuts);
        this.logger.debug('ActionHandler cleanup completed');
    }
}