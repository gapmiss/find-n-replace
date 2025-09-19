import { FindReplaceElements } from '../../types';
import { SearchResult } from '../../types/search';

/**
 * Handles multi-selection functionality for search results
 */
export class SelectionManager {
    private elements: FindReplaceElements;
    private selectedIndices: Set<number> = new Set();
    private lineElements: HTMLDivElement[] = [];

    constructor(elements: FindReplaceElements) {
        this.elements = elements;
    }

    /**
     * Sets up keyboard navigation and multi-selection functionality for results
     * @param lineElements - Array of DOM elements for result lines
     */
    setupSelection(lineElements: HTMLDivElement[]): void {
        this.lineElements = lineElements;
        this.selectedIndices.clear(); // Clear previous selections

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

        // Update UI to reflect initial state (no selections)
        this.updateSelectionUI();
    }

    /**
     * Toggles selection state for a specific result index
     * @param index - Index of the result to toggle
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
     */
    clearSelection(): void {
        this.selectedIndices.clear();
        this.updateSelectionUI();
    }

    /**
     * Gets the currently selected indices
     * @returns Set of selected indices
     */
    getSelectedIndices(): Set<number> {
        return new Set(this.selectedIndices);
    }

    /**
     * Gets the number of selected items
     * @returns Number of selected items
     */
    getSelectionCount(): number {
        return this.selectedIndices.size;
    }

    /**
     * Checks if any items are selected
     * @returns true if any items are selected
     */
    hasSelection(): boolean {
        return this.selectedIndices.size > 0;
    }

    /**
     * Checks if a specific index is selected
     * @param index - Index to check
     * @returns true if the index is selected
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

        // Enable/disable and show/hide "Replace selected" button based on selection count
        const hasSelections = this.selectedIndices.size > 0;
        if (this.elements.replaceSelectedBtn) {
            this.elements.replaceSelectedBtn.toggleAttribute('disabled', !hasSelections);
            this.elements.replaceSelectedBtn.classList.toggle('hidden', !hasSelections);
        }
    }

    /**
     * Handles keyboard shortcuts for selection
     * @param event - The keyboard event
     * @returns true if the event was handled
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
     * @param filePath - Path of the file to filter by
     * @param allResults - All search results
     * @returns Array of selected indices for the specified file
     */
    getSelectedIndicesForFile(filePath: string, allResults: SearchResult[]): number[] {
        return Array.from(this.selectedIndices).filter(idx => {
            const result = allResults[idx];
            return result?.file?.path === filePath;
        });
    }

    /**
     * Selects all results for a specific file
     * @param filePath - Path of the file
     * @param allResults - All search results
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
     * @param filePath - Path of the file
     * @param allResults - All search results
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
     * @param startIndex - Starting index (inclusive)
     * @param endIndex - Ending index (inclusive)
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
     * Resets the selection manager (clears selections and elements)
     */
    reset(): void {
        this.selectedIndices.clear();
        this.lineElements = [];
        this.updateSelectionUI();
    }

    /**
     * Cleanup method for when the selection manager is no longer needed
     * Clears all selections, elements, and references
     */
    dispose(): void {
        this.selectedIndices.clear();
        this.lineElements = [];
        // Clear reference to elements for garbage collection
        this.elements = null as any;
    }
}