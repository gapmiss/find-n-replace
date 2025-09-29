import { Logger } from '../../utils';
import VaultFindReplacePlugin from '../../main';

/**
 * Manages arrow key navigation through input history
 * Implements VSCode-style up/down arrow history navigation with draft preservation
 */
export class HistoryNavigator {
    private plugin: VaultFindReplacePlugin;
    private logger: Logger;
    private input: HTMLInputElement | null = null;
    private history: string[] = [];
    private currentIndex: number = -1; // -1 means not in history mode
    private draft: string = ''; // Saves current input when entering history mode
    private isNavigating: boolean = false; // Prevent feedback loop

    constructor(plugin: VaultFindReplacePlugin) {
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'HistoryNavigator');
    }

    /**
     * Attaches the navigator to an input element with its history
     * @param input - The input element to attach to
     * @param history - The history array to navigate (reference, not copy)
     */
    attachTo(input: HTMLInputElement, getHistory: () => string[]): void {
        this.input = input;
        this.history = getHistory(); // Initial load

        // Set up keyboard event listener
        input.addEventListener('keydown', (e) => this.handleKeyDown(e, getHistory));

        // Reset history position when user manually types
        input.addEventListener('input', (e) => {
            if (!this.isNavigating) {
                this.resetPosition();
            }
        });

        this.logger.debug('HistoryNavigator attached to input');
    }

    /**
     * Handles keyboard events for history navigation
     */
    private handleKeyDown(e: KeyboardEvent, getHistory: () => string[]): void {
        if (!this.input) return;

        // Update history reference (may have changed)
        this.history = getHistory();

        // Only handle up/down arrows
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateUp();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.navigateDown();
        } else if (e.key === 'Escape') {
            // ESC key: exit history mode and restore draft
            if (this.currentIndex !== -1) {
                e.preventDefault();
                this.restoreDraft();
            }
        }
    }

    /**
     * Navigate to previous (older) history entry
     */
    private navigateUp(): void {
        if (!this.input || this.history.length === 0) {
            this.logger.debug('No history available for up navigation');
            return;
        }

        // First time pressing up: save current input as draft
        if (this.currentIndex === -1) {
            this.draft = this.input.value;
            this.currentIndex = 0;
            this.logger.debug('Saved draft:', this.draft);
        } else if (this.currentIndex < this.history.length - 1) {
            // Move to older entry
            this.currentIndex++;
        } else {
            // Already at oldest entry
            this.logger.debug('Already at oldest history entry');
            return;
        }

        this.updateInputFromHistory();
    }

    /**
     * Navigate to next (newer) history entry
     */
    private navigateDown(): void {
        if (!this.input || this.currentIndex === -1) {
            this.logger.debug('Not in history mode, down arrow has no effect');
            return;
        }

        if (this.currentIndex > 0) {
            // Move to newer entry
            this.currentIndex--;
            this.updateInputFromHistory();
        } else {
            // Back to draft (newest position)
            this.restoreDraft();
        }
    }

    /**
     * Updates input value from current history position
     */
    private updateInputFromHistory(): void {
        if (!this.input || this.currentIndex < 0 || this.currentIndex >= this.history.length) {
            return;
        }

        this.isNavigating = true;
        this.input.value = this.history[this.currentIndex];
        this.isNavigating = false;

        this.logger.debug(`History navigation: index=${this.currentIndex}, value="${this.input.value}"`);
    }

    /**
     * Restores the draft and exits history mode
     */
    private restoreDraft(): void {
        if (!this.input) return;

        this.isNavigating = true;
        this.input.value = this.draft;
        this.isNavigating = false;

        this.currentIndex = -1;
        this.logger.debug('Restored draft and exited history mode:', this.draft);
    }

    /**
     * Resets history position when user manually edits
     */
    private resetPosition(): void {
        if (this.currentIndex !== -1) {
            this.currentIndex = -1;
            this.draft = '';
            this.logger.debug('Reset history position due to manual input');
        }
    }

    /**
     * Gets the current history position (-1 if not in history mode)
     */
    getCurrentIndex(): number {
        return this.currentIndex;
    }

    /**
     * Checks if currently navigating history
     */
    isInHistoryMode(): boolean {
        return this.currentIndex !== -1;
    }

    /**
     * Detaches the navigator (cleanup)
     */
    detach(): void {
        this.input = null;
        this.history = [];
        this.resetPosition();
        this.logger.debug('HistoryNavigator detached');
    }
}