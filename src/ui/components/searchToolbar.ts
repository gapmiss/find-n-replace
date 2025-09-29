import { setIcon, Menu } from 'obsidian';
import { Logger } from '../../utils';
import { SessionFilters } from '../../types';
import VaultFindReplacePlugin from '../../main';
import { SelectionManager } from './selectionManager';
import { HelpModal } from '../../modals/helpModal';
import { HistoryNavigator } from './historyNavigator';

/**
 * Interface for search input elements
 */
export interface SearchInputElements {
    searchInput: HTMLInputElement;
    searchClearBtn: HTMLButtonElement;
    matchCaseBtn: HTMLElement;
    wholeWordBtn: HTMLElement;
    regexBtn: HTMLElement;
    multilineBtn: HTMLElement;
}

/**
 * Interface for replace input elements
 */
export interface ReplaceInputElements {
    replaceInput: HTMLInputElement;
    replaceClearBtn: HTMLButtonElement;
    clearAllBtn: HTMLButtonElement;
    filterBtn: HTMLButtonElement;
}

/**
 * Interface for filter panel elements
 */
export interface FilterPanelElements {
    filterPanel: HTMLElement;
    includeInput: HTMLInputElement;
    includeClearBtn: HTMLButtonElement;
    excludeInput: HTMLInputElement;
    excludeClearBtn: HTMLButtonElement;
}

/**
 * Interface for adaptive toolbar elements
 */
export interface AdaptiveToolbarElements {
    adaptiveToolbar: HTMLElement;
    resultsCountEl: HTMLElement;
    selectedCountEl: HTMLElement;
    ellipsisMenuBtn: HTMLButtonElement;
    toolbarBtn: HTMLButtonElement;
}

/**
 * SearchToolbar handles all UI creation for the find/replace interface
 * Extracted from the massive FindReplaceView.onOpen() method for better maintainability
 */
export class SearchToolbar {
    private plugin: VaultFindReplacePlugin;
    private logger: Logger;
    private selectionManager: SelectionManager;
    private replaceSelectedCallback: () => Promise<void>;
    private replaceAllVaultCallback: () => Promise<void>;
    private performSearchCallback: () => Promise<void>;

    // History navigators for inputs
    private searchHistoryNavigator: HistoryNavigator;
    private replaceHistoryNavigator: HistoryNavigator;

    // Session-only filter state (not synced to settings)
    private sessionFilters = {
        include: '',
        exclude: ''
    };

    constructor(
        plugin: VaultFindReplacePlugin,
        selectionManager: SelectionManager,
        replaceSelectedCallback: () => Promise<void>,
        replaceAllVaultCallback: () => Promise<void>,
        performSearchCallback: () => Promise<void>
    ) {
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'SearchToolbar');
        this.selectionManager = selectionManager;
        this.replaceSelectedCallback = replaceSelectedCallback;
        this.replaceAllVaultCallback = replaceAllVaultCallback;
        this.performSearchCallback = performSearchCallback;

        // Initialize history navigators
        this.searchHistoryNavigator = new HistoryNavigator(plugin);
        this.replaceHistoryNavigator = new HistoryNavigator(plugin);

        // Initialize session filters from settings (one-time only)
        this.initializeSessionFilters();
    }

    /**
     * Initialize session filters from settings (one-time only on view creation)
     */
    private initializeSessionFilters(): void {
        const settings = this.plugin.settings;

        // Use the unified default patterns directly
        this.sessionFilters.include = settings.defaultIncludePatterns.join(', ');
        this.sessionFilters.exclude = settings.defaultExcludePatterns.join(', ');

        this.logger.debug('Initialized session filters from unified settings:', this.sessionFilters);
    }

    /**
     * Updates the replace callbacks after ActionHandler is initialized
     */
    updateReplaceCallbacks(
        replaceSelectedCallback: () => Promise<void>,
        replaceAllVaultCallback: () => Promise<void>
    ): void {
        this.replaceSelectedCallback = replaceSelectedCallback;
        this.replaceAllVaultCallback = replaceAllVaultCallback;
    }

    /**
     * Creates the main search toolbar container
     */
    createMainToolbar(containerEl: HTMLElement): HTMLElement {
        return containerEl.createDiv('find-replace-search-toolbar');
    }

    /**
     * Creates the search input row with inline options
     */
    createSearchInputRow(searchToolbar: HTMLElement): SearchInputElements {
        // Search input row with inline options
        const searchRow = searchToolbar.createDiv('find-replace-search-row');

        // Search input with icon
        const searchInputContainer = searchRow.createDiv('find-replace-input-container');
        const searchIcon = searchInputContainer.createSpan('search-input-icon');
        setIcon(searchIcon, 'search');

        const searchInput = searchInputContainer.createEl('input', {
            type: 'text',
            cls: 'find-replace-input',
            placeholder: 'Find (↑↓ for history)',
            attr: { 'tabindex': '1' }
        }) as HTMLInputElement;

        // Attach history navigator to search input
        this.searchHistoryNavigator.attachTo(searchInput, () => this.plugin.historyManager.getSearchHistory());

        // Add clear button for search input
        const searchClearBtn = searchInputContainer.createEl('button', {
            cls: 'input-clear-icon',
            attr: {
                'aria-label': 'Clear search input',
                'tabindex': '-1'
            }
        }) as HTMLButtonElement;
        setIcon(searchClearBtn, 'x');

        // Inline search options (VSCode-style)
        const searchOptions = searchRow.createDiv('find-replace-inline-options');

        // Create inline toggle buttons for search options
        const matchCaseBtn = this.createInlineToggle(searchOptions, 'match-case', 'case-sensitive', 'Match Case', 3, searchInput);
        const wholeWordBtn = this.createInlineToggle(searchOptions, 'whole-word', 'whole-word', 'Match Whole Word', 4, searchInput);
        const regexBtn = this.createInlineToggle(searchOptions, 'regex', 'regex', 'Use Regular Expression', 5, searchInput);
        const multilineBtn = this.createInlineToggle(searchOptions, 'multiline', 'wrap-text', 'Multiline Mode (enables \\n patterns)', 6, searchInput);

        return {
            searchInput,
            searchClearBtn,
            matchCaseBtn,
            wholeWordBtn,
            regexBtn,
            multilineBtn
        };
    }

    /**
     * Creates the replace input row with clear button
     */
    createReplaceInputRow(searchToolbar: HTMLElement): ReplaceInputElements {
        // Replace input row
        const replaceRow = searchToolbar.createDiv('find-replace-replace-row');

        // Replace input with icon
        const replaceInputContainer = replaceRow.createDiv('find-replace-input-container');
        const replaceIcon = replaceInputContainer.createSpan('replace-input-icon');
        setIcon(replaceIcon, 'replace');

        const replaceInput = replaceInputContainer.createEl('input', {
            type: 'text',
            cls: 'find-replace-input',
            placeholder: 'Replace (↑↓ for history)',
            attr: { 'tabindex': '2' }
        }) as HTMLInputElement;

        // Attach history navigator to replace input
        this.replaceHistoryNavigator.attachTo(replaceInput, () => this.plugin.historyManager.getReplaceHistory());

        // Add clear button for replace input
        const replaceClearBtn = replaceInputContainer.createEl('button', {
            cls: 'input-clear-icon',
            attr: {
                'aria-label': 'Clear replace input',
                'tabindex': '-1'
            }
        }) as HTMLButtonElement;
        setIcon(replaceClearBtn, 'x');

        // Clear button moved to replace row
        const replaceRowActions = replaceRow.createDiv('find-replace-toolbar-actions');
        const clearAllBtn = replaceRowActions.createEl('button', {
            cls: 'inline-toggle-btn toolbar-action clickable-icon',
            attr: {
                'aria-label': 'Clear Search',
                'tabindex': '6'
            }
        });
        setIcon(clearAllBtn, 'search-x');

        // Filter button (VSCode-style) - position after clear button
        const filterBtn = replaceRowActions.createEl('button', {
            cls: 'inline-toggle-btn toolbar-action clickable-icon',
            attr: {
                'aria-label': 'Toggle File Filters',
                'tabindex': '7'
            }
        });
        setIcon(filterBtn, 'filter');

        return {
            replaceInput,
            replaceClearBtn,
            clearAllBtn,
            filterBtn
        };
    }

    /**
     * Creates the expandable filter panel (VSCode-style)
     */
    createFilterPanel(searchToolbar: HTMLElement): FilterPanelElements {
        // Filter panel container (initially hidden)
        const filterPanel = searchToolbar.createDiv({
            cls: 'find-replace-filter-panel hidden'
        });

        // Include input row
        const includeRow = filterPanel.createDiv('filter-input-row');
        const includeLabel = includeRow.createSpan({
            cls: 'filter-input-label',
            text: 'files to include:'
        });
        const includeInputContainer = includeRow.createDiv('filter-input-container');
        const includeInput = includeInputContainer.createEl('input', {
            type: 'text',
            cls: 'filter-input',
            placeholder: 'e.g. .md, Notes/, *.js',
            attr: { 'tabindex': '8' }
        }) as HTMLInputElement;

        // Add clear button for include input
        const includeClearBtn = includeInputContainer.createEl('button', {
            cls: 'input-clear-icon filter-clear-icon',
            attr: {
                'aria-label': 'Clear files to include',
                'tabindex': '-1'
            }
        }) as HTMLButtonElement;
        setIcon(includeClearBtn, 'x');

        // Exclude input row
        const excludeRow = filterPanel.createDiv('filter-input-row');
        const excludeLabel = excludeRow.createSpan({
            cls: 'filter-input-label',
            text: 'files to exclude:'
        });
        const excludeInputContainer = excludeRow.createDiv('filter-input-container');
        const excludeInput = excludeInputContainer.createEl('input', {
            type: 'text',
            cls: 'filter-input',
            placeholder: 'e.g. *.tmp, Archive/, *backup*',
            attr: { 'tabindex': '9' }
        }) as HTMLInputElement;

        // Add clear button for exclude input
        const excludeClearBtn = excludeInputContainer.createEl('button', {
            cls: 'input-clear-icon filter-clear-icon',
            attr: {
                'aria-label': 'Clear files to exclude',
                'tabindex': '-1'
            }
        }) as HTMLButtonElement;
        setIcon(excludeClearBtn, 'x');

        return {
            filterPanel,
            includeInput,
            includeClearBtn,
            excludeInput,
            excludeClearBtn
        };
    }

    /**
     * Creates the results container
     */
    createResultsContainer(containerEl: HTMLElement): HTMLElement {
        return containerEl.createDiv({
            cls: 'find-replace-results',
            attr: { 'tabindex': '12' }
        });
    }

    /**
     * Creates the adaptive results toolbar
     */
    createAdaptiveToolbar(searchToolbar: HTMLElement): AdaptiveToolbarElements {
        // === ADAPTIVE RESULTS TOOLBAR ===
        // Contextual toolbar section that appears when results exist
        const adaptiveToolbar = searchToolbar.createDiv('find-replace-adaptive-toolbar hidden');

        // Results summary section
        const resultsSummary = adaptiveToolbar.createDiv('adaptive-results-summary');

        // Results count display
        const resultsCountEl = resultsSummary.createEl('span', {
            cls: 'adaptive-results-count',
            text: '0 results'
        });

        // Selected count display (appears when items are selected)
        const selectedCountEl = resultsSummary.createEl('span', {
            cls: 'adaptive-selected-count hidden',
            text: '• 0 selected'
        });

        // Action buttons container
        const adaptiveActions = adaptiveToolbar.createDiv('adaptive-action-buttons');

        // Selection count gap element for mobile spacing
        const actionGap = adaptiveActions.createDiv('adaptive-action-gap');

        // Ellipsis menu container for replace actions
        const ellipsisMenuContainer = adaptiveActions.createDiv('ellipsis-menu-container');

        // Ellipsis menu button using Obsidian's Menu class
        const ellipsisMenuBtn = ellipsisMenuContainer.createEl('button', {
            cls: 'adaptive-action-btn clickable-icon ellipsis-menu-btn',
            attr: {
                'disabled': true, // Start disabled (no results)
                'aria-label': 'Replace actions menu',
                'tabindex': '10'
            }
        });
        setIcon(ellipsisMenuBtn, 'more-horizontal');

        // Set up ellipsis menu functionality
        this.setupEllipsisMenu(ellipsisMenuBtn);

        // Move expand/collapse button to adaptive toolbar
        const expandCollapseBtn = adaptiveActions.createEl('button', {
            cls: 'adaptive-action-btn clickable-icon hidden',
            attr: {
                'aria-label': 'Expand all',
                'tabindex': '11'
            }
        });
        setIcon(expandCollapseBtn, 'copy-plus'); // Set initial icon to "expand" since we start collapsed

        return {
            adaptiveToolbar,
            resultsCountEl,
            selectedCountEl,
            ellipsisMenuBtn,
            toolbarBtn: expandCollapseBtn
        };
    }

    /**
     * Sets up tab navigation for the clear button
     */
    setupClearButtonNavigation(clearAllBtn: HTMLButtonElement, adaptiveToolbar: HTMLElement, resultsContainer: HTMLElement): void {
        // No custom tab navigation - let browser handle natural DOM order
    }

    /**
     * Sets up filter button toggle functionality
     */
    setupFilterToggle(filterBtn: HTMLButtonElement, filterPanel: HTMLElement, includeInput: HTMLInputElement, excludeInput: HTMLInputElement): void {
        let isFilterPanelVisible = false;

        // Toggle filter panel visibility
        filterBtn.addEventListener('click', () => {
            isFilterPanelVisible = !isFilterPanelVisible;

            if (isFilterPanelVisible) {
                filterPanel.removeClass('hidden');
                // Focus the include input for immediate typing
                includeInput.focus();
            } else {
                filterPanel.addClass('hidden');
            }

            this.logger.debug('Filter panel toggled:', { visible: isFilterPanelVisible });
        });

        // Handle input changes and update session filters + trigger search
        const updateFiltersAndSearch = async () => {
            const includeValue = includeInput.value.trim();
            const excludeValue = excludeInput.value.trim();

            this.logger.debug('Updating session filters:', { include: includeValue, exclude: excludeValue });

            // Store in session (not settings)
            this.sessionFilters.include = includeValue;
            this.sessionFilters.exclude = excludeValue;

            // Note: Session filters are now passed to SearchEngine directly via SearchController

            // Update filter button visual state
            this.updateFilterButtonState(filterBtn);

            // Trigger search refresh
            await this.performSearchCallback();
        };

        // Debounced update for input changes
        let updateTimeout: NodeJS.Timeout;
        const debouncedUpdate = () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(updateFiltersAndSearch, 500);
        };

        // Input change handlers
        includeInput.addEventListener('input', debouncedUpdate);
        excludeInput.addEventListener('input', debouncedUpdate);

        // Enter key handlers for immediate search
        includeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(updateTimeout); // Cancel debounced update
                updateFiltersAndSearch(); // Immediate update
            }
        });
        excludeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(updateTimeout); // Cancel debounced update
                updateFiltersAndSearch(); // Immediate update
            }
        });

        // Load session filter values into inputs
        includeInput.value = this.sessionFilters.include;
        excludeInput.value = this.sessionFilters.exclude;

        // Note: Session filters are now passed to SearchEngine directly via SearchController

        // Update filter button visual state
        this.updateFilterButtonState(filterBtn);
    }

    /**
     * Creates session filters from current session filter inputs (does NOT modify plugin settings)
     * @returns SessionFilters object for use with SearchEngine
     */
    getSessionFilters(): SessionFilters {
        const sessionFilters: SessionFilters = {};

        // Parse include patterns
        if (this.sessionFilters.include) {
            const patterns = this.parseFilterPatterns(this.sessionFilters.include);
            sessionFilters.fileExtensions = patterns.extensions;
            sessionFilters.searchInFolders = patterns.folders;
            sessionFilters.includePatterns = patterns.globs;
        } else {
            sessionFilters.fileExtensions = [];
            sessionFilters.searchInFolders = [];
            sessionFilters.includePatterns = [];
        }

        // Parse exclude patterns
        if (this.sessionFilters.exclude) {
            const patterns = this.parseFilterPatterns(this.sessionFilters.exclude);
            sessionFilters.excludePatterns = patterns.globs;
            sessionFilters.excludeFolders = patterns.folders;
        } else {
            sessionFilters.excludePatterns = [];
            sessionFilters.excludeFolders = [];
        }

        this.logger.debug('Created session filters (no settings modified):', sessionFilters);

        return sessionFilters;
    }

    /**
     * Parse filter patterns into extensions, folders, and globs
     */
    private parseFilterPatterns(input: string): { extensions: string[], folders: string[], globs: string[] } {
        const patterns = input.split(',').map(p => p.trim()).filter(p => p.length > 0);
        const extensions: string[] = [];
        const folders: string[] = [];
        const globs: string[] = [];

        patterns.forEach(pattern => {
            if (pattern.startsWith('.')) {
                // File extension (remove the dot)
                extensions.push(pattern.substring(1));
            } else if (pattern.includes('*') || pattern.includes('?')) {
                // Glob pattern (contains wildcards)
                globs.push(pattern);
            } else {
                // Folder (plain name, remove trailing slash if present)
                folders.push(pattern.replace(/\/$/, ''));
            }
        });

        return { extensions, folders, globs };
    }




    /**
     * Sets up expand/collapse button navigation
     */
    setupExpandCollapseNavigation(expandCollapseBtn: HTMLButtonElement, resultsContainer: HTMLElement): void {
        // Handle tab navigation from last adaptive button to results
        expandCollapseBtn.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                // Tab forward to first result
                const firstFocusableResult = resultsContainer.querySelector('.snippet, [role="button"]') as HTMLElement;
                if (firstFocusableResult) {
                    e.preventDefault();
                    firstFocusableResult.focus();
                }
            }
        });
    }

    /**
     * Sets up clear icon functionality for all input fields
     */
    setupClearIcons(
        searchInput: HTMLInputElement,
        searchClearBtn: HTMLButtonElement,
        replaceInput: HTMLInputElement,
        replaceClearBtn: HTMLButtonElement,
        includeInput: HTMLInputElement,
        includeClearBtn: HTMLButtonElement,
        excludeInput: HTMLInputElement,
        excludeClearBtn: HTMLButtonElement,
        onInputChange?: () => void
    ): void {
        // Helper function to update clear icon visibility
        const updateClearIconVisibility = (input: HTMLInputElement, clearBtn: HTMLButtonElement) => {
            if (input.value.trim()) {
                clearBtn.classList.add('visible');
            } else {
                clearBtn.classList.remove('visible');
            }
        };

        // Helper function to clear input and trigger events
        const clearInput = (input: HTMLInputElement, clearBtn: HTMLButtonElement) => {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            clearBtn.classList.remove('visible');
            input.focus(); // Focus the input field after clearing
            if (onInputChange) {
                onInputChange();
            }
        };

        // Set up search input clear functionality
        searchInput.addEventListener('input', () => {
            updateClearIconVisibility(searchInput, searchClearBtn);
        });

        searchClearBtn.addEventListener('click', () => {
            clearInput(searchInput, searchClearBtn);
        });

        // Set up replace input clear functionality
        replaceInput.addEventListener('input', () => {
            updateClearIconVisibility(replaceInput, replaceClearBtn);
        });

        replaceClearBtn.addEventListener('click', () => {
            clearInput(replaceInput, replaceClearBtn);
        });

        // Set up include input clear functionality
        includeInput.addEventListener('input', () => {
            updateClearIconVisibility(includeInput, includeClearBtn);
        });

        includeClearBtn.addEventListener('click', () => {
            clearInput(includeInput, includeClearBtn);
        });

        // Set up exclude input clear functionality
        excludeInput.addEventListener('input', () => {
            updateClearIconVisibility(excludeInput, excludeClearBtn);
        });

        excludeClearBtn.addEventListener('click', () => {
            clearInput(excludeInput, excludeClearBtn);
        });

        // Initialize visibility state on setup
        updateClearIconVisibility(searchInput, searchClearBtn);
        updateClearIconVisibility(replaceInput, replaceClearBtn);
        updateClearIconVisibility(includeInput, includeClearBtn);
        updateClearIconVisibility(excludeInput, excludeClearBtn);
    }

    /**
     * Creates an inline toggle button (moved from FindReplaceView private method)
     */
    private createInlineToggle(container: HTMLElement, id: string, icon: string, label: string, tabIndex?: number, searchInput?: HTMLInputElement): HTMLElement {
        const toggle = container.createEl('button', {
            cls: 'inline-toggle-btn clickable-icon',
            attr: {
                'aria-label': label,
                'data-toggle': id,
                'aria-pressed': 'false',
                'tabindex': tabIndex?.toString() || '0'
            }
        });

        setIcon(toggle, icon);

        // Handle toggle state changes
        toggle.addEventListener('click', async () => {
            const isPressed = toggle.getAttribute('aria-pressed') === 'true';
            const newPressed = !isPressed;
            toggle.setAttribute('aria-pressed', newPressed.toString());
            toggle.classList.toggle('is-active', newPressed);

            // Trigger auto-search when toggle state changes (if search query exists)
            if (searchInput) {
                const searchQuery = searchInput.value.trim();
                if (searchQuery.length > 0) {
                    await this.performSearchCallback();
                }
            }
        });

        return toggle;
    }

    /**
     * Sets up the ellipsis menu with Obsidian's Menu class
     */
    private setupEllipsisMenu(ellipsisMenuBtn: HTMLButtonElement): void {
        // Create menu function for both mouse and keyboard events
        const showEllipsisMenu = (e: MouseEvent | KeyboardEvent) => {
            e.stopPropagation();
            const menu = new Menu();

            // Add "Replace Selected" menu item
            menu.addItem((item) => {
                item.setTitle('Replace Selected')
                    .setIcon('replace')
                    .setDisabled(this.selectionManager.getSelectedIndices().size === 0)
                    .onClick(async () => {
                        try {
                            this.logger.debug('Replace Selected menu item clicked');
                            await this.replaceSelectedCallback();
                        } catch (error) {
                            this.logger.error('Replace selected menu item error', error, true);
                        }
                    });
            });

            // Add "Replace All in Vault" menu item
            menu.addItem((item) => {
                item.setTitle('Replace All in Vault')
                    .setIcon('replace-all')
                    .onClick(async () => {
                        try {
                            await this.replaceAllVaultCallback();
                        } catch (error) {
                            this.logger.error('Replace all vault menu item error', error, true);
                        }
                    });
            });

            // Add separator before help item
            menu.addSeparator();

            // Add "Help" menu item
            menu.addItem((item) => {
                item.setTitle('Help')
                    .setIcon('help-circle')
                    .onClick(() => {
                        try {
                            const helpModal = new HelpModal(this.plugin.app, this.plugin);
                            helpModal.open();
                        } catch (error) {
                            this.logger.error('Help modal error', error, true);
                        }
                    });
            });

            // Show menu at proper position based on event type
            if (e instanceof MouseEvent) {
                menu.showAtMouseEvent(e);
            } else {
                // For keyboard events, show at button position
                const rect = ellipsisMenuBtn.getBoundingClientRect();
                menu.showAtPosition({ x: rect.left, y: rect.bottom });
            }
        };

        // Add mouse click handler
        ellipsisMenuBtn.addEventListener('click', showEllipsisMenu);

        // Add keyboard handler for Space and Enter
        ellipsisMenuBtn.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showEllipsisMenu(e);
            }
        });

        // Add custom event listeners for keyboard shortcuts
        ellipsisMenuBtn.addEventListener('replace-all-vault', async () => {
            try {
                await this.replaceAllVaultCallback();
            } catch (error) {
                this.logger.error('Replace all vault keyboard shortcut error', error, true);
            }
        });

        ellipsisMenuBtn.addEventListener('replace-selected', async () => {
            try {
                await this.replaceSelectedCallback();
            } catch (error) {
                this.logger.error('Replace selected keyboard shortcut error', error, true);
            }
        });
    }

    /**
     * Updates the filter button state to show active filters count
     */
    private updateFilterButtonState(filterBtn: HTMLButtonElement): void {
        // Count active filters
        let activeFiltersCount = 0;

        // Count include filters
        if (this.sessionFilters.include.trim()) {
            const includePatterns = this.sessionFilters.include.split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);
            activeFiltersCount += includePatterns.length;
        }

        // Count exclude filters
        if (this.sessionFilters.exclude.trim()) {
            const excludePatterns = this.sessionFilters.exclude.split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);
            activeFiltersCount += excludePatterns.length;
        }

        // Update button state
        if (activeFiltersCount > 0) {
            filterBtn.classList.add('is-active');
            filterBtn.setAttribute('aria-pressed', 'true');

            // Add or update badge
            let badge = filterBtn.querySelector('.filter-count-badge') as HTMLElement;
            if (!badge) {
                badge = filterBtn.createSpan('filter-count-badge');
            }
            badge.textContent = activeFiltersCount.toString();
        } else {
            filterBtn.classList.remove('is-active');
            filterBtn.setAttribute('aria-pressed', 'false');

            // Remove badge if no active filters
            const badge = filterBtn.querySelector('.filter-count-badge');
            if (badge) {
                badge.remove();
            }
        }

        this.logger.debug('Updated filter button state:', { activeFiltersCount });
    }
}