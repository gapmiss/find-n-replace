import { ItemView } from 'obsidian';
import { Logger } from '../../utils';
import VaultFindReplacePlugin from '../../main';
import { FindReplaceElements, SearchOptions, SearchResult, SessionFilters } from '../../types';
import { SearchEngine, ReplacementEngine } from '../../core';
import { ConfirmModal } from '../../modals';

/**
 * ActionHandler manages all event handling and replace operations
 * Extracted from FindReplaceView for better separation of concerns
 */
export class ActionHandler {
    private plugin: VaultFindReplacePlugin;
    private view: ItemView;
    private logger: Logger;
    private elements: FindReplaceElements;
    private searchEngine: SearchEngine;
    private replacementEngine: ReplacementEngine;
    private performSearchCallback: () => Promise<void>;
    private renderResultsCallback: (preserveSelection?: boolean) => void;
    private getResultsCallback?: () => SearchResult[];
    private getSelectedIndicesCallback?: () => Set<number>;
    private getSessionFiltersCallback?: () => SessionFilters;
    private getTotalResultsCallback?: () => { count: number; isLimited: boolean };
    private toggleExpandCollapseCallback?: () => void;
    private suspendFileEventsCallback?: (suspend: boolean) => void;

    // Store keyboard event handlers for proper cleanup
    private replaceAllKeyHandler: (event: KeyboardEvent) => void;
    private replaceSelectedKeyHandler: (event: KeyboardEvent) => void;

    constructor(
        plugin: VaultFindReplacePlugin,
        view: ItemView,
        elements: FindReplaceElements,
        searchEngine: SearchEngine,
        replacementEngine: ReplacementEngine,
        performSearchCallback: () => Promise<void>,
        renderResultsCallback: (preserveSelection?: boolean) => void
    ) {
        this.plugin = plugin;
        this.view = view;
        this.logger = Logger.create(plugin, 'ActionHandler');
        this.elements = elements;
        this.searchEngine = searchEngine;
        this.replacementEngine = replacementEngine;
        this.performSearchCallback = performSearchCallback;
        this.renderResultsCallback = renderResultsCallback;

        // Initialize keyboard handlers with proper this binding
        this.replaceAllKeyHandler = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                if (activeDocument.activeElement?.closest('.find-replace-container')) {
                    event.preventDefault();
                    if (!this.elements.ellipsisMenuBtn.disabled) {
                        void this.replaceAllInVault();
                    }
                }
            }
        };

        this.replaceSelectedKeyHandler = (event: KeyboardEvent) => {
            if (event.altKey && event.key === 'Enter') {
                if (activeDocument.activeElement?.closest('.find-replace-container')) {
                    event.preventDefault();
                    if (!this.elements.ellipsisMenuBtn.disabled) {
                        void this.replaceSelectedMatches();
                    }
                }
            }
        };
    }

    /**
     * Sets up all event handlers for the UI
     * Initializes event listeners for replace input, clear button, and expand/collapse.
     * Note: Toggle handlers are managed by SearchToolbar to avoid double-firing searches.
     *
     * @remarks
     * This method must be called during view initialization to enable user interactions.
     * Calls multiple setup methods to organize event handler registration.
     */
    setupEventHandlers(): void {
        this.setupReplaceInputHandler();
        this.setupClearButtonHandler();
        this.setupExpandCollapseHandler();
    }

    /**
     * Sets callbacks for accessing view state
     * Required for replace operations to access current search results and selections.
     *
     * @param {function} getResultsCallback - Function that returns current search results array
     * @param {function} getSelectedIndicesCallback - Function that returns Set of selected result indices
     * @param {function} getSessionFiltersCallback - Function that returns current session filters
     *
     * @remarks
     * Must be called before any replace operations to ensure state access is available.
     */
    setStateCallbacks(
        getResultsCallback: () => SearchResult[],
        getSelectedIndicesCallback: () => Set<number>,
        getSessionFiltersCallback: () => SessionFilters,
        getTotalResultsCallback: () => { count: number; isLimited: boolean }
    ): void {
        this.getResultsCallback = getResultsCallback;
        this.getSelectedIndicesCallback = getSelectedIndicesCallback;
        this.getSessionFiltersCallback = getSessionFiltersCallback;
        this.getTotalResultsCallback = getTotalResultsCallback;
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
     * Sets callback to suspend/resume file modification events during bulk operations
     */
    setSuspendFileEventsCallback(callback: (suspend: boolean) => void): void {
        this.suspendFileEventsCallback = callback;
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
     * Sets up clear button handler
     */
    private setupClearButtonHandler(): void {
        this.elements.clearAllBtn.addEventListener('click', () => {
            void (async () => {
            this.elements.searchInput.value = '';
            this.elements.replaceInput.value = '';

            // Dispatch input events to update clear icon visibility
            this.elements.searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            this.elements.replaceInput.dispatchEvent(new Event('input', { bubbles: true }));

            // Reset toggle states to inactive
            const toggleButtons = [
                this.elements.matchCaseCheckbox,
                this.elements.wholeWordCheckbox,
				this.elements.regexCheckbox,
                this.elements.multilineCheckbox
            ];

            toggleButtons.forEach(btn => {
                if (btn) {
                    btn.setAttribute('aria-pressed', 'false');
                    btn.classList.remove('is-active');
                }
            });

            // Save to settings if "Remember Search Options" is enabled
            if (this.plugin.settings.rememberSearchOptions) {
                this.plugin.settings.lastSearchOptions.matchCase = false;
                this.plugin.settings.lastSearchOptions.wholeWord = false;
                this.plugin.settings.lastSearchOptions.useRegex = false;
                this.plugin.settings.lastSearchOptions.multiline = false;
                await this.plugin.saveSettings();
            }

            // Clear results and hide adaptive toolbar
            this.elements.resultsContainer.empty();
            this.elements.adaptiveToolbar.classList.add('hidden');

            // Focus search input
            this.elements.searchInput.focus();
            })();
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

        // Suspend file events during replacement to avoid redundant searches
        this.suspendFileEventsCallback?.(true);

        try {
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
            if (this.plugin.settings.enableSearchHistory) {
                this.plugin.historyManager.addReplace(replaceText);
            }

            // Refresh search results to show updated content
            await this.performSearchCallback();

        } catch (error) {
            this.logger.error('Failed to replace selected matches', error, true);
        } finally {
            // Always resume file events
            this.suspendFileEventsCallback?.(false);
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

        // Get session filters for search
        if (!this.getSessionFiltersCallback) {
            this.logger.error('No session filters callback set');
            return;
        }
        const sessionFilters = this.getSessionFiltersCallback();

        // Use existing search results count for immediate modal display
        const displayedResults = this.getResultsCallback?.() ?? [];
        const totalInfo = this.getTotalResultsCallback?.();

        if (displayedResults.length === 0 && (!totalInfo || totalInfo.count === 0)) {
            this.logger.warn('No matches found for replace all');
            return;
        }

        // Show confirmation modal FIRST using existing counts (instant)
        if (this.plugin.settings.confirmDestructiveActions) {
            const matchCount = totalInfo?.count ?? displayedResults.length;
            const uniqueFiles = new Set(displayedResults.map(r => r.file.path));
            const estimatedFileCount = uniqueFiles.size;
            const isEstimate = totalInfo?.isLimited ?? false;

            const confirmResult = await this.showReplaceAllConfirmation(
                matchCount,
                estimatedFileCount,
                replaceText,
                isEstimate
            );
            if (!confirmResult) {
                this.logger.debug('Replace all operation cancelled by user');
                return;
            }
        }

        // Suspend file events during bulk replacement to avoid redundant searches
        this.suspendFileEventsCallback?.(true);

        try {
            // Run unlimited search AFTER confirmation to get ALL matches
            this.logger.debug('Running unlimited search for Replace All');
            const allResults = await this.searchEngine.performSearch(query, searchOptions, sessionFilters);
            this.logger.debug(`Unlimited search found ${allResults.length} total matches`);

            if (allResults.length === 0) {
                this.logger.warn('No matches found for replace all after confirmation');
                return;
            }

            this.logger.info(`Starting replace all operation: "${query}" → "${replaceText}" (${allResults.length} matches)`);

            const selectedIndices = new Set<number>(); // Empty for vault-wide replacement

            // Perform replacement on ALL results (not limited)
            const result = await this.replacementEngine.dispatchReplace(
                'vault',
                allResults,
                selectedIndices,
                replaceText,
                searchOptions
            );

            this.logger.success(`Successfully replaced ${result.totalReplacements} matches across ${result.filesModified} files`);

            // Add replace text to history after successful replacement
            if (this.plugin.settings.enableSearchHistory) {
                this.plugin.historyManager.addReplace(replaceText);
            }

            // Refresh search results to show updated content
            await this.performSearchCallback();

        } catch (error) {
            this.logger.error('Failed to replace all matches in vault', error, true);
        } finally {
            // Always resume file events
            this.suspendFileEventsCallback?.(false);
        }
    }

    /**
     * Shows confirmation modal for replace all operation with counts
     */
    private async showReplaceAllConfirmation(
        matchCount: number,
        fileCount: number,
        replaceText: string,
        isEstimate: boolean = false
    ): Promise<boolean> {
        const countPrefix = isEstimate ? 'at least ' : '';
        const matchText = matchCount === 1 ? '1 match' : `${matchCount.toLocaleString()} matches`;
        const fileText = fileCount === 1 ? '1 file' : `${fileCount} files`;

        const message = replaceText === ''
            ? `Delete ${countPrefix}${matchText} across ${fileText}? This action cannot be undone.`
            : `Replace ${countPrefix}${matchText} across ${fileText}? This action cannot be undone.`;

        return this.showReplaceConfirmation(message);
    }

    /**
     * Shows a general confirmation modal for replace operations
     */
    private async showReplaceConfirmation(message: string): Promise<boolean> {
        const modal = new ConfirmModal(this.plugin.app, message);
        return modal.openAndConfirm();
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
        // Use Obsidian's registerDomEvent for automatic cleanup on view unload
        // This also ensures the same document is used for both setup and teardown,
        // preventing listener leaks when view moves between popout windows
        const doc = this.elements.containerEl.ownerDocument;

        // Ctrl/Cmd + Enter: Replace all
        this.view.registerDomEvent(doc, 'keydown', this.replaceAllKeyHandler);

        // Alt + Enter: Replace selected
        this.view.registerDomEvent(doc, 'keydown', this.replaceSelectedKeyHandler);
    }

    /**
     * Cleans up event listeners
     * Note: Keyboard shortcuts registered via view.registerDomEvent are automatically
     * cleaned up when the view is unloaded, so no manual removal needed for those.
     */
    cleanup(): void {
        this.logger.debug('ActionHandler cleanup completed');
    }
}
