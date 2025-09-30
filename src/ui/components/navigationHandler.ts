import { FindReplaceElements, PerformSearchCallback } from '../../types';
import { Logger } from '../../utils';
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

        // Ctrl/Cmd + Enter: Replace all (trigger ellipsis menu or direct action)
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (!this.elements.ellipsisMenuBtn.disabled) {
                // Trigger the replace all action directly since buttons are removed
                // The actual implementation will need to be handled by the view
                this.elements.ellipsisMenuBtn.dispatchEvent(new CustomEvent('replace-all-vault'));
            }
            return true;
        }

        // Alt + Enter: Replace selected (trigger ellipsis menu or direct action)
        if (event.altKey && event.key === 'Enter') {
            event.preventDefault();
            if (!this.elements.ellipsisMenuBtn.disabled) {
                // Trigger the replace selected action directly since buttons are removed
                // The actual implementation will need to be handled by the view
                this.elements.ellipsisMenuBtn.dispatchEvent(new CustomEvent('replace-selected'));
            }
            return true;
        }

        return false;
    }

}