import { setIcon, Menu } from 'obsidian';
import { Logger } from '../../utils';
import VaultFindReplacePlugin from '../../main';
import { SelectionManager } from './selectionManager';

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

        return {
            replaceInput,
            clearAllBtn
        };
    }

    /**
     * Creates the results container
     */
    createResultsContainer(containerEl: HTMLElement): HTMLElement {
        return containerEl.createDiv('find-replace-results');
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
                'tabindex': '7'
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
                'tabindex': '10'
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
        // Handle tab navigation from clear button to adaptive toolbar
        clearAllBtn.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                // Tab forward to first adaptive toolbar button (if visible), then to results
                const firstAdaptiveButton = adaptiveToolbar.querySelector('.adaptive-action-btn:not(.hidden)') as HTMLElement;
                if (firstAdaptiveButton) {
                    e.preventDefault();
                    firstAdaptiveButton.focus();
                } else {
                    // If no adaptive toolbar visible, go to first result
                    const firstFocusableResult = resultsContainer.querySelector('.snippet, [role="button"]') as HTMLElement;
                    if (firstFocusableResult) {
                        e.preventDefault();
                        firstFocusableResult.focus();
                    }
                }
            }
        });
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
            cls: 'inline-toggle-btn',
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