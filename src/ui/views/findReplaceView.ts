import { ItemView, WorkspaceLeaf, TFile, type App, Notice, setIcon, debounce } from 'obsidian';
import { ConfirmModal } from "../../modals";
import VaultFindReplacePlugin from "../../main";
import { SearchResult, FindReplaceElements, SearchOptions, ViewState, ReplacementMode, ReplacementTarget, AffectedResults } from '../../types';
import { SearchEngine, ReplacementEngine, FileOperations } from '../../core';
import { UIRenderer, SelectionManager } from '../components';
import { Logger, safeQuerySelector, isNotNull } from '../../utils';

// Define the unique identifier for this view type - used by Obsidian to track and manage this view
export const VIEW_TYPE_FIND_REPLACE = 'find-replace-view';

/**
 * Main view class that extends Obsidian's ItemView
 * This creates the Find & Replace panel UI and coordinates all functionality through specialized components
 */
export class FindReplaceView extends ItemView {
    // Component instances
    private searchEngine: SearchEngine;
    private replacementEngine: ReplacementEngine;
    private uiRenderer: UIRenderer;
    private selectionManager: SelectionManager;
    private fileOperations: FileOperations;

    // UI Element references
    private elements: FindReplaceElements;

    // State management
    private state: ViewState;

    // Plugin reference
    plugin: VaultFindReplacePlugin;

    // Logger instance
    private logger: Logger;

    // Search state management
    private currentSearchController: AbortController | null = null;
    private isSearching: boolean = false;

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
            lineElements: []
        };

        // Initialize components
        this.searchEngine = new SearchEngine(app);
        this.fileOperations = new FileOperations(app, plugin);
    }

    // Required Obsidian ItemView methods - these define how the view appears in the interface
    getViewType(): string { return VIEW_TYPE_FIND_REPLACE; }    // Returns the unique view type identifier
    getDisplayText(): string { return 'Vault Find & Replace'; } // Text shown in tabs and menus
    getIcon(): string { return 'text-search'; }                 // Icon shown in tabs (Lucide icon name)

    /**
     * Called when the view is opened - sets up the entire UI structure
     * This is where all DOM elements are created and event listeners are attached
     */
    async onOpen(): Promise<void> {
        // Clear any existing content and add our main CSS class
        this.containerEl.empty();
        this.containerEl.addClass('find-replace-container');
        this.state.isCollapsed = true; // Start with results collapsed for better UX

        // === MAIN SEARCH TOOLBAR ===
        // VSCode-style search toolbar with inputs and inline controls
        const searchToolbar = this.containerEl.createDiv('find-replace-search-toolbar');

        // Search input row with inline options
        const searchRow = searchToolbar.createDiv('find-replace-search-row');

        // Search input with icon
        const searchInputContainer = searchRow.createDiv('find-replace-input-container');
        const searchIcon = searchInputContainer.createSpan('search-input-icon');
        setIcon(searchIcon, 'search');

        const searchInput = searchInputContainer.createEl('input', {
            type: 'text',
            cls: 'find-replace-input',
            placeholder: 'Find',
            attr: { 'tabindex': '1' }
        }) as HTMLInputElement;

        // Inline search options (VSCode-style)
        const searchOptions = searchRow.createDiv('find-replace-inline-options');

        // Create inline toggle buttons for search options
        const matchCaseBtn = this.createInlineToggle(searchOptions, 'match-case', 'case-sensitive', 'Match Case', 3);
        const wholeWordBtn = this.createInlineToggle(searchOptions, 'whole-word', 'whole-word', 'Match Whole Word', 4);
        const regexBtn = this.createInlineToggle(searchOptions, 'regex', 'regex', 'Use Regular Expression', 5);

        // Toolbar actions (clear, settings, etc.)
        const toolbarActions = searchRow.createDiv('find-replace-toolbar-actions');

        // Global clear button
        const clearAllBtn = toolbarActions.createEl('button', {
            cls: 'inline-toggle-btn toolbar-action clickable-icon',
            attr: {
                'aria-label': 'Clear Search',
                'tabindex': '6'
            }
        });
        setIcon(clearAllBtn, 'search-x');

        // Handle tab navigation from clear button to adaptive toolbar
        clearAllBtn.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                // Tab forward to first adaptive toolbar button (if visible), then to results
                const firstAdaptiveButton = this.elements.adaptiveToolbar.querySelector('.adaptive-action-btn:not(.hidden)') as HTMLElement;
                if (firstAdaptiveButton) {
                    e.preventDefault();
                    firstAdaptiveButton.focus();
                } else {
                    // If no adaptive toolbar visible, go to first result
                    const firstFocusableResult = this.elements.resultsContainer.querySelector('.snippet, [role="button"]') as HTMLElement;
                    if (firstFocusableResult) {
                        e.preventDefault();
                        firstFocusableResult.focus();
                    }
                }
            }
        });

        // Replace input row
        const replaceRow = searchToolbar.createDiv('find-replace-replace-row');

        // Replace input with icon
        const replaceInputContainer = replaceRow.createDiv('find-replace-input-container');
        const replaceIcon = replaceInputContainer.createSpan('replace-input-icon');
        setIcon(replaceIcon, 'replace');

        const replaceInput = replaceInputContainer.createEl('input', {
            type: 'text',
            cls: 'find-replace-input',
            placeholder: 'Replace',
            attr: { 'tabindex': '2' }
        }) as HTMLInputElement;

        // === RESULTS CONTAINER ===
        // Container where all search results will be displayed
        const resultsContainer = this.containerEl.createDiv('find-replace-results');

        // Global replace all button (appears in toolbar when results exist)
        const replaceAllVaultBtn = toolbarActions.createEl('button', {
            cls: 'inline-toggle-btn toolbar-action clickable-icon',
            attr: {
                'disabled': true, // Start disabled (no results)
                'aria-label': 'Replace All in Vault'
            }
        });
        setIcon(replaceAllVaultBtn, 'replace-all');
        replaceAllVaultBtn.style.display = 'none'; // Hidden until results exist

        // === ADAPTIVE RESULTS TOOLBAR ===
        // Contextual toolbar section that appears when results exist (integrated into searchToolbar)
        const adaptiveToolbar = searchToolbar.createDiv('find-replace-adaptive-toolbar hidden');

        // Results summary and count
        const resultsSummary = adaptiveToolbar.createDiv('adaptive-results-summary');
        const resultsCountEl = resultsSummary.createEl('span', {
            cls: 'adaptive-results-count',
            text: '0 results'
        });

        // Selection status (shows when items are selected)
        const selectedCountEl = resultsSummary.createEl('span', {
            cls: 'adaptive-selected-count hidden',
            text: '• 0 selected'
        });

        // Action buttons container
        const adaptiveActions = adaptiveToolbar.createDiv('adaptive-action-buttons');

        // Replace selected button (shows when items are selected)
        const replaceSelectedBtn = adaptiveActions.createEl('button', {
            cls: 'adaptive-action-btn clickable-icon hidden',
            attr: {
                'disabled': true, // Start disabled (no selections)
                'aria-label': 'Replace selected matches',
                'tabindex': '7'
            }
        });
        setIcon(replaceSelectedBtn, 'check-circle');

        // Replace all in vault button
        const replaceAllVaultBtnBottom = adaptiveActions.createEl('button', {
            cls: 'adaptive-action-btn clickable-icon adaptive-action-btn-primary',
            attr: {
                'disabled': true, // Start disabled (no results)
                'aria-label': 'Replace all in vault',
                'tabindex': '8'
            }
        });
        setIcon(replaceAllVaultBtnBottom, 'vault');

        // Move expand/collapse button to adaptive toolbar
        const expandCollapseBtn = adaptiveActions.createEl('button', {
            cls: 'adaptive-action-btn clickable-icon hidden',
            attr: {
                'aria-label': 'Expand all',
                'tabindex': '9'
            }
        });
        setIcon(expandCollapseBtn, 'copy-plus'); // Set initial icon to "expand" since we start collapsed

        // Handle tab navigation from last adaptive button to results
        expandCollapseBtn.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                // Tab forward to first result
                const firstFocusableResult = this.elements.resultsContainer.querySelector('.snippet, [role="button"]') as HTMLElement;
                if (firstFocusableResult) {
                    e.preventDefault();
                    firstFocusableResult.focus();
                }
            }
        });

        // Store UI elements for component access
        this.elements = {
            containerEl: this.containerEl,
            searchInput,
            replaceInput,
            matchCaseCheckbox: matchCaseBtn, // Now using inline toggle
            wholeWordCheckbox: wholeWordBtn, // Now using inline toggle
            regexCheckbox: regexBtn, // Now using inline toggle
            resultsContainer,
            selectedCountEl,
            replaceSelectedBtn: replaceSelectedBtn as HTMLButtonElement,
            replaceAllVaultBtn: replaceAllVaultBtn as HTMLButtonElement,
            toolbarBtn: expandCollapseBtn as HTMLButtonElement, // Now in adaptive toolbar
            resultsCountEl,
            clearAllBtn, // Global clear button
            replaceAllVaultBtnBottom: replaceAllVaultBtnBottom as HTMLButtonElement, // Adaptive toolbar duplicate
            adaptiveToolbar // Contextual results toolbar
        };

        // Initialize remaining components now that we have UI elements
        this.replacementEngine = new ReplacementEngine(this.app, this.searchEngine);
        this.uiRenderer = new UIRenderer(this.elements, this.searchEngine, this.plugin);
        this.selectionManager = new SelectionManager(this.elements);
        // NavigationHandler no longer needed for basic functionality

        // Set up all event handlers
        this.setupEventHandlers();

        // Focus the search input after a short delay
        setTimeout(() => {
            this.elements.searchInput.focus();
        }, 100);
    }

    /**
     * Called when the view is closed - cleanup resources
     */
    async onClose(): Promise<void> {
        // Cancel any ongoing search
        if (this.currentSearchController) {
            this.currentSearchController.abort();
            this.currentSearchController = null;
        }
        this.isSearching = false;

        // Cleanup component instances
        this.searchEngine?.dispose();
        this.fileOperations?.dispose();
        this.selectionManager?.dispose();
        this.uiRenderer?.dispose();

        // Clear state data
        this.state.results = [];
        this.state.selectedIndices.clear();
        this.state.lineElements = [];

        // Clear element references (DOM cleanup handled by Obsidian)
        this.elements = null as any;
    }

    /**
     * Sets up all event handlers for the UI
     */
    private setupEventHandlers(): void {
        // Enable basic navigation with Enter key search
        this.setupBasicNavigation();

        // Enable replace input changes for preview updates
        this.elements.replaceInput.addEventListener('input', () => {
            this.renderResults();
        });

        // Set up inline toggle handlers to update search results
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
                        // Cancel current search to prevent inconsistent results
                        if (this.currentSearchController) {
                            this.currentSearchController.abort();
                            this.logger.debug(`[Toggle:${toggleName}] Cancelled ongoing search due to option change`);
                        }
                    }

                    // Clear SearchEngine cache when options change to prevent stale regex
                    this.searchEngine.clearCache();
                    this.logger.debug(`[Toggle:${toggleName}] Cleared SearchEngine cache due to option change`);

                    // Only re-search if there's an active query
                    if (query.length > 0) {
                        this.logger.debug(`[Toggle:${toggleName}] Calling performSearch for: "${query}"`);
                        this.performSearch();
                    } else {
                        this.logger.debug(`[Toggle:${toggleName}] No query, skipping search`);
                    }
                }, this.plugin.settings.searchDebounceDelay); // Use settings-based debounce timing

                this.logger.debug(`[Toggle:${toggleName}] Setting up click listener with debounce: ${this.plugin.settings.searchDebounceDelay}ms`);
                toggleBtn.addEventListener('click', debouncedToggleSearch);
            }
        });

        // Set up global clear button
        this.elements.clearAllBtn.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.elements.replaceInput.value = '';

            // Clear search results
            this.uiRenderer.clearResults();
            this.state.results = [];
            this.selectionManager.reset();

            // Reset toggle states
            toggleButtons.forEach(btn => {
                btn.setAttribute('aria-pressed', 'false');
                btn.classList.remove('is-active');
            });

            // Focus back to search input
            this.elements.searchInput.focus();
        });

        // Set up expand/collapse all functionality
        this.elements.toolbarBtn.addEventListener('click', () => {
            this.uiRenderer.toggleExpandCollapseAll();
        });

        // Set up replace button handlers
        this.registerDomEvent(this.elements.replaceSelectedBtn, 'click', async () => {
            try {
                await this.replaceSelectedMatches();
            } catch (error) {
                this.logger.error('Replace selected button error', error, true);
            }
        });

        this.registerDomEvent(this.elements.replaceAllVaultBtn, 'click', async () => {
            try {
                await this.replaceAllInVault();
            } catch (error) {
                this.logger.error('Replace all vault button error', error, true);
            }
        });

        // Set up bottom toolbar button handlers (duplicates for easy access)
        this.registerDomEvent(this.elements.replaceAllVaultBtnBottom, 'click', async () => {
            try {
                await this.replaceAllInVault();
            } catch (error) {
                this.logger.error('Replace all vault bottom button error', error, true);
            }
        });

        // Set up result click handlers (delegated)
        this.registerDomEvent(this.elements.resultsContainer, 'click', async (e) => {
            try {
                await this.handleResultClick(e);
            } catch (error) {
                this.logger.error('Result click handler error', error, true);
            }
        });

        // Manual search is handled by setupBasicNavigation Enter key handlers
        // Enable auto-search
        this.setupAutoSearch();
    }

    /**
     * Main search function - restored functionality
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
                this.uiRenderer.clearResults();
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
            // Perform the actual search
            const results = await this.searchEngine.performSearch(query, searchOptions);
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
            this.renderResultsWithOptions(searchOptions);

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
     * Renders search results using FROZEN search options (no race conditions)
     */
    private renderResultsWithOptions(searchOptions: { matchCase: boolean; wholeWord: boolean; useRegex: boolean }): void {
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
        this.selectionManager.setupSelection(lineElements);
    }

    /**
     * DEPRECATED: Use renderResultsWithOptions() to avoid race conditions
     * This method reads search options which can cause inconsistency during search
     */
    private renderResults(): void {
        const replaceText = this.elements.replaceInput.value;
        const searchOptions = this.getSearchOptions(); // WARNING: Race condition risk!
        const lineElements = this.uiRenderer.renderResults(
            this.state.results,
            replaceText,
            searchOptions,
            this.state.totalResults,
            this.state.isLimited
        );

        // Update state and set up selection
        this.state.lineElements = lineElements;
        this.selectionManager.setupSelection(lineElements);
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

            const searchOptions = this.getSearchOptions();
            const replacementResult = await this.replacementEngine.dispatchReplace(
                'one',
                this.state.results,
                this.selectionManager.getSelectedIndices(),
                replaceText,
                searchOptions,
                result
            );

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

            // Confirm replacement
            const confirmMessage = replaceText === ''
                ? `Replace all matches in "${filePath}" with an empty value? This action cannot be undone.`
                : `Replace all matches in "${filePath}"? This action cannot be undone.`;

            const confirmed = await this.confirmReplaceEmpty(confirmMessage);
            if (!confirmed) return;

            const searchOptions = this.getSearchOptions();
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
     * Replaces all matches across the entire vault
     * Shows confirmation dialog and performs replacement on all results
     */
    async replaceAllInVault(): Promise<void> {
        try {
            if (!this.state.results || this.state.results.length === 0) {
                new Notice('No results to replace.');
                return;
            }

            const replaceText = this.elements.replaceInput.value;

            // Confirm the vault-wide replacement
            const confirmMessage = replaceText === ''
                ? 'Replace all matches across the vault with an empty value? This action cannot be undone.'
                : 'Replace all matches across the vault? This action cannot be undone.';

            const confirmed = await this.confirmReplaceEmpty(confirmMessage);
            if (!confirmed) return;

            const searchOptions = this.getSearchOptions();
            const replacementResult = await this.replacementEngine.dispatchReplace(
                'vault',
                this.state.results,
                this.selectionManager.getSelectedIndices(),
                replaceText,
                searchOptions
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
            this.logger.error('Failed to replace all matches in vault', error, true);
        }
    }

    /**
     * Replaces only the user-selected matches
     * Shows confirmation for empty replacements and processes selected results
     */
    private async replaceSelectedMatches(): Promise<void> {
        try {
            if (!this.selectionManager.hasSelection()) return;

            const replaceText = this.elements.replaceInput.value;

            // Confirm if replacing with empty string
            if (!replaceText) {
                const confirmed = await this.confirmReplaceEmpty('Replace selected matches with empty content? This cannot be undone.');
                if (!confirmed) return;
            }

            const searchOptions = this.getSearchOptions();
            const replacementResult = await this.replacementEngine.dispatchReplace(
                'selected',
                this.state.results,
                this.selectionManager.getSelectedIndices(),
                replaceText,
                searchOptions
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
            this.logger.error('Failed to replace selected matches', error, true);
        }
    }

    /**
     * Shows a confirmation dialog for potentially destructive operations
     * @param message - The confirmation message to display
     * @returns Promise<boolean> - true if confirmed, false if cancelled
     */
    private async confirmReplaceEmpty(message: string): Promise<boolean> {
        const modal = new ConfirmModal(this.app, message);
        modal.open();

        // Wait for the modal to close using polling
        await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                if (!modal.isOpen) {
                    clearInterval(interval);
                    resolve();
                }
            }, 50);
        });

        return modal.result;
    }

    /**
     * Creates a checkbox option with label and proper event handling
     * @param parent - Parent element to attach the option to
     * @param label - Display text for the option
     * @param id - Unique identifier for this option
     * @returns The container element for this option
     */
    private createOption(parent: HTMLElement, label: string, id: string): HTMLElement {
        const toggleContainer = parent.createDiv('toggle-container');

        // Create label element
        toggleContainer.createEl(
            'label',
            {
                text: `${label}:`,
                attr: {
                    'for': `toggle-${id}-checkbox`
                }
            }
        );

        // Create container for the checkbox
        const checkboxContainer = toggleContainer.createDiv('checkbox-container');

        // Create the actual checkbox input
        const checkbox = checkboxContainer.createEl(
            'input',
            {
                cls: 'toggle-checkbox',
                attr: {
                    type: 'checkbox',
                    id: `toggle-${id}-checkbox`
                }
            }
        ) as HTMLInputElement;

        // Handle clicking on the container
        checkboxContainer.addEventListener('click', () => {
            const isEnabled = checkboxContainer.classList.toggle('is-enabled');
            checkbox.checked = isEnabled;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Handle checkbox changes
        checkbox.addEventListener('change', () => {
            const isEnabled = checkbox.checked;
            checkboxContainer.classList.toggle('is-enabled', isEnabled);
        });

        return toggleContainer;
    }

    /**
     * Sets up basic navigation without auto-search
     */
    private setupBasicNavigation(): void {
        // Set up Enter key handlers for inputs and toggle buttons
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
            this.elements.regexCheckbox
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
    private setupAutoSearch(): void {
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
                this.uiRenderer.clearResults();
                this.state.results = [];
                this.selectionManager.reset();
            }
        }, this.plugin.settings.searchDebounceDelay);

        this.logger.debug(`[AutoSearch] Setting up input listener with debounce: ${this.plugin.settings.searchDebounceDelay}ms`);
        this.elements.searchInput.addEventListener("input", debouncedSearch);
    }




    /**
     * Gets the current state of search options from inline toggles
     */
    /**
     * Reads search options ONCE for freezing during search execution
     * This method should only be called at the START of a search
     */
    private readSearchOptionsOnce(): { matchCase: boolean; wholeWord: boolean; useRegex: boolean } {
        const matchCase = this.getToggleValue(this.elements.matchCaseCheckbox);
        const wholeWord = this.getToggleValue(this.elements.wholeWordCheckbox);
        const useRegex = this.getToggleValue(this.elements.regexCheckbox);

        const optionsSnapshot = { matchCase, wholeWord, useRegex };

        this.logger.debug('readSearchOptionsOnce() creating frozen snapshot:', {
            matchCase: { value: matchCase, pressed: this.elements.matchCaseCheckbox?.getAttribute('aria-pressed') },
            wholeWord: { value: wholeWord, pressed: this.elements.wholeWordCheckbox?.getAttribute('aria-pressed') },
            useRegex: { value: useRegex, pressed: this.elements.regexCheckbox?.getAttribute('aria-pressed') },
            snapshot: optionsSnapshot
        });

        return optionsSnapshot;
    }

    /**
     * DEPRECATED: Use readSearchOptionsOnce() for search execution
     * This method is only for non-search operations
     */
    private getSearchOptions(): { matchCase: boolean; wholeWord: boolean; useRegex: boolean } {
        const matchCase = this.getToggleValue(this.elements.matchCaseCheckbox);
        const wholeWord = this.getToggleValue(this.elements.wholeWordCheckbox);
        const useRegex = this.getToggleValue(this.elements.regexCheckbox);

        const optionsSnapshot = { matchCase, wholeWord, useRegex };

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
    private validateSearchInput(query: string, useRegex: boolean): boolean {
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
     * Updates results incrementally after a replacement operation
     * This avoids the need for a full vault re-search, improving performance significantly
     * @param affectedResults - Metadata about which results were affected by the replacement
     * @param replaceText - The replacement text that was used
     * @param searchOptions - Current search options for re-validation
     */
    private async updateResultsAfterReplacement(
        affectedResults: AffectedResults,
        replaceText: string,
        searchOptions: SearchOptions
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

            // Update selection indices to account for removed results
            this.selectionManager.adjustSelectionForRemovedIndices(sortedIndices);

            // Get current search options for revalidation and rendering
            const searchOptions = this.getSearchOptions();

            const resultsBeforeRevalidation = this.state.results.length;

            // Re-validate results in modified lines to see if they still match
            await this.revalidateModifiedResults(affectedResults, searchOptions);

            const resultsAfterRevalidation = this.state.results.length;
            const revalidationRemoved = resultsBeforeRevalidation - resultsAfterRevalidation;

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

            // Update search statistics
            this.updateSearchStatistics();

            this.logger.debug('Incremental update completed successfully');

        } catch (error) {
            this.logger.error('Incremental update failed, falling back to full search', {
                error: error.message,
                stack: error.stack,
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
        for (const file of affectedResults.modifiedFiles) {
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
        query: string
    ): boolean {
        // For revalidation, we should check if the match content still exists anywhere on the line
        // rather than requiring exact position match (since positions shift after replacements)

        if ((searchOptions.useRegex || searchOptions.wholeWord) && regex) {
            // Use regex matching - check if any match exists on the line
            regex.lastIndex = 0; // Reset regex state

            // Find all matches on the line
            const matches: RegExpExecArray[] = [];
            let match;
            while ((match = regex.exec(lineText)) !== null) {
                matches.push(match);
                if (!regex.global) break; // Prevent infinite loop for non-global regex
            }

            // Check if any match has the same content as the original
            return matches.some(m => m[0] === originalResult.matchText);
        } else {
            // Use simple string matching - check if the exact match text still exists
            const haystack = searchOptions.matchCase ? lineText : lineText.toLowerCase();
            const needle = searchOptions.matchCase ? originalResult.matchText : originalResult.matchText.toLowerCase();

            // Check if the original match text still exists anywhere on the line
            return haystack.includes(needle);
        }
    }

    /**
     * Updates search statistics after incremental changes
     */
    private updateSearchStatistics(): void {
        // Update result count display
        const resultCount = this.state.results.length;
        const fileCount = new Set(this.state.results.map(r => r.file.path)).size;

        // Update any UI elements that display these counts
        // This will be implemented when we modify the UI renderer
        this.logger.debug('Updated search statistics', { resultCount, fileCount });
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
            return targetSibling.querySelector('.snippet, [role="button"]') as HTMLElement;
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
        setTimeout(() => {
            if (targetElement && document.contains(targetElement)) {
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
        }, 100); // Increased delay for DOM updates
    }

    /**
     * Creates a VSCode-style inline toggle button
     * @param container - Parent container element
     * @param id - Unique identifier for the toggle
     * @param icon - Icon name for the toggle
     * @param label - Aria label for accessibility
     * @param tabIndex - Tab order index for keyboard navigation
     * @returns The toggle button element
     */
    private createInlineToggle(container: HTMLElement, id: string, icon: string, label: string, tabIndex?: number): HTMLElement {
        const toggleBtn = container.createEl('button', {
            cls: 'inline-toggle-btn clickable-icon',
            attr: {
                'data-toggle': id,
                'aria-label': label,
                'aria-pressed': 'false',
                ...(tabIndex && { 'tabindex': tabIndex.toString() })
            }
        });

        setIcon(toggleBtn, icon);

        // Handle toggle state
        toggleBtn.addEventListener('click', () => {
            const isPressed = toggleBtn.getAttribute('aria-pressed') === 'true';
            toggleBtn.setAttribute('aria-pressed', (!isPressed).toString());
            toggleBtn.classList.toggle('is-active', !isPressed);
        });

        return toggleBtn;
    }
}