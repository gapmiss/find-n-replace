import { SearchResult } from './search';

/**
 * UI element references for the find/replace view
 */
export interface FindReplaceElements {
    containerEl: HTMLElement;
    searchInput: HTMLInputElement;
    replaceInput: HTMLInputElement;
    matchCaseCheckbox: HTMLElement; // Now inline toggle button
    wholeWordCheckbox: HTMLElement; // Now inline toggle button
    regexCheckbox: HTMLElement; // Now inline toggle button
    resultsContainer: HTMLElement;
    selectedCountEl: HTMLElement;
    replaceSelectedBtn: HTMLButtonElement;
    replaceAllVaultBtn: HTMLButtonElement;
    toolbarBtn: HTMLButtonElement;
    resultsCountEl: HTMLElement;
    clearAllBtn: HTMLButtonElement; // Global clear button
    replaceAllVaultBtnBottom: HTMLButtonElement; // Adaptive toolbar duplicate
    adaptiveToolbar: HTMLElement; // Contextual results toolbar
    ellipsisMenuBtn: HTMLButtonElement; // Ellipsis menu trigger button (uses Obsidian Menu class)
}

/**
 * UI state tracking
 */
export interface ViewState {
    isCollapsed: boolean;           // Whether result groups are collapsed
    selectedIndices: Set<number>;   // Selected result indices
    results: SearchResult[];        // Current search results (limited)
    lineElements: HTMLDivElement[]; // DOM elements for result lines
    totalResults?: number;          // Total results found (before limiting)
    isLimited?: boolean;            // Whether results are limited
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
    isDarkMode: boolean;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
}