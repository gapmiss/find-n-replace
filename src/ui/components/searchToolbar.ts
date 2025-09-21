import { setIcon, Menu } from 'obsidian';
import { Logger } from '../../utils';
import VaultFindReplacePlugin from '../../main';
import { SelectionManager } from './selectionManager';
import { HelpModal } from '../../modals/helpModal';

/**
 * Interface for search input elements
 */
export interface SearchInputElements {
    searchInput: HTMLInputElement;
    matchCaseBtn: HTMLElement;
    wholeWordBtn: HTMLElement;
    regexBtn: HTMLElement;
}

/**
 * Interface for replace input elements
 */
export interface ReplaceInputElements {
    replaceInput: HTMLInputElement;
    clearAllBtn: HTMLButtonElement;
    filterBtn: HTMLButtonElement;
}

/**
 * Interface for filter panel elements
 */
export interface FilterPanelElements {
    filterPanel: HTMLElement;
    includeInput: HTMLInputElement;
    excludeInput: HTMLInputElement;
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

    constructor(
        plugin: VaultFindReplacePlugin,
        selectionManager: SelectionManager,
        replaceSelectedCallback: () => Promise<void>,
        replaceAllVaultCallback: () => Promise<void>
    ) {
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'SearchToolbar');
        this.selectionManager = selectionManager;
        this.replaceSelectedCallback = replaceSelectedCallback;
        this.replaceAllVaultCallback = replaceAllVaultCallback;
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
            placeholder: 'Find',
            attr: { 'tabindex': '1' }
        }) as HTMLInputElement;

        // Inline search options (VSCode-style)
        const searchOptions = searchRow.createDiv('find-replace-inline-options');

        // Create inline toggle buttons for search options
        const matchCaseBtn = this.createInlineToggle(searchOptions, 'match-case', 'case-sensitive', 'Match Case', 3);
        const wholeWordBtn = this.createInlineToggle(searchOptions, 'whole-word', 'whole-word', 'Match Whole Word', 4);
        const regexBtn = this.createInlineToggle(searchOptions, 'regex', 'regex', 'Use Regular Expression', 5);

        return {
            searchInput,
            matchCaseBtn,
            wholeWordBtn,
            regexBtn
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
            placeholder: 'Replace',
            attr: { 'tabindex': '2' }
        }) as HTMLInputElement;

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
            text: 'Include:'
        });
        const includeInput = includeRow.createEl('input', {
            type: 'text',
            cls: 'filter-input',
            placeholder: 'files to include (e.g., .md, Notes/, *.js)',
            attr: { 'tabindex': '8' }
        }) as HTMLInputElement;

        // Exclude input row
        const excludeRow = filterPanel.createDiv('filter-input-row');
        const excludeLabel = excludeRow.createSpan({
            cls: 'filter-input-label',
            text: 'Exclude:'
        });
        const excludeInput = excludeRow.createEl('input', {
            type: 'text',
            cls: 'filter-input',
            placeholder: 'files to exclude (e.g., *.tmp, Archive/, *backup*)',
            attr: { 'tabindex': '9' }
        }) as HTMLInputElement;

        return {
            filterPanel,
            includeInput,
            excludeInput
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
                filterBtn.addClass('is-active');
                filterBtn.setAttribute('aria-pressed', 'true');
                // Focus the include input for immediate typing
                includeInput.focus();
            } else {
                filterPanel.addClass('hidden');
                filterBtn.removeClass('is-active');
                filterBtn.setAttribute('aria-pressed', 'false');
            }

            this.logger.debug('Filter panel toggled:', { visible: isFilterPanelVisible });
        });

        // Handle input changes and sync with settings
        const syncFiltersWithSettings = () => {
            const includeValue = includeInput.value.trim();
            const excludeValue = excludeInput.value.trim();

            this.logger.debug('Syncing filter inputs with settings:', { include: includeValue, exclude: excludeValue });

            // Parse include patterns
            if (includeValue) {
                const patterns = this.parseFilterPatterns(includeValue);
                this.plugin.settings.fileExtensions = patterns.extensions;
                this.plugin.settings.searchInFolders = patterns.folders;
            } else {
                this.plugin.settings.fileExtensions = [];
                this.plugin.settings.searchInFolders = [];
            }

            // Parse exclude patterns
            if (excludeValue) {
                const patterns = this.parseFilterPatterns(excludeValue);
                this.plugin.settings.excludePatterns = patterns.globs;
                this.plugin.settings.excludeFolders = patterns.folders;
            } else {
                this.plugin.settings.excludePatterns = [];
                this.plugin.settings.excludeFolders = [];
            }

            // Save settings and trigger search refresh
            this.plugin.saveSettings();

            // Update filter button visual state
            this.updateFilterButtonState(filterBtn);
        };

        // Sync on input change (debounced)
        let syncTimeout: NodeJS.Timeout;
        const debouncedSync = () => {
            clearTimeout(syncTimeout);
            syncTimeout = setTimeout(syncFiltersWithSettings, 500);
        };

        includeInput.addEventListener('input', debouncedSync);
        excludeInput.addEventListener('input', debouncedSync);

        // Load current settings into inputs
        this.loadCurrentFiltersToInputs(includeInput, excludeInput);

        // Update filter button visual state
        this.updateFilterButtonState(filterBtn);
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
            } else if (pattern.endsWith('/') || (!pattern.includes('*') && !pattern.includes('?'))) {
                // Folder (remove trailing slash if present)
                folders.push(pattern.replace(/\/$/, ''));
            } else {
                // Glob pattern
                globs.push(pattern);
            }
        });

        return { extensions, folders, globs };
    }

    /**
     * Load current filter settings into the input fields
     */
    private loadCurrentFiltersToInputs(includeInput: HTMLInputElement, excludeInput: HTMLInputElement): void {
        const settings = this.plugin.settings;

        // Build include string from extensions and folders
        const includeParts: string[] = [];
        settings.fileExtensions.forEach(ext => includeParts.push('.' + ext));
        settings.searchInFolders.forEach(folder => includeParts.push(folder));
        includeInput.value = includeParts.join(', ');

        // Build exclude string from patterns and folders
        const excludeParts: string[] = [];
        settings.excludePatterns.forEach(pattern => excludeParts.push(pattern));
        settings.excludeFolders.forEach(folder => excludeParts.push(folder));
        excludeInput.value = excludeParts.join(', ');
    }

    /**
     * Update filter button visual state to show if filters are active
     */
    private updateFilterButtonState(filterBtn: HTMLButtonElement): void {
        const settings = this.plugin.settings;

        // Check if any filters are active
        const hasActiveFilters =
            settings.fileExtensions.length > 0 ||
            settings.searchInFolders.length > 0 ||
            settings.excludePatterns.length > 0 ||
            settings.excludeFolders.length > 0;

        if (hasActiveFilters) {
            filterBtn.addClass('has-filters');
            filterBtn.setAttribute('aria-label', 'Toggle File Filters (Active)');

            // Add filter count badge if there isn't one already
            let badge = filterBtn.querySelector('.filter-badge') as HTMLElement;
            if (!badge) {
                badge = filterBtn.createSpan('filter-badge');
            }

            // Count total active filters
            const filterCount =
                settings.fileExtensions.length +
                settings.searchInFolders.length +
                settings.excludePatterns.length +
                settings.excludeFolders.length;

            badge.textContent = filterCount.toString();

            this.logger.debug('Filter button updated: active filters detected', { count: filterCount });
        } else {
            filterBtn.removeClass('has-filters');
            filterBtn.setAttribute('aria-label', 'Toggle File Filters');

            // Remove badge if it exists
            const badge = filterBtn.querySelector('.filter-badge');
            if (badge) {
                badge.remove();
            }

            this.logger.debug('Filter button updated: no active filters');
        }
    }

    /**
     * Update filter inputs when settings change (bidirectional sync)
     */
    updateFilterInputsFromSettings(includeInput: HTMLInputElement, excludeInput: HTMLInputElement, filterBtn: HTMLButtonElement): void {
        this.loadCurrentFiltersToInputs(includeInput, excludeInput);
        this.updateFilterButtonState(filterBtn);
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
     * Creates an inline toggle button (moved from FindReplaceView private method)
     */
    private createInlineToggle(container: HTMLElement, id: string, icon: string, label: string, tabIndex?: number): HTMLElement {
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
        toggle.addEventListener('click', () => {
            const isPressed = toggle.getAttribute('aria-pressed') === 'true';
            const newPressed = !isPressed;
            toggle.setAttribute('aria-pressed', newPressed.toString());
            toggle.classList.toggle('is-active', newPressed);

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
}