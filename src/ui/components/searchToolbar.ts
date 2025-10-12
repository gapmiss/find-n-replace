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
        replaceSelectedCallback: () => Promise<void>,
        replaceAllVaultCallback: () => Promise<void>,
        performSearchCallback: () => Promise<void>,
        selectionManager?: SelectionManager
    ) {
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'SearchToolbar');
        this.selectionManager = selectionManager as SelectionManager;
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
     * Sets the SelectionManager after construction
     * Required due to circular dependency between SearchToolbar and SelectionManager during initialization.
     *
     * @param {SelectionManager} selectionManager - The selection manager instance to use for multi-selection state
     *
     * @remarks
     * This method exists to break the circular dependency during view initialization:
     * - SearchToolbar needs SelectionManager for ellipsis menu state
     * - SelectionManager needs elements created by SearchToolbar
     * - Solution: Create SearchToolbar first, then inject SelectionManager reference
     */
    setSelectionManager(selectionManager: SelectionManager): void {
        this.selectionManager = selectionManager;
        this.logger.debug('SelectionManager set after construction');
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
     * Required due to initialization order where ActionHandler is created after SearchToolbar.
     *
     * @param {function} replaceSelectedCallback - Function to call when user requests replacing selected matches
     * @param {function} replaceAllVaultCallback - Function to call when user requests replacing all matches in vault
     *
     * @remarks
     * This method updates the callbacks used by the ellipsis menu:
     * - SearchToolbar creates UI during view initialization
     * - ActionHandler is created later with actual replacement logic
     * - This method links the two components together
     * - Called once during FindReplaceView initialization
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
     * Creates the root container element that holds all search UI components.
     *
     * @param {HTMLElement} containerEl - Parent element to attach the toolbar to
     * @returns {HTMLElement} The created toolbar container element
     *
     * @remarks
     * This is the first method called during UI construction. The returned element serves as
     * the parent for all subsequent search UI elements (search input, replace input, filters, etc.)
     */
    createMainToolbar(containerEl: HTMLElement): HTMLElement {
        return containerEl.createDiv('find-replace-search-toolbar');
    }

    /**
     * Creates the search input row with inline options
     * Builds the complete search input UI including text input, toggle buttons, and history navigation.
     *
     * @param {HTMLElement} searchToolbar - The toolbar container to attach the search row to
     * @returns {SearchInputElements} Object containing all created search-related UI elements
     * @returns {HTMLInputElement} returns.searchInput - The main search text input field
     * @returns {HTMLButtonElement} returns.searchClearBtn - Clear button for search input
     * @returns {HTMLElement} returns.matchCaseBtn - Case-sensitive toggle button
     * @returns {HTMLElement} returns.wholeWordBtn - Whole word matching toggle button
     * @returns {HTMLElement} returns.regexBtn - Regular expression mode toggle button
     * @returns {HTMLElement} returns.multilineBtn - Multiline regex mode toggle button
     *
     * @remarks
     * **Features:**
     * - Search icon prefix using Lucide icons
     * - Clear button (X) that appears when input has content
     * - History navigation (↑↓ arrows) for previous searches
     * - Four inline toggle buttons for search options
     * - Complete keyboard navigation with proper tab order
     * - Placeholder shows history navigation hint
     *
     * **Toggle Buttons:**
     * - Initial state loaded from settings if "Remember Search Options" enabled
     * - Auto-search triggered when toggles change (if query exists)
     * - State saved to settings when changed (if remember option enabled)
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
     * Builds the complete replace input UI including text input, action buttons, and history navigation.
     *
     * @param {HTMLElement} searchToolbar - The toolbar container to attach the replace row to
     * @returns {ReplaceInputElements} Object containing all created replace-related UI elements
     * @returns {HTMLInputElement} returns.replaceInput - The main replace text input field
     * @returns {HTMLButtonElement} returns.replaceClearBtn - Clear button for replace input
     * @returns {HTMLButtonElement} returns.clearAllBtn - Button to clear all search/replace inputs and reset options
     * @returns {HTMLButtonElement} returns.filterBtn - Button to toggle file filter panel visibility
     *
     * @remarks
     * **Features:**
     * - Replace icon prefix using Lucide icons
     * - Clear button (X) that appears when input has content
     * - History navigation (↑↓ arrows) for previous replace patterns
     * - Clear All button (search-x icon) to reset entire search UI
     * - Filter button to show/hide file filtering panel
     * - Complete keyboard navigation with proper tab order
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
     * Builds the file filtering UI with include/exclude pattern inputs matching VSCode's interface.
     *
     * @param {HTMLElement} searchToolbar - The toolbar container to attach the filter panel to
     * @returns {FilterPanelElements} Object containing all created filter panel UI elements
     * @returns {HTMLElement} returns.filterPanel - The main expandable filter panel container (starts hidden)
     * @returns {HTMLInputElement} returns.includeInput - Input field for "files to include" patterns
     * @returns {HTMLButtonElement} returns.includeClearBtn - Clear button for include input
     * @returns {HTMLInputElement} returns.excludeInput - Input field for "files to exclude" patterns
     * @returns {HTMLButtonElement} returns.excludeClearBtn - Clear button for exclude input
     *
     * @remarks
     * **VSCode-Style Features:**
     * - Two-row layout: "files to include" and "files to exclude"
     * - Clear buttons (X) for each input field
     * - Pattern syntax hints in placeholders
     * - Session-only filter state (doesn't modify settings)
     * - Settings provide default values on view initialization
     *
     * **Pattern Examples:**
     * - Include: `.md, .txt` (extensions), `Notes/` (folders), `*.js` (globs)
     * - Exclude: `*.tmp` (patterns), `Archive/` (folders), `*backup*` (globs)
     *
     * **Behavior:**
     * - Panel toggles visibility via filter button
     * - Changes trigger debounced search refresh (500ms)
     * - Enter key triggers immediate search
     * - Filter button shows active state and count badge
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
     * Builds the main container element that will hold all search result items.
     *
     * @param {HTMLElement} containerEl - Parent element to attach the results container to
     * @returns {HTMLElement} The created results container element
     *
     * @remarks
     * This container is populated by UIRenderer with search results organized by file.
     * The container is focusable (tabindex: 12) and serves as the target for keyboard navigation
     * from the adaptive toolbar.
     * Initially hidden until results are rendered.
     */
    createResultsContainer(containerEl: HTMLElement): HTMLElement {
        return containerEl.createDiv({
            cls: 'find-replace-results hidden',
            attr: { 'tabindex': '12' }
        });
    }

    /**
     * Creates the adaptive results toolbar
     * Builds the contextual toolbar that appears when search results exist, showing result counts and actions.
     *
     * @param {HTMLElement} searchToolbar - The toolbar container to attach the adaptive toolbar to
     * @returns {AdaptiveToolbarElements} Object containing all created adaptive toolbar UI elements
     * @returns {HTMLElement} returns.adaptiveToolbar - The main adaptive toolbar container (starts hidden)
     * @returns {HTMLElement} returns.resultsCountEl - Span displaying total result count
     * @returns {HTMLElement} returns.selectedCountEl - Span displaying selected result count (hidden when none selected)
     * @returns {HTMLButtonElement} returns.ellipsisMenuBtn - Menu button for replace actions (starts disabled)
     * @returns {HTMLButtonElement} returns.toolbarBtn - Expand/collapse all button
     *
     * @remarks
     * **Visibility:**
     * - Toolbar hidden by default (no results)
     * - Shown automatically when search results exist
     * - Hidden again when results cleared
     *
     * **Result Counts:**
     * - resultsCountEl: Shows "X results" or "X results (limited to Y)"
     * - selectedCountEl: Shows "• X selected" only when items selected
     *
     * **Ellipsis Menu:**
     * - Contains "Replace Selected" and "Replace All in Vault" actions
     * - Also includes "Help" menu item
     * - Disabled when no results exist
     * - "Replace Selected" disabled when no items selected
     *
     * **Expand/Collapse Button:**
     * - Toggles expand/collapse state for all file groups
     * - Icon changes between copy-plus (expand) and copy-minus (collapse)
     * - State saved to session and optionally to disk
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
     * Sets up filter button toggle functionality
     * Configures the filter button to show/hide the filter panel and manages filter state changes.
     *
     * @param {HTMLButtonElement} filterBtn - The filter button to set up click handling for
     * @param {HTMLElement} filterPanel - The filter panel to show/hide
     * @param {HTMLInputElement} includeInput - The "files to include" input field
     * @param {HTMLInputElement} excludeInput - The "files to exclude" input field
     *
     * @remarks
     * **Button Click Behavior:**
     * - Toggles filter panel visibility
     * - Focuses include input when panel opens
     * - Hides panel when clicked again
     *
     * **Filter Changes:**
     * - Debounced search refresh (500ms delay) on input changes
     * - Immediate search on Enter key press
     * - Session filters updated (settings NOT modified)
     * - Filter button shows active state and count badge
     *
     * **Initialization:**
     * - Loads session filter values into inputs from settings defaults
     * - Updates filter button visual state based on active filters
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
     * Creates session filters from current session filter inputs
     * Parses filter input values into structured SessionFilters object for SearchEngine.
     * **IMPORTANT:** This method does NOT modify plugin settings - filters are session-only.
     *
     * @returns {SessionFilters} Structured filter object with parsed patterns
     * @returns {string[]} returns.fileExtensions - Extensions from include patterns (e.g., ["md", "txt"])
     * @returns {string[]} returns.searchInFolders - Folders from include patterns (e.g., ["Notes", "Projects"])
     * @returns {string[]} returns.includePatterns - Glob patterns from include input (e.g., ["*.js"])
     * @returns {string[]} returns.excludePatterns - Glob patterns from exclude input (e.g., ["*.tmp"])
     * @returns {string[]} returns.excludeFolders - Folders from exclude patterns (e.g., ["Archive"])
     *
     * @remarks
     * **Pattern Parsing:**
     * - `.md` → fileExtensions array (dot removed)
     * - `Notes/` → searchInFolders or excludeFolders (trailing slash removed)
     * - `*.js` → includePatterns or excludePatterns (contains wildcards)
     *
     * **Session-Only Behavior:**
     * - Reads from sessionFilters property (in-memory state)
     * - Settings provide initial defaults, but changes are temporary
     * - Close and reopen view to load fresh defaults from settings
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
     * Configures keyboard navigation from expand/collapse button to first search result.
     *
     * @param {HTMLButtonElement} expandCollapseBtn - The expand/collapse button to set up navigation for
     * @param {HTMLElement} resultsContainer - The results container to navigate to
     *
     * @remarks
     * **Tab Navigation:**
     * - Tab key moves focus from expand/collapse button to first focusable result
     * - Shift+Tab moves back naturally via DOM order
     * - Ensures smooth keyboard navigation flow through entire UI
     *
     * **Focusable Results:**
     * - Searches for first `.snippet` or `[role="button"]` element
     * - Prevents default tab behavior to control focus precisely
     * - Only activates if focusable result exists
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
     * Configures clear (X) buttons for all text inputs with contextual visibility and focus management.
     *
     * @param {HTMLInputElement} searchInput - The search input field
     * @param {HTMLButtonElement} searchClearBtn - Clear button for search input
     * @param {HTMLInputElement} replaceInput - The replace input field
     * @param {HTMLButtonElement} replaceClearBtn - Clear button for replace input
     * @param {HTMLInputElement} includeInput - The "files to include" input field
     * @param {HTMLButtonElement} includeClearBtn - Clear button for include input
     * @param {HTMLInputElement} excludeInput - The "files to exclude" input field
     * @param {HTMLButtonElement} excludeClearBtn - Clear button for exclude input
     * @param {function} [onInputChange] - Optional callback triggered when any input is cleared
     *
     * @remarks
     * **Clear Button Behavior:**
     * - Shows when input has content (via 'visible' class)
     * - Hides when input is empty
     * - Clicking clears input and restores focus
     * - Triggers input event for downstream handlers
     *
     * **User Experience:**
     * - Professional VSCode-style clear icons
     * - Contextual visibility (only when needed)
     * - Smooth CSS transitions via styles.css
     * - Focus management ensures keyboard accessibility
     *
     * **Initialization:**
     * - Sets initial visibility state for all inputs
     * - Attaches event listeners for input changes
     * - Configures click handlers for clear buttons
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
        // Determine initial state from settings if "Remember Search Options" is enabled
        let initialPressed = false;
        if (this.plugin.settings.rememberSearchOptions) {
            const lastOptions = this.plugin.settings.lastSearchOptions;
            switch (id) {
                case 'match-case':
                    initialPressed = lastOptions.matchCase;
                    break;
                case 'whole-word':
                    initialPressed = lastOptions.wholeWord;
                    break;
                case 'regex':
                    initialPressed = lastOptions.useRegex;
                    break;
                case 'multiline':
                    initialPressed = lastOptions.multiline;
                    break;
            }
        }

        const toggle = container.createEl('button', {
            cls: 'inline-toggle-btn clickable-icon',
            attr: {
                'aria-label': label,
                'data-toggle': id,
                'aria-pressed': initialPressed.toString(),
                'tabindex': tabIndex?.toString() || '0'
            }
        });

        // Set initial active state if pressed
        if (initialPressed) {
            toggle.classList.add('is-active');
        }

        setIcon(toggle, icon);

        // Handle toggle state changes
        toggle.addEventListener('click', async () => {
            const isPressed = toggle.getAttribute('aria-pressed') === 'true';
            const newPressed = !isPressed;
            toggle.setAttribute('aria-pressed', newPressed.toString());
            toggle.classList.toggle('is-active', newPressed);

            // Save to settings if "Remember Search Options" is enabled
            if (this.plugin.settings.rememberSearchOptions) {
                switch (id) {
                    case 'match-case':
                        this.plugin.settings.lastSearchOptions.matchCase = newPressed;
                        break;
                    case 'whole-word':
                        this.plugin.settings.lastSearchOptions.wholeWord = newPressed;
                        break;
                    case 'regex':
                        this.plugin.settings.lastSearchOptions.useRegex = newPressed;
                        break;
                    case 'multiline':
                        this.plugin.settings.lastSearchOptions.multiline = newPressed;
                        break;
                }
                await this.plugin.saveSettings();
                this.logger.debug(`Saved search option: ${id} = ${newPressed}`);
            }

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
                    .setDisabled(!this.selectionManager || this.selectionManager.getSelectedIndices().size === 0)
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