import { FindReplaceElements, PerformSearchCallback } from '../../types';
import { Logger, safeQuerySelector, isNotNull } from '../../utils';
import VaultFindReplacePlugin from '../../main';

/**
 * Handles keyboard navigation and input management for the find/replace interface
 */
export class NavigationHandler {
    private elements: FindReplaceElements;
    private performSearchCallback: PerformSearchCallback;
    private logger: Logger;

    constructor(elements: FindReplaceElements, performSearchCallback: PerformSearchCallback, plugin: VaultFindReplacePlugin) {
        this.elements = elements;
        this.performSearchCallback = performSearchCallback;
        this.logger = Logger.create(plugin, 'NavigationHandler');
    }

    /**
     * Sets up keyboard shortcuts and navigation for the interface
     */
    setupKeyboardNavigation(): void {
        this.setupEnterKeyHandlers();
        this.setupClearButtonHandlers();
        this.setupInputChangeHandlers();
        this.setupGlobalKeyboardShortcuts();
    }

    /**
     * Sets up Enter key handlers for search inputs and checkboxes
     */
    private setupEnterKeyHandlers(): void {
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
                    await this.performSearchCallback();
                }
            });
        });
    }

    /**
     * Sets up clear button functionality for input fields
     */
    private setupClearButtonHandlers(): void {
        const clearBtns = this.elements.containerEl.querySelectorAll<HTMLButtonElement>(".clear-btn");
        clearBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const input = btn.previousElementSibling;

                if (!(input instanceof HTMLInputElement)) {
                    this.logger.warn('Clear button clicked but previous sibling is not an input element');
                    return;
                }

                this.logger.debug('Clearing input field');
                input.value = "";
                input.dispatchEvent(new Event("input"));
                input.focus();
            });
        });
    }

    /**
     * Sets up input change handlers for dynamic updates
     */
    private setupInputChangeHandlers(): void {
        // Re-render results when replacement text changes (to show preview)
        this.elements.replaceInput.addEventListener("input", () => {
            // This will be handled by the main view to trigger re-rendering
            this.elements.replaceInput.dispatchEvent(new CustomEvent('replace-text-changed'));
        });

        // Note: Auto-search is now handled in the main view to avoid callback issues
    }

    /**
     * Sets up global keyboard shortcuts for the interface
     */
    private setupGlobalKeyboardShortcuts(): void {
        // Add event listener to the container for global shortcuts
        this.elements.containerEl.addEventListener('keydown', (event) => {
            this.handleGlobalKeyboardShortcut(event);
        });
    }

    /**
     * Handles global keyboard shortcuts
     * @param event - The keyboard event
     * @returns true if the event was handled
     */
    handleGlobalKeyboardShortcut(event: KeyboardEvent): boolean {
        // Ctrl/Cmd + F: Focus search input
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            this.elements.searchInput.focus();
            this.elements.searchInput.select();
            return true;
        }

        // Ctrl/Cmd + H: Focus replace input
        if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
            event.preventDefault();
            this.elements.replaceInput.focus();
            this.elements.replaceInput.select();
            return true;
        }

        // F3 or Ctrl/Cmd + G: Find next (perform search)
        if (event.key === 'F3' || ((event.ctrlKey || event.metaKey) && event.key === 'g')) {
            event.preventDefault();
            this.performSearchCallback();
            return true;
        }

        // Ctrl/Cmd + Enter: Replace all
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (!this.elements.replaceAllVaultBtn.disabled) {
                this.elements.replaceAllVaultBtn.click();
            }
            return true;
        }

        // Alt + Enter: Replace selected
        if (event.altKey && event.key === 'Enter') {
            event.preventDefault();
            if (!this.elements.replaceSelectedBtn.disabled) {
                this.elements.replaceSelectedBtn.click();
            }
            return true;
        }

        return false;
    }

    /**
     * Creates option checkboxes with simple, working pattern
     * @param parent - Parent element to attach the option to
     * @param label - Display text for the option
     * @param id - Unique identifier for this option
     * @returns The container element for this option
     */
    createOption(parent: HTMLElement, label: string, id: string): HTMLElement {
        const toggleContainer = parent.createDiv('toggle-container');

        // Create simple label with checkbox - this pattern works without freezing
        const labelElement = toggleContainer.createEl('label');

        // Create the actual checkbox input first
        const checkbox = labelElement.createEl(
            'input',
            {
                cls: 'toggle-checkbox',
                attr: {
                    type: 'checkbox',
                    id: `toggle-${id}-checkbox`
                }
            }
        );

        if (!(checkbox instanceof HTMLInputElement)) {
            this.logger.error(`Failed to create checkbox input for ${id}`);
            return toggleContainer;
        }

        // Add label text after checkbox
        labelElement.createSpan({ text: ` ${label}` });

        return toggleContainer;
    }

    /**
     * Focuses the search input and selects its content
     */
    focusSearchInput(): void {
        this.elements.searchInput.focus();
        this.elements.searchInput.select();
    }

    /**
     * Focuses the replace input and selects its content
     */
    focusReplaceInput(): void {
        this.elements.replaceInput.focus();
        this.elements.replaceInput.select();
    }

    /**
     * Gets the current state of search options from checkboxes
     * @returns Object with current option states
     */
    getSearchOptions(): { matchCase: boolean; wholeWord: boolean; useRegex: boolean } {
        return {
            matchCase: this.getCheckboxValue(this.elements.matchCaseCheckbox, '#toggle-match-case-checkbox'),
            wholeWord: this.getCheckboxValue(this.elements.wholeWordCheckbox, '#toggle-whole-word-checkbox'),
            useRegex: this.getCheckboxValue(this.elements.regexCheckbox, '#toggle-regex-checkbox')
        };
    }

    /**
     * Safely gets checkbox value with proper error handling
     */
    private getCheckboxValue(container: HTMLElement, selector: string): boolean {
        const checkbox = safeQuerySelector<HTMLInputElement>(container, selector, this.logger, false);
        if (!checkbox) {
            this.logger.warn(`Checkbox not found: ${selector}, defaulting to false`);
            return false;
        }
        return checkbox.checked;
    }

    /**
     * Sets the state of search options checkboxes
     * @param options - Options to set
     */
    setSearchOptions(options: { matchCase?: boolean; wholeWord?: boolean; useRegex?: boolean }): void {
        if (options.matchCase !== undefined) {
            this.setCheckboxValue(this.elements.matchCaseCheckbox, '#toggle-match-case-checkbox', options.matchCase);
        }

        if (options.wholeWord !== undefined) {
            this.setCheckboxValue(this.elements.wholeWordCheckbox, '#toggle-whole-word-checkbox', options.wholeWord);
        }

        if (options.useRegex !== undefined) {
            this.setCheckboxValue(this.elements.regexCheckbox, '#toggle-regex-checkbox', options.useRegex);
        }
    }

    /**
     * Safely sets checkbox value with proper error handling
     */
    private setCheckboxValue(container: HTMLElement, selector: string, value: boolean): void {
        const checkbox = safeQuerySelector<HTMLInputElement>(container, selector, this.logger, false);
        if (checkbox) {
            checkbox.checked = value;
            this.logger.debug(`Set checkbox ${selector} to ${value}`);
        } else {
            this.logger.warn(`Cannot set checkbox ${selector}: not found`);
        }
    }

    /**
     * Adds tab navigation between search and replace inputs
     */
    setupTabNavigation(): void {
        this.elements.searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Tab' && !event.shiftKey) {
                event.preventDefault();
                this.elements.replaceInput.focus();
            }
        });

        this.elements.replaceInput.addEventListener('keydown', (event) => {
            if (event.key === 'Tab' && event.shiftKey) {
                event.preventDefault();
                this.elements.searchInput.focus();
            }
        });
    }

    /**
     * Validates search input and provides visual feedback
     * @param query - Search query to validate
     * @param useRegex - Whether regex mode is enabled
     * @returns true if valid, false otherwise
     */
    validateAndIndicateSearchInput(query: string, useRegex: boolean): boolean {
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