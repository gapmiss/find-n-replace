import { SearchResult } from './search';

/**
 * UI element references for the find/replace view
 */
export interface FindReplaceElements {
    containerEl: HTMLElement;
    searchInput: HTMLInputElement;
    replaceInput: HTMLInputElement;
    matchCaseCheckbox: HTMLElement;
    wholeWordCheckbox: HTMLElement;
    regexCheckbox: HTMLElement;
    resultsContainer: HTMLElement;
    selectedCountEl: HTMLElement;
    replaceSelectedBtn: HTMLButtonElement;
    replaceAllVaultBtn: HTMLButtonElement;
    resultsToolbar: HTMLElement;
    toolbarBtn: HTMLButtonElement;
    resultsCountEl: HTMLElement;
}

/**
 * UI state tracking
 */
export interface ViewState {
    isCollapsed: boolean;           // Whether result groups are collapsed
    selectedIndices: Set<number>;   // Selected result indices
    results: SearchResult[];        // Current search results
    lineElements: HTMLDivElement[]; // DOM elements for result lines
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