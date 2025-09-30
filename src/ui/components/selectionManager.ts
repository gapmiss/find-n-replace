import { FindReplaceElements } from '../../types';
import { SearchResult } from '../../types/search';
import { Logger } from '../../utils';
import VaultFindReplacePlugin from '../../main';

/**
 * Handles multi-selection functionality for search results
 */
export class SelectionManager {
    private elements: FindReplaceElements;
    private plugin: VaultFindReplacePlugin;
    private logger: Logger;
    private selectedIndices: Set<number> = new Set();
    private lineElements: HTMLDivElement[] = [];

    constructor(elements: FindReplaceElements, plugin: VaultFindReplacePlugin) {
        this.elements = elements;
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'SelectionManager');
    }

    /**
     * Sets up keyboard navigation and multi-selection functionality for results
     * Attaches click handlers for multi-selection and optionally preserves existing selection state.
     *
     * @param {HTMLDivElement[]} lineElements - Array of DOM elements for result lines
     * @param {boolean} [preserveSelection=false] - Whether to preserve existing selection state
     *
     * @remarks
     * **Selection Behavior:**
     * - Ctrl/Cmd+Click toggles selection for individual results
     * - Selection state persists across search refreshes when preserveSelection=true
     * - Visual feedback via 'selected' CSS class
     * - Selected count display updated in adaptive toolbar
     *
     * **Preservation Use Cases:**
     * - Replace text changes: preserveSelection=true (maintains user selections)
     * - New search query: preserveSelection=false (clears previous selections)
     * - Search option changes: preserveSelection=false (fresh results)
     *
     * **Event Handling:**
     * - Click handlers attached to each result line element
     * - Modifier key detection (metaKey for Mac, ctrlKey for Windows/Linux)
     * - Default link behavior prevented during multi-selection
     */
    setupSelection(lineElements: HTMLDivElement[], preserveSelection: boolean = false): void {
        this.lineElements = lineElements;

        // Only clear selections if not preserving them
        if (!preserveSelection) {
            this.selectedIndices.clear();
        }

        if (!lineElements.length) return;

        // Add click handlers to each result line for multi-selection
        lineElements.forEach((el, idx) => {
            el.addEventListener('click', (e: MouseEvent) => {
                // Check for modifier keys (Ctrl on Windows/Linux, Cmd on Mac)
                if (e.metaKey || e.ctrlKey) {
                    e.preventDefault(); // Prevent default link behavior
                    this.toggleSelection(idx);
                }
            });
        });

        // Update UI to reflect current selection state (preserving if requested)
        this.updateSelectionUI();
    }

    /**
     * Toggles selection state for a specific result index
     * Adds index to selection if not selected, removes if already selected.
     *
     * @param {number} index - Index of the result to toggle (zero-based)
     *
     * @remarks
     * This method is called when user Ctrl/Cmd+Clicks on a result line.
     * Updates selection state and refreshes UI to reflect the change.
     */
    toggleSelection(index: number): void {
        if (this.selectedIndices.has(index)) {
            this.selectedIndices.delete(index);
        } else {
            this.selectedIndices.add(index);
        }
        this.updateSelectionUI();
    }

    /**
     * Selects all results
     * Clears existing selection and selects every result in the current result set.
     *
     * @remarks
     * **Triggered By:**
     * - Ctrl/Cmd+A keyboard shortcut
     * - Command palette: "Select All Results"
     * - Programmatic selection
     *
     * **Behavior:**
     * - Clears existing selection first
     * - Selects all indices from 0 to lineElements.length-1
     * - Updates UI to show all results as selected
     * - Updates selected count display in adaptive toolbar
     */
    selectAll(): void {
        this.selectedIndices.clear();
        for (let i = 0; i < this.lineElements.length; i++) {
            this.selectedIndices.add(i);
        }
        this.updateSelectionUI();
    }

    /**
     * Clears all selections
     * Removes all selected indices and updates UI to show no selections.
     *
     * @remarks
     * **Triggered By:**
     * - Escape key (when selections exist)
     * - New search query
     * - Clear All button
     * - Programmatic clearing
     *
     * **Behavior:**
     * - Removes all indices from selection set
     * - Updates UI to remove 'selected' class from all elements
     * - Hides selected count display in adaptive toolbar
     */
    clearSelection(): void {
        this.selectedIndices.clear();
        this.updateSelectionUI();
    }

    /**
     * Gets the currently selected indices
     * Returns a copy of the selection set to prevent external modification.
     *
     * @returns {Set<number>} New Set containing selected indices (zero-based)
     *
     * @remarks
     * **Returns a copy** to protect internal state from external modification.
     * Used by ActionHandler for replacement operations on selected matches.
     */
    getSelectedIndices(): Set<number> {
        return new Set(this.selectedIndices);
    }

    /**
     * Gets the number of selected items
     *
     * @returns {number} Number of currently selected results
     *
     * @remarks
     * Used for displaying selection count in adaptive toolbar and validating operations.
     */
    getSelectionCount(): number {
        return this.selectedIndices.size;
    }

    /**
     * Checks if any items are selected
     *
     * @returns {boolean} True if one or more items are selected, false otherwise
     *
     * @remarks
     * Used to determine whether to show selected count display and enable "Replace Selected" menu item.
     */
    hasSelection(): boolean {
        return this.selectedIndices.size > 0;
    }

    /**
     * Checks if a specific index is selected
     *
     * @param {number} index - Index to check (zero-based)
     * @returns {boolean} True if the index is in the selection set, false otherwise
     *
     * @remarks
     * Useful for conditional styling or behavior based on selection state of individual results.
     */
    isSelected(index: number): boolean {
        return this.selectedIndices.has(index);
    }

    /**
     * Updates visual styling and UI state based on current selections
     */
    private updateSelectionUI(): void {
        // Update visual styling for each result line
        this.lineElements.forEach((el, idx) => {
            if (this.selectedIndices.has(idx)) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });

        // Update selection count display and visibility in adaptive toolbar
        if (this.elements.selectedCountEl) {
            const hasSelections = this.selectedIndices.size > 0;
            this.elements.selectedCountEl.textContent = `• ${this.selectedIndices.size} selected`;
            this.elements.selectedCountEl.classList.toggle('hidden', !hasSelections);
        }

        // Menu items are dynamically enabled/disabled when menu is created (button references removed)
    }

    /**
     * Handles keyboard shortcuts for selection
     * Processes Ctrl/Cmd+A (select all) and Escape (clear selection) keyboard shortcuts.
     *
     * @param {KeyboardEvent} event - The keyboard event to process
     * @returns {boolean} True if the event was handled and should be prevented, false otherwise
     *
     * @remarks
     * **Supported Shortcuts:**
     * - Ctrl/Cmd+A: Select all results (always handled)
     * - Escape: Clear selection (only handled if selections exist)
     *
     * **Event Handling:**
     * - Prevents default browser behavior when shortcuts are triggered
     * - Returns true to indicate event was consumed
     * - Returns false to allow event bubbling for unhandled keys
     */
    handleKeyboardShortcut(event: KeyboardEvent): boolean {
        // Ctrl/Cmd + A: Select all
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();
            this.selectAll();
            return true;
        }

        // Escape: Clear selection
        if (event.key === 'Escape') {
            if (this.hasSelection()) {
                event.preventDefault();
                this.clearSelection();
                return true;
            }
        }

        return false;
    }

    /**
     * Gets indices of selected results within a specific file
     * Filters selected indices to return only those belonging to the specified file.
     *
     * @param {string} filePath - Path of the file to filter by
     * @param {SearchResult[]} allResults - All search results for index-to-file mapping
     * @returns {number[]} Array of selected indices for the specified file
     *
     * @remarks
     * Used for file-specific operations like "Replace all in file" with selections.
     */
    getSelectedIndicesForFile(filePath: string, allResults: SearchResult[]): number[] {
        return Array.from(this.selectedIndices).filter(idx => {
            const result = allResults[idx];
            return result?.file?.path === filePath;
        });
    }

    /**
     * Selects all results for a specific file
     * Adds all result indices belonging to the specified file to the selection.
     *
     * @param {string} filePath - Path of the file
     * @param {SearchResult[]} allResults - All search results for index-to-file mapping
     *
     * @remarks
     * Useful for bulk operations on a single file's results.
     * Preserves existing selections for other files.
     */
    selectAllInFile(filePath: string, allResults: SearchResult[]): void {
        allResults.forEach((result, idx) => {
            if (result.file.path === filePath) {
                this.selectedIndices.add(idx);
            }
        });
        this.updateSelectionUI();
    }

    /**
     * Deselects all results for a specific file
     * Removes all result indices belonging to the specified file from the selection.
     *
     * @param {string} filePath - Path of the file
     * @param {SearchResult[]} allResults - All search results for index-to-file mapping
     *
     * @remarks
     * Opposite of selectAllInFile(). Preserves selections for other files.
     */
    deselectAllInFile(filePath: string, allResults: SearchResult[]): void {
        allResults.forEach((result, idx) => {
            if (result.file.path === filePath) {
                this.selectedIndices.delete(idx);
            }
        });
        this.updateSelectionUI();
    }

    /**
     * Selects a range of results
     * Selects all indices from startIndex to endIndex (inclusive), regardless of order.
     *
     * @param {number} startIndex - Starting index (inclusive, zero-based)
     * @param {number} endIndex - Ending index (inclusive, zero-based)
     *
     * @remarks
     * **Range Handling:**
     * - Automatically determines min and max (order doesn't matter)
     * - Inclusive on both ends
     * - Bounds checking prevents out-of-range selection
     *
     * **Use Cases:**
     * - Shift+Click range selection (future feature)
     * - Programmatic bulk selection
     */
    selectRange(startIndex: number, endIndex: number): void {
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);

        for (let i = start; i <= end && i < this.lineElements.length; i++) {
            this.selectedIndices.add(i);
        }
        this.updateSelectionUI();
    }

    /**
     * Inverts the current selection
     * Selects all currently unselected results and deselects all currently selected results.
     *
     * @remarks
     * **Behavior:**
     * - Unselected results become selected
     * - Selected results become unselected
     * - Total selection count = lineElements.length - previous count
     *
     * **Use Cases:**
     * - Quick selection inversion for bulk operations
     * - "Select everything except..." workflows
     */
    invertSelection(): void {
        const newSelection = new Set<number>();
        for (let i = 0; i < this.lineElements.length; i++) {
            if (!this.selectedIndices.has(i)) {
                newSelection.add(i);
            }
        }
        this.selectedIndices = newSelection;
        this.updateSelectionUI();
    }

    /**
     * Adjusts selection indices when results are removed from the array
     * Recalculates selected indices after removals to maintain correct references.
     *
     * @param {number[]} removedIndices - Array of indices that were removed (must be sorted in descending order)
     *
     * @remarks
     * **Critical for Replacement Operations:**
     * - After replacements, some results are removed from the array
     * - Indices shift down to fill gaps
     * - This method recalculates selection to match new positions
     *
     * **Algorithm:**
     * - For each selected index, count how many removed indices were before it
     * - Subtract that count from the index to get new position
     * - Skip indices that were themselves removed
     *
     * **Requirements:**
     * - removedIndices MUST be sorted in descending order for correct calculation
     *
     * **Example:**
     * - Original selection: [1, 3, 5]
     * - Removed indices: [2, 4]
     * - New selection: [1, 2, 3] (indices 3 and 5 shifted down)
     */
    adjustSelectionForRemovedIndices(removedIndices: number[]): void {
        const newSelection = new Set<number>();

        // For each selected index, calculate its new position after removals
        for (const selectedIndex of Array.from(this.selectedIndices)) {
            // Count how many indices were removed before this selected index
            const removedBeforeCount = removedIndices.filter(removedIndex => removedIndex < selectedIndex).length;

            // Check if this selected index was itself removed
            const wasRemoved = removedIndices.includes(selectedIndex);

            if (!wasRemoved) {
                // Adjust the index by subtracting the number of removed indices before it
                const newIndex = selectedIndex - removedBeforeCount;
                newSelection.add(newIndex);
            }
            // If the index was removed, don't add it to the new selection
        }

        this.selectedIndices = newSelection;
        this.updateSelectionUI();

        // Log the adjustment for debugging
        this.logger.debug('Selection adjusted for removed indices:', {
            removedIndices,
            oldSelectionSize: this.selectedIndices.size + removedIndices.filter(idx => this.selectedIndices.has(idx)).length,
            newSelectionSize: this.selectedIndices.size
        });
    }

    /**
     * Resets the selection manager
     * Clears all selections and element references without disposing the manager.
     *
     * @remarks
     * **Use Cases:**
     * - Preparing for new search results
     * - Clearing state without destroying the manager
     *
     * **Difference from dispose():**
     * - reset(): Clears state but keeps manager functional
     * - dispose(): Full cleanup for destruction
     */
    reset(): void {
        this.selectedIndices.clear();
        this.lineElements = [];
        this.updateSelectionUI();
    }

    /**
     * Cleanup method for when the selection manager is no longer needed
     * Clears all selections, elements, and references to prevent memory leaks.
     *
     * @remarks
     * **Cleanup Actions:**
     * - Clears selection set
     * - Clears line elements array
     * - Nullifies element references for garbage collection
     *
     * **When Called:**
     * - View is closed by user
     * - Plugin is unloaded
     * - View is destroyed during Obsidian shutdown
     *
     * **Memory Management:**
     * - Essential for preventing memory leaks
     * - Breaks circular references
     * - Allows proper garbage collection
     *
     * **Difference from reset():**
     * - dispose(): Full cleanup for destruction (nullifies references)
     * - reset(): State clearing while keeping manager functional
     */
    dispose(): void {
        this.selectedIndices.clear();
        this.lineElements = [];
        // Clear reference to elements for garbage collection
        this.elements = null as any;
    }
}