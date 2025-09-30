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
    private renderResultsCallback: (preserveSelection?: boolean) => void;
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
        renderResultsCallback: (preserveSelection?: boolean) => void
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
     * Initializes event listeners for replace input, toggle buttons, clear button, and expand/collapse.
     *
     * @remarks
     * This method must be called during view initialization to enable user interactions.
     * Calls multiple setup methods to organize event handler registration.
     */
    setupEventHandlers(): void {
        this.setupReplaceInputHandler();
        this.setupToggleHandlers();
        this.setupClearButtonHandler();
        this.setupExpandCollapseHandler();
    }

    /**
     * Updates the isSearching state (called from SearchController)
     * Used to coordinate state between SearchController and ActionHandler.
     *
     * @param {boolean} isSearching - True if search is in progress, false otherwise
     */
    setSearchingState(isSearching: boolean): void {
        this.isSearching = isSearching;
    }

    /**
     * Sets callbacks for accessing view state
     * Required for replace operations to access current search results and selections.
     *
     * @param {function} getResultsCallback - Function that returns current search results array
     * @param {function} getSelectedIndicesCallback - Function that returns Set of selected result indices
     *
     * @remarks
     * Must be called before any replace operations to ensure state access is available.
     */
    setStateCallbacks(
        getResultsCallback: () => any[],
        getSelectedIndicesCallback: () => Set<number>
    ): void {
        this.getResultsCallback = getResultsCallback;
        this.getSelectedIndicesCallback = getSelectedIndicesCallback;
    }

    /**
     * Sets the expand/collapse callback for toolbar button
     * Enables the expand/collapse all button functionality.
     *
     * @param {function} callback - Function to call when expand/collapse button is clicked
     */
    setExpandCollapseCallback(callback: () => void): void {
        this.toggleExpandCollapseCallback = callback;
    }

    /**
     * Sets up replace input change handler for preview updates
     * Preserves selections when replace text changes to improve UX
     */
    private setupReplaceInputHandler(): void {
        this.elements.replaceInput.addEventListener('input', () => {
            this.renderResultsCallback(true); // Preserve selections for replace text changes
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
     * Replace all currently selected matches
     * Replaces only the matches that user has selected via multi-selection.
     *
     * @returns {Promise<void>} Resolves when replacement operation completes
     *
     * @remarks
     * **Prerequisites:**
     * - getSelectedIndicesCallback must be set via setStateCallbacks()
     * - getResultsCallback must be set via setStateCallbacks()
     *
     * **Behavior:**
     * - Shows confirmation if replacing with empty string
     * - Adds replace text to history on success
     * - Triggers search refresh to update UI
     * - Logs detailed operation progress
     *
     * **Error Handling:**
     * - Returns early if no matches selected
     * - Shows user notification on failure
     * - Logs errors with full context
     *
     * @throws Will log error and show user notification on replacement failure
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

            // Add replace text to history after successful replacement
            this.plugin.historyManager.addReplace(replaceText);

            // Refresh search results to show updated content
            await this.performSearchCallback();

        } catch (error) {
            this.logger.error('Failed to replace selected matches', error, true);
        }
    }

    /**
     * Replace all matches across the entire vault
     * Destructive operation that replaces every match found in all search results.
     *
     * @returns {Promise<void>} Resolves when replacement operation completes
     *
     * @remarks
     * **Prerequisites:**
     * - getResultsCallback must be set via setStateCallbacks()
     * - Search query must exist in search input
     *
     * **Safety Features:**
     * - Shows confirmation modal if confirmDestructiveActions setting enabled
     * - Different message for empty replacement (deletion)
     * - User can cancel operation
     *
     * **Behavior:**
     * - Replaces ALL matches in current search results
     * - Adds replace text to history on success
     * - Triggers search refresh to update UI
     * - Shows success notification with counts
     *
     * **Error Handling:**
     * - Returns early if no search query
     * - Returns if user cancels confirmation
     * - Shows user notification on failure
     * - Logs errors with full context
     *
     * @throws Will log error and show user notification on replacement failure
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

        // Show confirmation modal for replace all operation (if enabled in settings)
        if (this.plugin.settings.confirmDestructiveActions) {
            const confirmResult = await this.showReplaceAllConfirmation(query, replaceText);
            if (!confirmResult) {
                this.logger.debug('Replace all operation cancelled by user');
                return;
            }
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

            // Add replace text to history after successful replacement
            this.plugin.historyManager.addReplace(replaceText);

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
        const multiline = this.getToggleValue(this.elements.multilineCheckbox) || false;

        return { matchCase, wholeWord, useRegex, multiline };
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
     * Registers document-level keyboard event listeners for global shortcuts.
     *
     * @remarks
     * **Registered Shortcuts:**
     * - Ctrl/Cmd + Enter: Replace All in Vault (when focus is within plugin container)
     *
     * **Scope:**
     * - Event listener attached to document for global access
     * - Only triggers when activeElement is within `.find-replace-container`
     * - Prevents default browser behavior for registered shortcuts
     *
     * **Important:**
     * - Must call corresponding cleanup method when view is destroyed
     * - Event listener persists until explicitly removed
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