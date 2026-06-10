import { FindReplaceElements } from '../../types';
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
     * Selects a range of results by index
     * Adds all indices in the specified range to the selection.
     *
     * @param {number} startIndex - First index to select (inclusive)
     * @param {number} count - Number of consecutive indices to select
     *
     * @remarks
     * **Triggered By:**
     * - Ctrl/Cmd+Click on file header to select all matches in that file
     *
     * **Behavior:**
     * - Adds indices to existing selection (does not clear first)
     * - Updates UI to show newly selected results
     * - Updates selected count display in adaptive toolbar
     */
    selectRange(startIndex: number, count: number): void {
        for (let i = startIndex; i < startIndex + count; i++) {
            if (i < this.lineElements.length) {
                this.selectedIndices.add(i);
            }
        }
        this.updateSelectionUI();
    }

    /**
     * Deselects a range of results by index
     * Removes all indices in the specified range from the selection.
     *
     * @param {number} startIndex - First index to deselect (inclusive)
     * @param {number} count - Number of consecutive indices to deselect
     */
    deselectRange(startIndex: number, count: number): void {
        for (let i = startIndex; i < startIndex + count; i++) {
            this.selectedIndices.delete(i);
        }
        this.updateSelectionUI();
    }

    /**
     * Toggles selection for a range of results
     * If all indices in range are selected, deselects them all; otherwise selects them all.
     *
     * @param {number} startIndex - First index in range (inclusive)
     * @param {number} count - Number of consecutive indices in range
     */
    toggleRangeSelection(startIndex: number, count: number): void {
        // Check if all in range are already selected
        let allSelected = true;
        for (let i = startIndex; i < startIndex + count && i < this.lineElements.length; i++) {
            if (!this.selectedIndices.has(i)) {
                allSelected = false;
                break;
            }
        }

        if (allSelected) {
            this.deselectRange(startIndex, count);
        } else {
            this.selectRange(startIndex, count);
        }
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
        const oldSize = this.selectedIndices.size;
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

        this.logger.debug('Selection adjusted for removed indices:', {
            removedIndices,
            oldSelectionSize: oldSize,
            newSelectionSize: this.selectedIndices.size
        });
    }

    /**
     * Adjusts selection indices when results are inserted into the array
     * Shifts selected indices at or after the insertion point up by the count.
     *
     * @param {number} insertionIndex - Index where new results were inserted
     * @param {number} count - Number of results that were inserted
     *
     * @remarks
     * **Critical for External File Modification:**
     * - When a file is modified externally, its results are removed and re-inserted
     * - Selections in files after the modified file must shift up
     * - Without this, "Replace selected" would target wrong matches
     *
     * **Algorithm:**
     * - For each selected index >= insertionIndex, add count to it
     * - Indices before insertionIndex remain unchanged
     *
     * **Example:**
     * - Original selection: [1, 3, 5]
     * - Insert 2 results at index 2
     * - New selection: [1, 5, 7] (indices 3 and 5 shifted up by 2)
     */
    adjustSelectionForInsertedIndices(insertionIndex: number, count: number): void {
        if (count === 0) return;

        const newSelection = new Set<number>();
        for (const selectedIndex of this.selectedIndices) {
            if (selectedIndex >= insertionIndex) {
                newSelection.add(selectedIndex + count);
            } else {
                newSelection.add(selectedIndex);
            }
        }

        const oldSize = this.selectedIndices.size;
        this.selectedIndices = newSelection;
        this.updateSelectionUI();

        this.logger.debug('Selection adjusted for inserted indices:', {
            insertionIndex,
            count,
            selectionSize: oldSize
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
        this.elements = null!;
    }
}