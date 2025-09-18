import { ItemView, WorkspaceLeaf, TFile, type App, Notice, setIcon } from 'obsidian';
import { ConfirmModal } from "../../modals";
import VaultFindReplacePlugin from "../../main";
import { SearchResult, FindReplaceElements, SearchOptions, ViewState, ReplacementMode, ReplacementTarget } from '../../types';
import { SearchEngine, ReplacementEngine, FileOperations } from '../../core';
import { UIRenderer, SelectionManager } from '../components';

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

    /**
     * Constructor - initializes the view with required Obsidian components
     * @param leaf - The workspace leaf this view will be attached to
     * @param app - The main Obsidian app instance
     * @param plugin - Reference to the main plugin for accessing settings/methods
     */
    constructor(leaf: WorkspaceLeaf, app: App, plugin: VaultFindReplacePlugin) {
        super(leaf);
        this.plugin = plugin;

        // Initialize state
        this.state = {
            isCollapsed: false,
            selectedIndices: new Set(),
            results: [],
            lineElements: []
        };

        // Initialize components
        this.searchEngine = new SearchEngine(app);
        this.fileOperations = new FileOperations(app);
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
        this.state.isCollapsed = false; // Start with results expanded

        // === SEARCH INPUT SECTION ===
        // Create wrapper div for the search input and its clear button
        let findInputWrapper = this.containerEl.createDiv('find-replace-input-wrapper');
        const searchInput = findInputWrapper.createEl('input', {
            type: 'text',
            cls: 'find-replace-input',
            placeholder: 'Find'
        }) as HTMLInputElement;

        // Add clear button next to search input
        findInputWrapper.createEl('button', {
            cls: 'clear-btn',
            attr: { 'aria-label': 'Clear input' }
        }) as HTMLInputElement;

        // === REPLACE INPUT SECTION ===
        // Create wrapper div for the replace input and its clear button
        let replaceInputWrapper = this.containerEl.createDiv('find-replace-input-wrapper');
        const replaceInput = replaceInputWrapper.createEl('input', {
            type: 'text',
            cls: 'find-replace-input',
            placeholder: 'Replace'
        }) as HTMLInputElement;

        // Add clear button next to replace input
        replaceInputWrapper.createEl('button', {
            cls: 'clear-btn',
            attr: { 'aria-label': 'Clear input' }
        }) as HTMLInputElement;

        // === SEARCH OPTIONS SECTION ===
        // Create container for the three search option checkboxes
        const optionsDiv = this.containerEl.createDiv('find-replace-options');

        // === RESULTS TOOLBAR SECTION ===
        // Create toolbar that appears above results (initially hidden)
        const resultsToolbar = this.containerEl.createDiv('find-replace-results-toolbar');
        resultsToolbar.classList.add('hidden'); // Hide until we have results

        // Count display showing "X results in Y files"
        const resultsCountEl = resultsToolbar.createDiv({
            cls: 'find-replace-results-count',
            text: '0 results'
        });

        // Expand/collapse all results button
        const toolbarBtn = resultsToolbar.createEl('button', {
            cls: 'collapse-toggle clickable-icon hidden',
            attr: { 'aria-label': 'Collapse all' }
        });
        setIcon(toolbarBtn, 'copy-minus'); // Set initial icon to "collapse"

        // === RESULTS CONTAINER ===
        // Container where all search results will be displayed
        const resultsContainer = this.containerEl.createDiv('find-replace-results');

        // === REPLACE CONTROLS SECTION ===
        // Create container for replace selected and replace all buttons
        const selectedContainer = this.containerEl.createDiv('find-replace-selected-all');

        // Display count of selected results
        const selectedCountEl = selectedContainer.createEl('span', { text: '0 selected' });

        // Button to replace only selected matches
        const replaceSelectedBtn = selectedContainer.createEl('button', {
            text: 'Replace selected',
            attr: { 'disabled': true } // Start disabled (no selections)
        });

        // Button to replace all matches in the entire vault
        const replaceAllVaultBtn = selectedContainer.createEl('button', {
            cls: 'find-replace-btn',
            attr: { 'disabled': true } // Start disabled (no results)
        });
        replaceAllVaultBtn.textContent = 'Replace all in vault';

        this.containerEl.appendChild(selectedContainer);

        // Create search options first
        const matchCaseCheckbox = this.createOption(optionsDiv, 'Match Case', 'match-case');
        const wholeWordCheckbox = this.createOption(optionsDiv, 'Whole Word', 'whole-word');
        const regexCheckbox = this.createOption(optionsDiv, 'Regex', 'regex');

        // Store UI elements for component access
        this.elements = {
            containerEl: this.containerEl,
            searchInput,
            replaceInput,
            matchCaseCheckbox,
            wholeWordCheckbox,
            regexCheckbox,
            resultsContainer,
            selectedCountEl,
            replaceSelectedBtn: replaceSelectedBtn as HTMLButtonElement,
            replaceAllVaultBtn: replaceAllVaultBtn as HTMLButtonElement,
            resultsToolbar,
            toolbarBtn: toolbarBtn as HTMLButtonElement,
            resultsCountEl
        };

        // Initialize remaining components now that we have UI elements
        this.replacementEngine = new ReplacementEngine(this.app, this.searchEngine);
        this.uiRenderer = new UIRenderer(this.elements, this.searchEngine);
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
     * Sets up all event handlers for the UI
     */
    private setupEventHandlers(): void {
        // Enable basic navigation with Enter key search
        this.setupBasicNavigation();

        // Enable replace input changes for preview updates
        this.elements.replaceInput.addEventListener('input', () => {
            this.renderResults();
        });

        // Set up expand/collapse all functionality
        this.elements.toolbarBtn.addEventListener('click', () => {
            this.uiRenderer.toggleExpandCollapseAll();
        });

        // Set up replace button handlers
        this.registerDomEvent(this.elements.replaceSelectedBtn, 'click', async () => {
            await this.replaceSelectedMatches();
        });

        this.registerDomEvent(this.elements.replaceAllVaultBtn, 'click', async () => {
            await this.replaceAllInVault();
        });

        // Set up result click handlers (delegated)
        this.registerDomEvent(this.elements.resultsContainer, 'click', async (e) => {
            await this.handleResultClick(e);
        });

        // Manual search is handled by setupBasicNavigation Enter key handlers
        // Enable auto-search with result limiting
        this.setupLimitedAutoSearch();
    }

    /**
     * Main search function - restored functionality
     */
    async performSearch(): Promise<void> {
        try {
            console.log('Search called');
            const query = this.elements.searchInput.value;
            console.log('Query:', query);

            if (!query || query.trim().length === 0) {
                console.log('Empty query, clearing results');
                this.uiRenderer.clearResults();
                this.state.results = [];
                return;
            }

            console.log('About to call search engine with query:', query);

            // Get search options from checkboxes
            const searchOptions = this.getSearchOptions();
            console.log('Search options:', searchOptions);

            // Perform the actual search
            const results = await this.searchEngine.performSearch(query, searchOptions);
            console.log('Search completed, found', results.length, 'results');

            // Update state and render results
            this.state.results = results;
            this.renderResults();
            // this.renderResults(); // Disable rendering temporarily
            console.log('Search completed');

        } catch (error) {
            console.error('Search failed:', error);
            new Notice('Search failed: ' + error.message);
        }
    }

    /**
     * Renders search results using UIRenderer and sets up selection
     */
    private renderResults(): void {
        const replaceText = this.elements.replaceInput.value;
        const lineElements = this.uiRenderer.renderResults(this.state.results, replaceText);

        // Update state and set up selection
        this.state.lineElements = lineElements;
        this.selectionManager.setupSelection(lineElements);
    }

    /**
     * Handles clicks on search results (delegation pattern)
     */
    private async handleResultClick(event: MouseEvent): Promise<void> {
        const target = event.target as HTMLElement;

        // If clicking on a clickable-icon (replace button), handle that
        if (target.classList.contains('clickable-icon') || target.closest('.clickable-icon')) {
            const button = target.classList.contains('clickable-icon') ? target : target.closest('.clickable-icon') as HTMLElement;

            if (button.getAttribute('aria-label') === 'Replace this match') {
                const resultIndex = button.getAttribute('data-result-index');
                if (resultIndex && resultIndex !== 'pending') {
                    const index = parseInt(resultIndex);
                    const result = this.state.results[index];
                    if (result) {
                        await this.replaceIndividualMatch(result);
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
        const snippetElement = target.classList.contains('snippet') ? target : target.closest('.snippet') as HTMLElement;

        if (snippetElement) {
            if (event.metaKey || event.ctrlKey) return; // Ignore modifier clicks

            const filePath = snippetElement.getAttribute('data-file-path');
            const line = parseInt(snippetElement.getAttribute('data-line') || '0');
            const col = parseInt(snippetElement.getAttribute('data-col') || '0');
            const matchText = snippetElement.getAttribute('data-match-text') || '';

            if (filePath) {
                const file = this.fileOperations.getFileByPath(filePath);
                if (file) {
                    await this.fileOperations.openFileAtLine(file, line, col, matchText, snippetElement);
                }
            }
            return;
        }
    }

    /**
     * Replaces an individual match
     */
    private async replaceIndividualMatch(result: SearchResult): Promise<void> {
        const replaceText = this.elements.replaceInput.value;

        // Confirm if replacing with empty string
        if (!replaceText) {
            const confirmed = await this.confirmReplaceEmpty('Replace match with empty content? This cannot be undone.');
            if (!confirmed) return;
        }

        const searchOptions = this.getSearchOptions();
        await this.replacementEngine.dispatchReplace(
            'one',
            this.state.results,
            this.selectionManager.getSelectedIndices(),
            replaceText,
            searchOptions,
            result
        );

        await this.performSearch();
    }

    /**
     * Replaces all matches in a specific file
     */
    private async replaceAllInFile(file: TFile): Promise<void> {
        const replaceText = this.elements.replaceInput.value;
        const filePath = file.path;

        // Confirm replacement
        const confirmMessage = replaceText === ''
            ? `Replace all matches in "${filePath}" with an empty value? This action cannot be undone.`
            : `Replace all matches in "${filePath}"? This action cannot be undone.`;

        const confirmed = await this.confirmReplaceEmpty(confirmMessage);
        if (!confirmed) return;

        const searchOptions = this.getSearchOptions();
        await this.replacementEngine.dispatchReplace(
            'file',
            this.state.results,
            this.selectionManager.getSelectedIndices(),
            replaceText,
            searchOptions,
            file
        );

        await this.performSearch();
    }

    /**
     * Replaces all matches across the entire vault
     * Shows confirmation dialog and performs replacement on all results
     */
    async replaceAllInVault(): Promise<void> {
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
        await this.replacementEngine.dispatchReplace(
            'vault',
            this.state.results,
            this.selectionManager.getSelectedIndices(),
            replaceText,
            searchOptions
        );

        await this.performSearch();
    }

    /**
     * Replaces only the user-selected matches
     * Shows confirmation for empty replacements and processes selected results
     */
    private async replaceSelectedMatches(): Promise<void> {
        if (!this.selectionManager.hasSelection()) return;

        const replaceText = this.elements.replaceInput.value;

        // Confirm if replacing with empty string
        if (!replaceText) {
            const confirmed = await this.confirmReplaceEmpty('Replace selected matches with empty content? This cannot be undone.');
            if (!confirmed) return;
        }

        const searchOptions = this.getSearchOptions();
        await this.replacementEngine.dispatchReplace(
            'selected',
            this.state.results,
            this.selectionManager.getSelectedIndices(),
            replaceText,
            searchOptions
        );

        await this.performSearch();
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
            // Don't automatically trigger search - let user control when to search
        });

        // Handle keyboard navigation for checkbox
        checkboxContainer.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                checkboxContainer.click();
            }
        });

        // Make checkbox container focusable
        checkboxContainer.setAttribute('tabindex', '0');
        checkboxContainer.setAttribute('role', 'checkbox');

        return toggleContainer;
    }

    /**
     * Sets up basic navigation without auto-search
     */
    private setupBasicNavigation(): void {
        // Set up Enter key handlers
        const elements = [
            this.elements.searchInput,
            this.elements.replaceInput,
            this.elements.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox'),
            this.elements.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox'),
            this.elements.regexCheckbox.querySelector('#toggle-regex-checkbox'),
        ].filter((el): el is HTMLInputElement => el instanceof HTMLInputElement);

        elements.forEach(el => {
            el.addEventListener('keydown', async (evt) => {
                if (evt.key === 'Enter') {
                    await this.performSearch();
                }
            });
        });

        // Set up clear button handlers
        const clearBtns = this.elements.containerEl.querySelectorAll<HTMLButtonElement>(".clear-btn");
        clearBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const input = btn.previousElementSibling as HTMLInputElement;
                if (input) {
                    input.value = "";
                    input.dispatchEvent(new Event("input"));
                    input.focus();
                }
            });
        });
    }

    /**
     * Sets up auto-search with proper debouncing
     */
    private setupAutoSearch(): void {
        let searchTimeout: NodeJS.Timeout;

        this.elements.searchInput.addEventListener("input", () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                // Only auto-search if there's actual content
                const query = this.elements.searchInput.value.trim();
                if (query.length > 0) {
                    await this.performSearch();
                } else {
                    // Clear results if search is empty
                    this.uiRenderer.clearResults();
                    this.state.results = [];
                    this.selectionManager.reset();
                }
            }, 300); // 300ms debounce
        });
    }


    /**
     * Auto-search with result limiting to prevent UI freeze
     */
    private setupLimitedAutoSearch(): void {
        let searchTimeout: NodeJS.Timeout;
        this.elements.searchInput.addEventListener("input", () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const query = this.elements.searchInput.value.trim();
                if (query.length > 0) {
                    console.log('Auto-search with limiting for:', query);
                    await this.performLimitedSearch(query);
                } else {
                    // Clear results if search is empty
                    this.uiRenderer.clearResults();
                    this.state.results = [];
                    this.selectionManager.reset();
                }
            }, 300);
        });
    }

    /**
     * Performs search with result limiting for auto-search
     */
    private async performLimitedSearch(query: string): Promise<void> {
        try {
            const searchOptions = this.getSearchOptions();
            const results = await this.searchEngine.performSearch(query, searchOptions);

            console.log(`Found ${results.length} total results`);

            // Limit results to prevent UI freeze
            const MAX_AUTO_SEARCH_RESULTS = 500;
            const limitedResults = results.slice(0, MAX_AUTO_SEARCH_RESULTS);

            if (results.length > MAX_AUTO_SEARCH_RESULTS) {
                console.log(`Limited to ${MAX_AUTO_SEARCH_RESULTS} results for auto-search`);
            }

            // Update state and render limited results
            this.state.results = limitedResults;
            this.renderResults();

        } catch (error) {
            console.error('Auto-search failed:', error);
        }
    }

    /**
     * Gets the current state of search options from checkboxes
     */
    private getSearchOptions(): { matchCase: boolean; wholeWord: boolean; useRegex: boolean } {
        return {
            matchCase: (this.elements.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)?.checked || false,
            wholeWord: (this.elements.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox') as HTMLInputElement)?.checked || false,
            useRegex: (this.elements.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)?.checked || false
        };
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
}