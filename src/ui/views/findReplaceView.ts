import { ItemView, WorkspaceLeaf, TFile, type App} from 'obsidian';
import { ConfirmModal } from "../../modals";
import VaultFindReplacePlugin from "../../main";
import { SearchResult, FindReplaceElements, SearchOptions, ViewState, AffectedResults } from '../../types';
import { SearchEngine, ReplacementEngine, FileOperations } from '../../core';
import { UIRenderer, SelectionManager, SearchController } from '../components';
import { SearchToolbar } from '../components/searchToolbar';
import { ActionHandler } from '../components/actionHandler';
import { Logger, FOCUS_DELAY } from '../../utils';

// Define the unique identifier for this view type - used by Obsidian to track and manage this view
export const VIEW_TYPE_FIND_REPLACE = 'find-replace-view';

/**
 * Main view class that extends Obsidian's ItemView
 * This creates the Find & Replace panel UI and coordinates all functionality through specialized components
 */
export class FindReplaceView extends ItemView {
    // Component instances
    private searchEngine: SearchEngine;
    private replacementEngine!: ReplacementEngine;
    private uiRenderer!: UIRenderer;
    private selectionManager!: SelectionManager;
    private fileOperations: FileOperations;
    private searchToolbar!: SearchToolbar;
    private actionHandler!: ActionHandler;
    private searchController!: SearchController;

    // UI Element references
    private elements!: FindReplaceElements;

    // State management
    private state: ViewState;

    // Flag to suspend file events during bulk operations
    private suspendFileEvents: boolean = false;

    // Plugin reference
    plugin: VaultFindReplacePlugin;

    // Logger instance
    private logger: Logger;

    // Search state management is now handled by SearchController

    /**
     * Constructor - initializes the view with required Obsidian components
     * @param leaf - The workspace leaf this view will be attached to
     * @param app - The main Obsidian app instance
     * @param plugin - Reference to the main plugin for accessing settings/methods
     */
    constructor(leaf: WorkspaceLeaf, app: App, plugin: VaultFindReplacePlugin) {
        super(leaf);
        this.plugin = plugin;

        // Initialize logger
        this.logger = Logger.create(plugin, 'FindReplaceView');

        // Initialize state
        this.state = {
            isCollapsed: false,
            selectedIndices: new Set(),
            results: [],
            lineElements: [],
            isWordWrapEnabled: false
        };

        // Initialize components
        this.searchEngine = new SearchEngine(app, plugin);
        this.fileOperations = new FileOperations(app, plugin);
    }

    // Required Obsidian ItemView methods - these define how the view appears in the interface
    getViewType(): string { return VIEW_TYPE_FIND_REPLACE; }    // Returns the unique view type identifier
    getDisplayText(): string { return 'Find-n-Replace'; } // Text shown in tabs and menus
    getIcon(): string { return 'replace'; }                 // Icon shown in tabs (Lucide icon name)

    /**
     * Called when the view is opened - sets up the entire UI structure
     * This is where all DOM elements are created and event listeners are attached
     */
    async onOpen(): Promise<void> {
        // Clear any existing content and add our main CSS class
        this.containerEl.empty();
        this.containerEl.addClass('find-replace-container');
        this.state.isCollapsed = true; // Start with results collapsed for better UX

        // Initialize SearchToolbar (selectionManager will be set after elements are created)
        this.searchToolbar = new SearchToolbar(
            this.plugin,
            () => this.replaceSelectedMatches(),
            () => this.replaceAllInVault(),
            async () => { // Add search callback for filter changes
                if (this.searchController) {
                    await this.searchController.performSearch();
                }
            }
        );

        // Create main toolbar container using SearchToolbar
        const searchToolbar = this.searchToolbar.createMainToolbar(this.containerEl);

        // Create search input row using SearchToolbar
        const searchElements = this.searchToolbar.createSearchInputRow(searchToolbar);

        // Create replace input row using SearchToolbar
        const replaceElements = this.searchToolbar.createReplaceInputRow(searchToolbar);

        // === FILTER PANEL ===
        // Create expandable filter panel using SearchToolbar
        const filterElements = this.searchToolbar.createFilterPanel(searchToolbar);

        // === RESULTS CONTAINER ===
        // Container where all search results will be displayed
        const resultsContainer = this.searchToolbar.createResultsContainer(this.containerEl);

        // === ADAPTIVE RESULTS TOOLBAR ===
        // Create adaptive toolbar using SearchToolbar
        const adaptiveElements = this.searchToolbar.createAdaptiveToolbar(searchToolbar);

        // Set up expand/collapse button navigation using SearchToolbar
        this.searchToolbar.setupExpandCollapseNavigation(adaptiveElements.toolbarBtn, resultsContainer);

        // Set up filter button toggle
        this.searchToolbar.setupFilterToggle(replaceElements.filterBtn, filterElements.filterPanel, filterElements.includeInput, filterElements.excludeInput);

        // Set up clear input icon functionality
        this.searchToolbar.setupClearIcons(
            searchElements.searchInput,
            searchElements.searchClearBtn,
            replaceElements.replaceInput,
            replaceElements.replaceClearBtn,
            filterElements.includeInput,
            filterElements.includeClearBtn,
            filterElements.excludeInput,
            filterElements.excludeClearBtn,
            () => {
                // Trigger search when filters are cleared
                if (this.searchController) {
                    void this.searchController.performSearch();
                }
            }
        );

        // Store UI elements for component access
        this.elements = {
            containerEl: this.containerEl,
            searchInput: searchElements.searchInput,
            replaceInput: replaceElements.replaceInput,
            matchCaseCheckbox: searchElements.matchCaseBtn,
            wholeWordCheckbox: searchElements.wholeWordBtn,
            regexCheckbox: searchElements.regexBtn,
            multilineCheckbox: searchElements.multilineBtn,
            resultsContainer,
            selectedCountEl: adaptiveElements.selectedCountEl,
            toolbarBtn: adaptiveElements.toolbarBtn,
            resultsCountEl: adaptiveElements.resultsCountEl,
            clearAllBtn: replaceElements.clearAllBtn,
            filterBtn: replaceElements.filterBtn,
            filterPanel: filterElements.filterPanel,
            includeInput: filterElements.includeInput,
            excludeInput: filterElements.excludeInput,
            adaptiveToolbar: adaptiveElements.adaptiveToolbar,
            ellipsisMenuBtn: adaptiveElements.ellipsisMenuBtn,
            searchSpinner: adaptiveElements.searchSpinner
        };

        // Initialize remaining components now that we have UI elements
        this.replacementEngine = new ReplacementEngine(this.app, this.plugin, this.searchEngine);
        this.uiRenderer = new UIRenderer(this.elements, this.searchEngine, this.plugin);
        this.selectionManager = new SelectionManager(this.elements, this.plugin);

        // Wire up file header Ctrl/Cmd+Click to toggle selection for all matches in that file
        this.uiRenderer.setToggleFileSelectionCallback((startIndex, count) => {
            this.selectionManager.toggleRangeSelection(startIndex, count);
        });

        // Now that we have selectionManager, provide it to SearchToolbar
        this.searchToolbar.setSelectionManager(this.selectionManager);

        // Initialize SearchController for search logic
        this.searchController = new SearchController(
            this.plugin,
            this.elements,
            this.searchEngine,
            this.state,
            (searchOptions) => this.renderResultsWithOptions(searchOptions),
            () => this.clearResults(),
            () => this.searchToolbar.getSessionFilters()
        );

        // Initialize ActionHandler for event handling
        this.actionHandler = new ActionHandler(
            this.plugin,
            this,  // Pass view for registerDomEvent (proper cleanup on popout windows)
            this.elements,
            this.searchEngine,
            this.replacementEngine,
            () => this.searchController.performSearch(),
            (preserveSelection: boolean = false) => {
                const searchOptions = this.searchController.getSearchOptions();
                this.renderResultsWithOptions(searchOptions, preserveSelection);
            }
        );

        // Update SearchToolbar callbacks now that ActionHandler is available
        this.searchToolbar.updateReplaceCallbacks(
            () => this.actionHandler.replaceSelectedMatches(),
            () => this.actionHandler.replaceAllInVault()
        );

        // Set up state callbacks for ActionHandler
        this.actionHandler.setStateCallbacks(
            () => this.state.results,
            () => this.selectionManager.getSelectedIndices(),
            () => this.searchToolbar.getSessionFilters(),
            () => ({ count: this.state.totalResults ?? 0, isLimited: this.state.isLimited ?? false })
        );

        // Set up expand/collapse callback for ActionHandler
        this.actionHandler.setExpandCollapseCallback(() => {
            this.uiRenderer.toggleExpandCollapseAll();
        });

        // Set up suspend file events callback for bulk operations
        this.actionHandler.setSuspendFileEventsCallback((suspend: boolean) => {
            this.suspendFileEvents = suspend;
        });

        // Set up search functionality using SearchController
        this.searchController.setupBasicNavigation();

        // Only set up auto-search if enabled in settings
        if (this.plugin.settings.enableAutoSearch) {
            this.searchController.setupAutoSearch();
        }

        // Set up all event handlers using ActionHandler
        this.actionHandler.setupEventHandlers();
        this.actionHandler.setupKeyboardShortcuts();

        // Set up result click handling (not handled by ActionHandler)
        this.setupResultClickHandlers();

        // Navigation and auto-search are now handled by SearchController

        // Focus the search input after a short delay
        window.setTimeout(() => {
            this.elements.searchInput.focus();
        }, FOCUS_DELAY);

        // Satisfy async requirement (ItemView.onOpen must return Promise<void>)
        return Promise.resolve();
    }

    /**
     * Called when the view is closed - cleanup resources
     */
    async onClose(): Promise<void> {
        // Cleanup component instances
        this.searchController?.cleanup();
        this.actionHandler?.cleanup();
        this.searchEngine?.dispose();
        this.fileOperations?.dispose();
        this.selectionManager?.dispose();
        this.uiRenderer?.dispose();

        // Clear state data
        this.state.results = [];
        this.state.selectedIndices.clear();
        this.state.lineElements = [];

        // Clear element references (DOM cleanup handled by Obsidian)
        this.elements = null!;

        // Satisfy async requirement (ItemView.onClose must return Promise<void>)
        return Promise.resolve();
    }

    /**
     * Sets up result click handlers (delegated) - other event handling is now done by ActionHandler
     */
    private setupResultClickHandlers(): void {
        // Set up result click handlers (delegated)
        this.registerDomEvent(this.elements.resultsContainer, 'click', async (e) => {
            try {
                await this.handleResultClick(e);
            } catch (error) {
                this.logger.error('Result click handler error', error, true);
            }
        });
    }

    /**
     * Clears search results and resets UI state
     */
    private clearResults(): void {
        this.uiRenderer.clearResults();
        this.state.results = [];
        this.selectionManager.reset();
    }

    /**
     * Main search function - now delegated to SearchController
     */
    async performSearch(): Promise<void> {
        await this.searchController.performSearch();
    }

    /**
     * Renders search results with provided search options
     * @param searchOptions - The search options to use for rendering
     * @param preserveSelection - Whether to preserve existing selections (default: false)
     */
    private renderResultsWithOptions(
        searchOptions: { matchCase: boolean; wholeWord: boolean; useRegex: boolean },
        preserveSelection: boolean = false
    ): void {
        const replaceText = this.elements.replaceInput.value;
        const lineElements = this.uiRenderer.renderResults(
            this.state.results,
            replaceText,
            searchOptions,
            this.state.totalResults,
            this.state.isLimited
        );

        // Update state and set up selection
        this.state.lineElements = lineElements;
        this.selectionManager.setupSelection(lineElements, preserveSelection);
    }

    /**
     * Handles clicks on search results (delegation pattern)
     */
    private async handleResultClick(event: MouseEvent): Promise<void> {
        const target = event.target;

        if (!(target instanceof HTMLElement)) {
            this.logger.debug('Click event target is not an HTMLElement');
            return;
        }

        this.logger.debug('Result click detected on element:', target);

        // If clicking on a clickable-icon (replace button), handle that
        if (target.classList.contains('clickable-icon') || target.closest('.clickable-icon')) {
            const button = target.classList.contains('clickable-icon') ? target : target.closest('.clickable-icon');

            if (!(button instanceof HTMLElement)) {
                this.logger.error('Found clickable-icon but could not cast to HTMLElement');
                return;
            }

            if (button.getAttribute('aria-label') === 'Replace this match') {
                const resultIndex = button.getAttribute('data-result-index');
                if (resultIndex && resultIndex !== 'pending') {
                    const index = parseInt(resultIndex);
                    const result = this.state.results[index];
                    if (result) {
                        // Store focus context before replacement
                        const focusTarget = this.findNextFocusTarget(button);
                        this.logger.debug('Focus target found before replacement:', focusTarget);
                        await this.replaceIndividualMatch(result);
                        // Restore focus to next logical element
                        this.restoreFocusAfterReplacement(focusTarget);
                    }
                }
                return;
            }

            if (button.getAttribute('aria-label')?.startsWith('Replace all in')) {
                const filePath = button.getAttribute('data-file-path');
                if (filePath) {
                    const file = this.fileOperations.getFileByPath(filePath);
                    if (file) {
                        await this.replaceAllInFile(file);
                    }
                }
                return;
            }

            // Other clickable icons - just return without handling
            return;
        }

        // If not clicking on an icon, check if clicking on snippet or its children
        const snippetElement = target.classList.contains('snippet') ? target : target.closest('.snippet');

        if (snippetElement instanceof HTMLElement) {
            if (event.metaKey || event.ctrlKey) return; // Ignore modifier clicks

            this.logger.debug('Snippet click detected');

            const filePath = snippetElement.getAttribute('data-file-path');
            const lineStr = snippetElement.getAttribute('data-line');
            const colStr = snippetElement.getAttribute('data-col');
            const matchText = snippetElement.getAttribute('data-match-text');

            if (!filePath) {
                this.logger.error('No file path found in snippet element');
                return;
            }

            const line = lineStr ? parseInt(lineStr, 10) : 0;
            const col = colStr ? parseInt(colStr, 10) : 0;

            if (isNaN(line) || isNaN(col)) {
                this.logger.error('Invalid line or column data in snippet element', { lineStr, colStr });
                return;
            }

            const file = this.fileOperations.getFileByPath(filePath);
            if (file) {
                this.logger.debug('Opening file at line:', { file: file.path, line, col });
                await this.fileOperations.openFileAtLine(file, line, col, matchText || '', snippetElement);
            } else {
                this.logger.error('File not found:', filePath, true); // Show to user
            }
            return;
        }
    }

    /**
     * Replaces an individual match
     */
    private async replaceIndividualMatch(result: SearchResult): Promise<void> {
        try {
            const replaceText = this.elements.replaceInput.value;

            // Confirm if replacing with empty string
            if (!replaceText) {
                const confirmed = await this.confirmReplaceEmpty('Replace match with empty content? This cannot be undone.');
                if (!confirmed) return;
            }

            // Find the index of the result being replaced
            const resultIndex = this.state.results.findIndex(r =>
                r.file.path === result.file.path &&
                r.line === result.line &&
                r.col === result.col &&
                r.matchText === result.matchText
            );

            const searchOptions = this.searchController.getSearchOptions();
            const replacementResult = await this.replacementEngine.dispatchReplace(
                'one',
                this.state.results,
                this.selectionManager.getSelectedIndices(),
                replaceText,
                searchOptions,
                result
            );

            // Add replace text to history after successful replacement
            if (this.plugin.settings.enableSearchHistory) {
                this.plugin.historyManager.addReplace(replaceText);
            }

            // Update selection state before updating results
            if (resultIndex !== -1 && this.selectionManager.getSelectedIndices().has(resultIndex)) {
                // If the replaced result was selected, remove it from selection
                this.selectionManager.toggleSelection(resultIndex);
                this.logger.debug(`Removed replaced result at index ${resultIndex} from selection`);
            }

            // Use incremental update instead of full re-search
            if (replacementResult.affectedResults) {
                await this.updateResultsAfterReplacement(
                    replacementResult.affectedResults,
                    replaceText,
                    searchOptions
                );
            } else {
                // Fallback to full search if no metadata available
                await this.performSearch();
            }
        } catch (error) {
            this.logger.error('Failed to replace individual match', error, true);
        }
    }

    /**
     * Replaces all matches in a specific file
     */
    private async replaceAllInFile(file: TFile): Promise<void> {
        try {
            const replaceText = this.elements.replaceInput.value;
            const filePath = file.path;

            // Confirm replacement (if enabled in settings)
            if (this.plugin.settings.confirmDestructiveActions) {
                const confirmMessage = replaceText === ''
                    ? `Replace all matches in "${filePath}" with an empty value? This action cannot be undone.`
                    : `Replace all matches in "${filePath}"? This action cannot be undone.`;

                const confirmed = await this.confirmReplaceEmpty(confirmMessage);
                if (!confirmed) return;
            }

            const searchOptions = this.searchController.getSearchOptions();
            const replacementResult = await this.replacementEngine.dispatchReplace(
                'file',
                this.state.results,
                this.selectionManager.getSelectedIndices(),
                replaceText,
                searchOptions,
                file
            );

            // Use incremental update instead of full re-search
            if (replacementResult.affectedResults) {
                await this.updateResultsAfterReplacement(
                    replacementResult.affectedResults,
                    replaceText,
                    searchOptions
                );
            } else {
                // Fallback to full search if no metadata available
                await this.performSearch();
            }
        } catch (error) {
            this.logger.error(`Failed to replace all matches in file ${file.path}`, error, true);
        }
    }

    /**
     * Replaces all matches across the entire vault (now delegated to ActionHandler)
     * This method exists for backward compatibility and delegation
     */
    async replaceAllInVault(): Promise<void> {
        if (this.actionHandler) {
            await this.actionHandler.replaceAllInVault();
        } else {
            this.logger.error('ActionHandler not initialized for replace all vault operation');
        }
    }

    /**
     * Replaces only the user-selected matches (now delegated to ActionHandler)
     * This method exists for backward compatibility and delegation
     */
    private async replaceSelectedMatches(): Promise<void> {
        if (this.actionHandler) {
            await this.actionHandler.replaceSelectedMatches();
        } else {
            this.logger.error('ActionHandler not initialized for replace selected operation');
        }
    }

    /**
     * Shows a confirmation dialog for potentially destructive operations
     * @param message - The confirmation message to display
     * @returns Promise<boolean> - true if confirmed, false if cancelled
     */
    private async confirmReplaceEmpty(message: string): Promise<boolean> {
        const modal = new ConfirmModal(this.app, message);
        return modal.openAndConfirm();
    }

    // Search-related methods have been moved to SearchController

    /**
     * Updates results incrementally after a replacement operation
     * This avoids the need for a full vault re-search, improving performance significantly
     * @param affectedResults - Metadata about which results were affected by the replacement
     * @param replaceText - The replacement text that was used
     * @param searchOptions - Current search options for re-validation
     */
    private async updateResultsAfterReplacement(
        affectedResults: AffectedResults,
        _replaceText: string,
        _searchOptions: SearchOptions
    ): Promise<void> {
        try {
            const originalResultCount = this.state.results.length;

            this.logger.debug('Starting incremental result update', {
                originalResultCount,
                replacedCount: affectedResults.replacedResultIndices.length,
                modifiedFiles: affectedResults.modifiedFiles.size,
                requiresFullRevalidation: affectedResults.requiresFullRevalidation
            });

            // If replacement might have complex side effects, fall back to full search
            if (affectedResults.requiresFullRevalidation) {
                this.logger.warn('Full revalidation required, falling back to complete search', {
                    originalResultCount,
                    reason: 'requiresFullRevalidation=true'
                });
                await this.performSearch();
                return;
            }

            // Remove replaced results from our state (in reverse order to preserve indices)
            const sortedIndices = [...affectedResults.replacedResultIndices].sort((a, b) => b - a);
            for (const index of sortedIndices) {
                this.state.results.splice(index, 1);
            }

            // Decrement totalResults to keep header count accurate
            if (this.state.totalResults !== undefined) {
                this.state.totalResults -= sortedIndices.length;
            }

            // Update selection indices to account for removed results
            this.selectionManager.adjustSelectionForRemovedIndices(sortedIndices);

            // Get current search options for revalidation and rendering
            const searchOptions = this.searchController.getSearchOptions();

            const resultsBeforeRevalidation = this.state.results.length;

            // Re-validate results in modified lines to see if they still match
            await this.revalidateModifiedResults(affectedResults, searchOptions);

            const resultsAfterRevalidation = this.state.results.length;
            const revalidationRemoved = resultsBeforeRevalidation - resultsAfterRevalidation;

            // Also decrement totalResults for results removed during revalidation
            if (this.state.totalResults !== undefined && revalidationRemoved > 0) {
                this.state.totalResults -= revalidationRemoved;
            }

            // Sanity check: warn if we removed significantly more results than expected
            if (revalidationRemoved > affectedResults.replacedResultIndices.length * 5) {
                this.logger.warn(`Suspicious result removal detected:`, {
                    originalCount: originalResultCount,
                    directlyReplaced: affectedResults.replacedResultIndices.length,
                    revalidationRemoved,
                    finalCount: resultsAfterRevalidation,
                    modifiedFiles: affectedResults.modifiedFiles.size
                });

                // Consider falling back to full search if removal seems excessive
                if (revalidationRemoved > affectedResults.replacedResultIndices.length * 10) {
                    this.logger.error('Excessive result removal detected, falling back to full search', {
                        revalidationRemoved,
                        expectedRemoved: affectedResults.replacedResultIndices.length,
                        threshold: affectedResults.replacedResultIndices.length * 10
                    });
                    await this.performSearch();
                    return;
                }
            }

            this.logger.debug('Incremental update result counts:', {
                original: originalResultCount,
                afterDirectRemoval: resultsBeforeRevalidation,
                afterRevalidation: resultsAfterRevalidation,
                directlyRemoved: affectedResults.replacedResultIndices.length,
                revalidationRemoved
            });

            // TODO: Update selection manager to account for removed results
            // this.selectionManager.adjustForRemovedResults(affectedResults.replacedResultIndices);

            // TODO: Update UI incrementally instead of full rebuild
            // For now, use existing render method as fallback
            const replaceText = this.elements.replaceInput.value;
            const lineElements = this.uiRenderer.renderResults(
                this.state.results,
                replaceText,
                searchOptions,
                this.state.totalResults,
                this.state.isLimited
            );

            // Re-setup selection manager with new DOM elements and restore visual state
            this.state.lineElements = lineElements;
            this.selectionManager.setupSelection(lineElements, true); // Preserve existing selections

            this.logger.debug('Incremental update completed successfully');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error('Incremental update failed, falling back to full search', {
                error: errorMessage,
                stack: errorStack,
                currentResultCount: this.state.results.length,
                replacedIndices: affectedResults.replacedResultIndices
            });
            // Safety fallback: if incremental update fails, do full search
            await this.performSearch();
        }
    }

    /**
     * Re-validates search results in lines that were modified by replacement
     * Removes results that no longer match, keeps those that still match
     */
    private async revalidateModifiedResults(
        affectedResults: AffectedResults,
        searchOptions: SearchOptions
    ): Promise<void> {
        const query = this.elements.searchInput.value.trim();
        if (!query) return;

        // Build regex for re-validation
        const regex = this.searchEngine.buildSearchRegex(query, searchOptions);

        // Check each modified file
        for (const file of Array.from(affectedResults.modifiedFiles)) {
            try {
                const content = await this.app.vault.read(file);
                const lines = content.split('\n');
                const modifiedLineNumbers = affectedResults.modifiedLines.get(file) || new Set();

                // Find results in this file that need re-validation
                const resultsToCheck = this.state.results.filter(result =>
                    result.file.path === file.path &&
                    modifiedLineNumbers.has(result.line)
                );

                // Re-validate each result
                let removedCount = 0;
                for (let i = resultsToCheck.length - 1; i >= 0; i--) {
                    const result = resultsToCheck[i];
                    const lineText = lines[result.line] || '';

                    // Check if this result still matches the search
                    const stillMatches = this.doesLineStillMatch(lineText, result, regex, searchOptions, query);

                    if (!stillMatches) {
                        // Remove this result from the main results array
                        const mainIndex = this.state.results.findIndex(r =>
                            r === result || (
                                r.file.path === result.file.path &&
                                r.line === result.line &&
                                r.col === result.col
                            )
                        );
                        if (mainIndex !== -1) {
                            this.logger.debug(`Removing invalid result after revalidation:`, {
                                file: result.file.path,
                                line: result.line,
                                col: result.col,
                                originalText: result.matchText,
                                newLineText: lineText,
                                mainIndex
                            });
                            this.state.results.splice(mainIndex, 1);
                            removedCount++;
                        }
                    }
                }

                if (removedCount > 0) {
                    this.logger.debug(`Revalidation removed ${removedCount} results from ${file.path}`);
                }

            } catch (error) {
                this.logger.warn(`Failed to re-validate results in file ${file.path}`, error);
                // Continue with other files
            }
        }
    }

    /**
     * Checks if a specific line still contains the search match after replacement
     * Uses content-based validation instead of strict position matching
     */
    private doesLineStillMatch(
        lineText: string,
        originalResult: SearchResult,
        regex: RegExp,
        searchOptions: SearchOptions,
        _query: string
    ): boolean {
        // For revalidation, we should check if the match content still exists anywhere on the line
        // rather than requiring exact position match (since positions shift after replacements)

        if ((searchOptions.useRegex || searchOptions.wholeWord) && regex) {
            // Use matchAll to safely handle zero-length matches (e.g., a*, \d*, (foo)?)
            // Unlike exec(), matchAll auto-advances past zero-length matches
            regex.lastIndex = 0;
            return Array.from(lineText.matchAll(regex)).some(m => m[0] === originalResult.matchText);
        } else {
            // Use simple string matching - check if the exact match text still exists
            const haystack = searchOptions.matchCase ? lineText : lineText.toLowerCase();
            const needle = searchOptions.matchCase ? originalResult.matchText : originalResult.matchText.toLowerCase();

            // Check if the original match text still exists anywhere on the line
            return haystack.includes(needle);
        }
    }

    /**
     * Handles external file modifications - updates search results in-place
     * Called when a file with search results is modified outside the plugin
     * @param file - The file that was modified
     */
    async handleFileModified(file: TFile): Promise<void> {
        // Skip during bulk operations (e.g., replace all in vault)
        if (this.suspendFileEvents) {
            return;
        }

        // Skip if no query - nothing to search for
        const query = this.elements.searchInput.value.trim();
        if (!query) {
            return;
        }

        // Check if modified file has any search results
        const fileResultIndices: number[] = [];
        for (let i = 0; i < this.state.results.length; i++) {
            if (this.state.results[i].file.path === file.path) {
                fileResultIndices.push(i);
            }
        }

        const oldResultCount = fileResultIndices.length;
        this.logger.debug(`File ${file.path} modified, updating ${oldResultCount} results`);

        try {
            const searchOptions = this.searchController.getSearchOptions();

            // Clear regex cache to ensure fresh regex compilation
            // This prevents stale regex state from affecting the search
            this.searchEngine.clearCache();

            // Re-search the single file
            const newFileResults = await this.searchEngine.searchSingleFile(file, query, searchOptions);

            // If file wasn't in results but now has matches, do full search to maintain proper ordering
            if (oldResultCount === 0 && newFileResults.length > 0) {
                this.logger.debug(`File ${file.path} now has ${newFileResults.length} new matches. Running full search.`);
                await this.performSearch();
                return;
            }

            // If file wasn't in results and still has no matches, nothing to do
            if (oldResultCount === 0 && newFileResults.length === 0) {
                return;
            }

            // If we had results before but now have none, fall back to full search
            // This handles edge cases where single-file search might fail unexpectedly
            if (oldResultCount > 0 && newFileResults.length === 0) {
                this.logger.warn(`File ${file.path} had ${oldResultCount} results but single-file search returned 0. Falling back to full search.`);
                await this.performSearch();
                return;
            }

            // Find the insertion point (where the first result for this file was)
            const insertionIndex = fileResultIndices[0];

            // Remove old results for this file (in reverse order to preserve indices)
            const sortedIndices = [...fileResultIndices].sort((a, b) => b - a);
            for (const index of sortedIndices) {
                this.state.results.splice(index, 1);
            }

            // Adjust selections for removed indices
            this.selectionManager.adjustSelectionForRemovedIndices(sortedIndices);

            // Insert new results at the original position
            // Adjust insertion index for removed items before it
            const removedBeforeInsertion = sortedIndices.filter(i => i < insertionIndex).length;
            const adjustedInsertionIndex = insertionIndex - removedBeforeInsertion;

            // Insert new results
            this.state.results.splice(adjustedInsertionIndex, 0, ...newFileResults);

            // Adjust selections for inserted indices (shift indices >= insertion point up)
            this.selectionManager.adjustSelectionForInsertedIndices(adjustedInsertionIndex, newFileResults.length);

            // Update total results count
            if (this.state.totalResults !== undefined) {
                this.state.totalResults = this.state.totalResults - fileResultIndices.length + newFileResults.length;
            }

            this.logger.debug(`File ${file.path} update complete:`, {
                oldCount: fileResultIndices.length,
                newCount: newFileResults.length,
                totalResults: this.state.results.length
            });

            // Re-render results with preserved selections
            const replaceText = this.elements.replaceInput.value;
            const lineElements = this.uiRenderer.renderResults(
                this.state.results,
                replaceText,
                searchOptions,
                this.state.totalResults,
                this.state.isLimited
            );

            this.state.lineElements = lineElements;
            this.selectionManager.setupSelection(lineElements, true); // Preserve existing selections

        } catch (error) {
            this.logger.error(`Failed to update results for modified file ${file.path}`, error);
            // Don't fall back to full search - just log the error
        }
    }

    /**
     * Handles file deletion - removes results for deleted file
     * @param file - The file that was deleted
     */
    handleFileDeleted(file: TFile): void {
        if (this.state.results.length === 0) {
            return;
        }

        // Find all results for the deleted file
        const fileResultIndices: number[] = [];
        for (let i = 0; i < this.state.results.length; i++) {
            if (this.state.results[i].file.path === file.path) {
                fileResultIndices.push(i);
            }
        }

        if (fileResultIndices.length === 0) {
            return;
        }

        this.logger.debug(`File ${file.path} deleted, removing ${fileResultIndices.length} results`);

        // Remove results (in reverse order to preserve indices)
        const sortedIndices = [...fileResultIndices].sort((a, b) => b - a);
        for (const index of sortedIndices) {
            this.state.results.splice(index, 1);
        }

        // Adjust selections
        this.selectionManager.adjustSelectionForRemovedIndices(sortedIndices);

        // Update total results count
        if (this.state.totalResults !== undefined) {
            this.state.totalResults -= fileResultIndices.length;
        }

        // Re-render results
        const replaceText = this.elements.replaceInput.value;
        const searchOptions = this.searchController.getSearchOptions();
        const lineElements = this.uiRenderer.renderResults(
            this.state.results,
            replaceText,
            searchOptions,
            this.state.totalResults,
            this.state.isLimited
        );

        this.state.lineElements = lineElements;
        this.selectionManager.setupSelection(lineElements, true);
    }

    /**
     * Handles file rename - updates file references in results
     * @param file - The file after rename (with new path)
     * @param oldPath - The previous path of the file
     */
    handleFileRenamed(file: TFile, oldPath: string): void {
        if (this.state.results.length === 0) {
            return;
        }

        // Find all results for the renamed file (by old path)
        let updated = false;
        for (const result of this.state.results) {
            if (result.file.path === oldPath) {
                // Update the file reference to the new TFile
                result.file = file;
                updated = true;
            }
        }

        if (!updated) {
            return;
        }

        this.logger.debug(`File renamed from ${oldPath} to ${file.path}, updating results`);

        // Re-render to update displayed file paths
        const replaceText = this.elements.replaceInput.value;
        const searchOptions = this.searchController.getSearchOptions();
        const lineElements = this.uiRenderer.renderResults(
            this.state.results,
            replaceText,
            searchOptions,
            this.state.totalResults,
            this.state.isLimited
        );

        this.state.lineElements = lineElements;
        this.selectionManager.setupSelection(lineElements, true);
    }

    /**
     * Finds the previous logical focus target when removing an element
     * @param currentElement - The element that will be removed
     * @returns The previous element that should receive focus
     */
    private findNextFocusTarget(currentElement: HTMLElement): HTMLElement | null {
        // Find the line result container
        const lineResult = currentElement.closest('.line-result');
        if (!lineResult) return null;

        // Look for the PREVIOUS line result first (where tab focus came from)
        let targetSibling = lineResult.previousElementSibling;

        // If no previous sibling in current file group, look in previous file group
        if (!targetSibling) {
            const fileGroup = lineResult.closest('.file-group');
            if (fileGroup) {
                const prevFileGroup = fileGroup.previousElementSibling;
                if (prevFileGroup) {
                    const lineResults = prevFileGroup.querySelectorAll('.line-result');
                    targetSibling = lineResults[lineResults.length - 1]; // Get last result
                }
            }
        }

        // If no previous element, then look for next element
        if (!targetSibling) {
            let nextSibling = lineResult.nextElementSibling;

            // If no sibling in current file group, look in next file group
            if (!nextSibling) {
                const fileGroup = lineResult.closest('.file-group');
                if (fileGroup) {
                    const nextFileGroup = fileGroup.nextElementSibling;
                    if (nextFileGroup) {
                        nextSibling = nextFileGroup.querySelector('.line-result');
                    }
                }
            }

            targetSibling = nextSibling;
        }

        // Find focusable element within the target line result
        if (targetSibling) {
            return targetSibling.querySelector<HTMLElement>('.snippet, [role="button"]');
        }

        // Fallback to search input if no other elements
        return this.elements.searchInput;
    }

    /**
     * Restores focus to the appropriate element after replacement
     * @param targetElement - The element that should receive focus
     */
    private restoreFocusAfterReplacement(targetElement: HTMLElement | null): void {
        // Wait longer for DOM updates since we're doing incremental updates
        window.setTimeout(() => {
            if (targetElement && activeDocument.contains(targetElement)) {
                try {
                    targetElement.focus();
                    this.logger.debug('Focus restored to element after replacement:', targetElement);
                } catch (error) {
                    this.logger.debug('Failed to restore focus, falling back to search input:', error);
                    this.elements.searchInput.focus();
                }
            } else {
                this.logger.debug('Target element no longer exists, looking for alternative focus target');
                // Try to find a new focus target in the updated DOM
                const firstResult = this.elements.resultsContainer.querySelector('.snippet, [role="button"]') as HTMLElement;
                if (firstResult) {
                    firstResult.focus();
                    this.logger.debug('Focus restored to first available result');
                } else {
                    this.elements.searchInput.focus();
                    this.logger.debug('No results available, focus restored to search input');
                }
            }
        }, FOCUS_DELAY);
    }

    // ========================================
    // PUBLIC COMMAND METHODS FOR OBSIDIAN COMMANDS
    // ========================================

    /**
     * Command: Perform search operation
     */
    async commandPerformSearch(): Promise<void> {
        await this.searchController.performSearch();
    }

    /**
     * Command: Clear all inputs and reset toggles
     */
    commandClearAll(): void {
        this.elements.searchInput.value = '';
        this.elements.replaceInput.value = '';

        // Dispatch input events to update clear icon visibility
        this.elements.searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.elements.replaceInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Reset toggle states (including multiline)
        [
            this.elements.matchCaseCheckbox,
            this.elements.wholeWordCheckbox,
            this.elements.regexCheckbox,
            this.elements.multilineCheckbox
        ].forEach(btn => {
            if (btn) {
                btn.setAttribute('aria-pressed', 'false');
                btn.classList.remove('is-active');
            }
        });

        // Sync lastSearchOptions if "Remember Search Options" is enabled
        if (this.plugin.settings.rememberSearchOptions) {
            this.plugin.settings.lastSearchOptions.matchCase = false;
            this.plugin.settings.lastSearchOptions.wholeWord = false;
            this.plugin.settings.lastSearchOptions.useRegex = false;
            this.plugin.settings.lastSearchOptions.multiline = false;
            void this.plugin.saveSettings();
        }

        // Clear results
        this.clearResults();
        this.elements.searchInput.focus();
    }

    /**
     * Command: Focus search input
     */
    commandFocusSearch(): void {
        this.elements.searchInput.focus();
        this.elements.searchInput.select();
    }

    /**
     * Command: Focus replace input
     */
    commandFocusReplace(): void {
        this.elements.replaceInput.focus();
        this.elements.replaceInput.select();
    }

    /**
     * Command: Toggle match case option
     */
    commandToggleMatchCase(): void {
        this.toggleSearchOption(this.elements.matchCaseCheckbox);
    }

    /**
     * Command: Toggle whole word option
     */
    commandToggleWholeWord(): void {
        this.toggleSearchOption(this.elements.wholeWordCheckbox);
    }

    /**
     * Command: Toggle regex option
     */
    commandToggleRegex(): void {
        this.toggleSearchOption(this.elements.regexCheckbox);
    }

    /**
     * Command: Toggle multiline option
     */
    commandToggleMultiline(): void {
        this.toggleSearchOption(this.elements.multilineCheckbox);
    }



    /**
     * Command: Replace selected matches
     */
    async commandReplaceSelected(): Promise<void> {
        if (this.actionHandler) {
            await this.actionHandler.replaceSelectedMatches();
        }
    }

    /**
     * Command: Replace all matches in vault
     */
    async commandReplaceAllVault(): Promise<void> {
        if (this.actionHandler) {
            await this.actionHandler.replaceAllInVault();
        }
    }

    /**
     * Command: Toggle expand/collapse all results
     */
    commandExpandCollapseAll(): void {
        this.uiRenderer.toggleExpandCollapseAll();
    }

    /**
     * Command: Select all search results
     */
    commandSelectAllResults(): void {
        this.selectionManager.selectAll();
    }

    /**
     * Command: Open help modal
     */
    commandOpenHelp(): void {
        this.searchToolbar.openHelpModal();
    }

    /**
     * Command: Toggle word-wrap on result snippets
     */
    commandToggleWordWrap(): void {
        this.state.isWordWrapEnabled = !this.state.isWordWrapEnabled;

        if (this.state.isWordWrapEnabled) {
            this.elements.resultsContainer.classList.add('word-wrap-enabled');
        } else {
            this.elements.resultsContainer.classList.remove('word-wrap-enabled');
        }

        this.logger.debug('Word-wrap toggled:', this.state.isWordWrapEnabled);
    }

    /**
     * Sets the search input text
     * Used when opening the view with pre-populated search text
     */
    setSearchText(text: string): void {
        if (this.elements && this.elements.searchInput) {
            this.elements.searchInput.value = text;
        }
    }

    /**
     * Helper: Toggle a search option button
     */
    private toggleSearchOption(button: HTMLElement): void {
        if (!button) return;

        const isPressed = button.getAttribute('aria-pressed') === 'true';
        button.setAttribute('aria-pressed', (!isPressed).toString());
        button.classList.toggle('is-active', !isPressed);

        // Trigger search if there's a query
        const query = this.elements.searchInput.value.trim();
        if (query.length > 0) {
            // Clear cache to prevent stale regex
            this.searchEngine.clearCache();
            void this.searchController.performSearch();
        }
    }
}