import { ItemView, WorkspaceLeaf, TFile, MarkdownView, type App, Notice, setIcon } from 'obsidian';
import { ConfirmModal } from "./modals";
import VaultFindReplacePlugin from "./main";

// Define the unique identifier for this view type - used by Obsidian to track and manage this view
export const VIEW_TYPE_FIND_REPLACE = 'find-replace-view';

/**
 * Interface defining the structure of a search result
 * Each SearchResult represents a single match found in a file
 */
export interface SearchResult {
    file: TFile;        // The Obsidian file containing the match
    line: number;       // Zero-based line number where the match was found
    content: string;    // The full text content of the line containing the match
    matchText: string;  // The actual text that matched the search pattern
    col?: number | undefined;  // Optional: Zero-based column position of the match within the line
    pattern: string;    // The original search pattern that produced this match
}

/**
 * Main view class that extends Obsidian's ItemView
 * This creates the Find & Replace panel UI and handles all search/replace functionality
 */
export class FindReplaceView extends ItemView {
    // UI Element references - these hold references to DOM elements for interaction
    containerEl: HTMLElement;           // Main container for the entire view
    searchInput: HTMLInputElement;      // Text input for search terms
    replaceInput: HTMLInputElement;     // Text input for replacement text
    matchCaseCheckbox: HTMLElement;     // Checkbox container for case-sensitive matching
    wholeWordCheckbox: HTMLElement;     // Checkbox container for whole word matching
    regexCheckbox: HTMLElement;         // Checkbox container for regex pattern matching
    resultsContainer: HTMLElement;      // Container that holds all search results
    selectedCountEl: HTMLElement;       // Element displaying count of selected results
    replaceSelectedBtn: HTMLButtonElement;  // Button to replace only selected matches
    replaceAllVaultBtn: HTMLButtonElement;  // Button to replace all matches in vault
    resultsToolbar: HTMLElement;        // Toolbar above results with expand/collapse controls
    toolbarBtn: HTMLButtonElement;      // Expand/collapse all button in toolbar
    isCollapsed: boolean;               // Tracks whether result groups are collapsed or expanded

    // Data storage - these properties hold the current state and results
    results: SearchResult[] = [];           // Array of all current search results
    selectedIndices: Set<number> = new Set(); // Set of indices for user-selected results
    lineElements: HTMLDivElement[] = [];    // Array of DOM elements for each result line (for selection styling)
    private resultsCountEl: HTMLElement;    // Element showing total count of results
    plugin: VaultFindReplacePlugin;         // Reference to the main plugin instance

    /**
     * Constructor - initializes the view with required Obsidian components
     * @param leaf - The workspace leaf this view will be attached to
     * @param app - The main Obsidian app instance 
     * @param plugin - Reference to the main plugin for accessing settings/methods
     */
    constructor(leaf: WorkspaceLeaf, app: App, plugin: VaultFindReplacePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    // Required Obsidian ItemView methods - these define how the view appears in the interface
    getViewType(): string { return VIEW_TYPE_FIND_REPLACE; }    // Returns the unique view type identifier
    getDisplayText(): string { return 'Vault Find & Replace'; } // Text shown in tabs and menus
    getIcon(): string { return 'text-search'; }                 // Icon shown in tabs (Lucide icon name)

    /**
     * Called when the view is opened - sets up the entire UI structure
     * This is where all DOM elements are created and event listeners are attached
     */
    async onOpen(): Promise<void> {
        // Clear any existing content and add our main CSS class
        this.containerEl.empty();
        this.containerEl.addClass('find-replace-container');
        this.isCollapsed = false; // Start with results expanded

        // === SEARCH INPUT SECTION ===
        // Create wrapper div for the search input and its clear button
        let findInputWrapper = this.containerEl.createDiv('find-replace-input-wrapper');
        this.searchInput = findInputWrapper.createEl('input', { 
            type: 'text', 
            cls: 'find-replace-input', 
            placeholder: 'Find' 
        }) as HTMLInputElement;
        
        // Add clear button next to search input
        findInputWrapper.createEl('button', { 
            cls: 'clear-btn', 
            attr: { 'aria-label': 'Clear input' } 
        }) as HTMLInputElement;
        
        // Focus the search input after a short delay (allows UI to render first)
        setTimeout(async () => {
            this.searchInput.focus();
        }, 100);

        // === REPLACE INPUT SECTION ===
        // Create wrapper div for the replace input and its clear button
        let replaceInputWrapper = this.containerEl.createDiv('find-replace-input-wrapper');
        this.replaceInput = replaceInputWrapper.createEl('input', { 
            type: 'text', 
            cls: 'find-replace-input', 
            placeholder: 'Replace' 
        }) as HTMLInputElement;
        
        // Add clear button next to replace input
        replaceInputWrapper.createEl('button', { 
            cls: 'clear-btn', 
            attr: { 'aria-label': 'Clear input' } 
        }) as HTMLInputElement;
        
        // When replacement text changes, re-render results to show preview
        this.replaceInput.addEventListener("input", () => {
            // re-render results when replacement changes (to show replacement preview)
            this.renderResults();
        });

        // === CLEAR BUTTON FUNCTIONALITY ===
        // Set up event listeners for both clear buttons
        const clearBtns = this.containerEl.querySelectorAll<HTMLButtonElement>(".clear-btn");
        clearBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                // Find the input element (should be the previous sibling)
                const input = btn.previousElementSibling as HTMLInputElement;
                input.value = ""; // Clear the input
                input.dispatchEvent(new Event("input")); // Trigger input event to notify listeners
                input.focus(); // Return focus to the input
            });
        });

        // === SEARCH OPTIONS SECTION ===
        // Create container for the three search option checkboxes
        const optionsDiv = this.containerEl.createDiv('find-replace-options');
        this.matchCaseCheckbox = this.createOption(optionsDiv, 'Match Case', 'match-case');
        this.wholeWordCheckbox = this.createOption(optionsDiv, 'Whole Word', 'whole-word');
        this.regexCheckbox = this.createOption(optionsDiv, 'Regex', 'regex');

        // === RESULTS TOOLBAR SECTION ===
        // Create toolbar that appears above results (initially hidden)
        this.resultsToolbar = this.containerEl.createDiv('find-replace-results-toolbar');
        this.resultsToolbar.classList.add('hidden'); // Hide until we have results

        // Count display showing "X results in Y files"
        this.resultsCountEl = this.resultsToolbar.createDiv({ 
            cls: 'find-replace-results-count', 
            text: '0 results' 
        });

        // Expand/collapse all results button
        this.toolbarBtn = this.resultsToolbar.createEl('button', { 
            cls: 'collapse-toggle clickable-icon hidden', 
            attr: { 'aria-label': 'Collapse all' } 
        });
        setIcon(this.toolbarBtn!, 'copy-minus'); // Set initial icon to "collapse"
        
        // Handle expand/collapse all functionality
        this.toolbarBtn?.addEventListener("click", () => {
            // Toggle collapsed state for all file groups
            this.resultsContainer?.querySelectorAll(".file-group").forEach(group => {
                if (!this.isCollapsed) {
                    // Currently expanded, so collapse all
                    group.classList.add("collapsed");
                    if (this.toolbarBtn) setIcon(this.toolbarBtn!, 'copy-plus'); // Change to expand icon
                    this.toolbarBtn.setAttr('aria-label', "Expand all");
                } else {
                    // Currently collapsed, so expand all
                    group.classList.remove("collapsed");
                    if (this.toolbarBtn) setIcon(this.toolbarBtn!, 'copy-minus'); // Change to collapse icon
                    this.toolbarBtn.setAttr('aria-label', 'Collapse all');
                }
            });
            this.isCollapsed = !this.isCollapsed; // Toggle state
        });

        // === RESULTS CONTAINER ===
        // Container where all search results will be displayed
        this.resultsContainer = this.containerEl.createDiv('find-replace-results');

        // === REPLACE CONTROLS SECTION ===
        // Create container for replace selected and replace all buttons
        const selectedContainer = this.containerEl.createDiv('find-replace-selected-all');

        // Display count of selected results
        this.selectedCountEl = selectedContainer.createEl('span', { text: '0 selected' });
        
        // Button to replace only selected matches
        this.replaceSelectedBtn = selectedContainer.createEl('button', { 
            text: 'Replace selected', 
            attr: { 'disabled': true } // Start disabled (no selections)
        });
        this.registerDomEvent(this.replaceSelectedBtn, 'click', async () => {
            await this.replaceSelectedMatches();
        });

        // Button to replace all matches in the entire vault
        this.replaceAllVaultBtn = selectedContainer.createEl('button', { 
            cls: 'find-replace-btn', 
            attr: { 'disabled': true } // Start disabled (no results)
        });
        this.replaceAllVaultBtn.textContent = 'Replace all in vault';
        this.registerDomEvent(this.replaceAllVaultBtn, 'click', async () => {
            await this.replaceAllInVault();
        });

        this.containerEl.appendChild(selectedContainer);

        // === KEYBOARD SHORTCUTS ===
        // Set up Enter key to trigger search on various input elements
        const elements = [
            this.searchInput,
            this.replaceInput,
            this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox'),
            this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox'),
            this.regexCheckbox.querySelector('#toggle-regex-checkbox'),
        ].filter((el): el is HTMLInputElement => el instanceof HTMLInputElement);

        // Add Enter key listener to each element
        elements.forEach(el => {
            el.addEventListener('keydown', async (evt) => {
                if (evt.key === 'Enter') this.performSearch(); // Trigger search on Enter
            });
        });
    }

    /**
     * Creates a checkbox option with label and custom styling
     * @param parent - The parent element to attach this option to
     * @param label - Display text for the option
     * @param id - Unique identifier for this option
     * @returns The container element for this option
     */
    private createOption(parent: HTMLElement, label: string, id: string): HTMLElement {
        // Create container for this toggle option
        const toggleContainer = parent.createDiv('toggle-container');
        
        // Create label element
        toggleContainer.createEl(
            'label',
            {
                text: `${label}:`,
                attr: {
                    'for': `toggle-${id}-checkbox` // Associate with checkbox for accessibility
                }
            }
        );
        
        // Create container for the checkbox (allows custom styling)
        const checkboxContainer = toggleContainer.createDiv('checkbox-container');
        
        // Create the actual checkbox input
        const checkbox = checkboxContainer.createEl(
            'input',
            {
                cls: 'toggle-checkbox',
                attr: {
                    type: 'checkbox',
                    id: `toggle-${id}-checkbox`
                }
            }
        );
        
        // Handle clicking on the container (not just the checkbox itself)
        checkboxContainer.addEventListener('click', () => {
            // Toggle visual state and sync with checkbox
            const isEnabled = checkboxContainer.classList.toggle('is-enabled');
            checkbox.checked = isEnabled;
        });

        return toggleContainer;
    }

    /**
     * Main search function - searches all markdown files in the vault
     * This function handles different search modes (regex, whole word, case sensitive)
     * and populates the results array with all matches
     */
    async performSearch() {
        // Reset UI state
        this.selectedCountEl.textContent = '0 selected';
        this.replaceAllVaultBtn.setAttr('disabled', true);

        // Get and validate search query
        const query = this.searchInput.value;
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            // Empty search - clear results and return
            this.resultsContainer.empty();
            this.results = [];
            this.updateResultsUI();
            return;
        }

        // Get search option states from checkboxes
        const matchCase = (this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)!.checked;
        const wholeWord = (this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox') as HTMLInputElement)!.checked;
        const useRegex = (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.checked;

        // Initialize results array and get all markdown files
        const results: SearchResult[] = [];
        const files = this.app.vault.getMarkdownFiles();

        // Pre-build regex pattern if needed (for performance)
        let regex: RegExp | null = null;
        if (useRegex || wholeWord) {
            regex = this.buildSearchRegex();
        }

        // Performance optimization: process files in batches to prevent UI freezing
        const BATCH_SIZE = 10;   // Number of files to process at once
        const YIELD_DELAY = 0;   // Milliseconds to wait between batches
        let lastYield = Date.now();

        // Process files in batches to maintain responsive UI
        for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
            const batch = files.slice(batchStart, batchStart + BATCH_SIZE);

            // Process all files in current batch concurrently
            await Promise.all(batch.map(async (file) => {
                const content = await this.app.vault.read(file);
                const lines = content.split('\n');

                // Special case: handle dot regex patterns that match everything
                const isDotRegex = useRegex && regex && (regex.source === '.' || regex.source === '.*');
                if (isDotRegex) {
                    // For dot regex, match every non-empty line
                    for (let i = 0; i < lines.length; i++) {
                        const lineText = lines[i];
                        if (lineText.trim() === '') continue; // Skip empty lines

                        results.push({
                            file,
                            line: i,
                            content: lineText,
                            matchText: lineText, // Entire line is the match
                            col: 0,
                            pattern: query
                        });
                    }
                    return;
                }

                // Normal processing: search each line for matches
                for (let i = 0; i < lines.length; i++) {
                    const lineText = lines[i];
                    if (lineText.trim() === '') continue; // Skip empty lines

                    if ((useRegex || wholeWord) && regex) {
                        // Use regex matching for regex mode or whole word mode
                        for (const m of lineText.matchAll(regex)) {
                            if (!m[0]) continue; // Skip empty matches
                            results.push({
                                file,
                                line: i,
                                content: lineText,
                                matchText: m[0],
                                col: m.index ?? 0,
                                pattern: query
                            });
                        }
                    } else {
                        // Use simple string matching for basic search
                        const haystack = matchCase ? lineText : lineText.toLowerCase();
                        const needle = matchCase ? query : query.toLowerCase();
                        if (!needle) continue;

                        // Find all occurrences of needle in haystack
                        let start = 0;
                        while (true) {
                            const idx = haystack.indexOf(needle, start);
                            if (idx === -1) break; // No more matches in this line
                            
                            results.push({
                                file,
                                line: i,
                                content: lineText,
                                matchText: lineText.slice(idx, idx + needle.length),
                                col: idx,
                                pattern: query
                            });
                            
                            // Move start position forward to find next match
                            start = idx + Math.max(needle.length, 1);
                        }
                    }
                }
            }));

            // Yield control back to UI between batches
            await new Promise(r => setTimeout(r, YIELD_DELAY));
            if (Date.now() - lastYield > 50) {
                this.renderResults(); // Progressive rendering for better UX
                lastYield = Date.now();
            }
        }

        // Sort results by file path, then line number, then column
        results.sort((a, b) => {
            if (a.file.path < b.file.path) return -1;
            if (a.file.path > b.file.path) return 1;
            if (a.line !== b.line) return a.line - b.line;
            const colA = typeof a.col === "number" ? a.col : 0;
            const colB = typeof b.col === "number" ? b.col : 0;
            return colA - colB;
        });

        // Update state and UI with final results
        this.results = results;
        this.renderResults();
        this.selectedIndices.clear(); // Clear any previous selections
        this.replaceSelectedBtn.setAttr('disabled', true); // Disable until selections made
    }

    /**
     * Applies replacement text to specified matches in a file
     * @param file - The file to modify
     * @param matches - Array of SearchResult objects to replace
     * @param replaceAllInFile - If true, replaces all matches in file; if false, only specified matches
     */
    private async applyReplacements(file: TFile, matches: SearchResult[], replaceAllInFile: boolean = false) {
        let content = await this.app.vault.read(file);
        const lines = content.split('\n');

        const regex = this.buildSearchRegex();

        if (replaceAllInFile) {
            // Replace all matches in the file (once per unique line to prevent repeated replacements)
            const uniqueLines = Array.from(new Set(matches.map(m => m.line)));
            for (const lineNum of uniqueLines) {
                const lineText = lines[lineNum] ?? '';
                lines[lineNum] = lineText.replace(regex, (match, ...rest: any[]) => {
                    // Extract capture groups and match info from regex replace callback
                    // rest = [group1, group2, ..., offset, input]
                    const offset = rest[rest.length - 2] as number;
                    const input = rest[rest.length - 1] as string;
                    const groups = rest.slice(0, -2) as string[];

                    // Reconstruct a RegExpExecArray-like object for replacement expansion
                    const execArray: any = [match, ...groups];
                    execArray.index = offset;
                    execArray.input = input;

                    return this.expandReplacement(execArray as RegExpExecArray, this.replaceInput.value, input);
                });
            }
        } else {
            // Replace only the specified matches (use reverse-sorted order to keep indices valid)
            matches.sort((a, b) =>
                a.line === b.line ? b.col! - a.col! : b.line - a.line
            );

            // Process matches in reverse order so string indices remain valid
            for (const res of matches) {
                const lineText = lines[res.line] ?? '';
                let matchArr: RegExpExecArray | null;
                regex.lastIndex = 0; // Reset regex state
                
                // Find the specific match at the expected position
                while ((matchArr = regex.exec(lineText)) !== null) {
                    if (matchArr.index === res.col) {
                        // Found the exact match - perform replacement
                        const replacement = this.expandReplacement(matchArr, this.replaceInput.value, lineText);
                        lines[res.line] =
                            lineText.slice(0, matchArr.index) +
                            replacement +
                            lineText.slice(matchArr.index + matchArr[0].length);
                        break;
                    }
                }
            }
        }

        // Write the modified content back to the file
        await this.app.vault.modify(file, lines.join('\n'));
    }

    /**
     * Expands replacement text with special tokens like $1, $&, etc.
     * Handles regex capture groups and special replacement sequences
     * @param matchArr - The RegExp match result with capture groups
     * @param replacement - The replacement text template
     * @param input - The original input string
     * @returns The final replacement string
     */
    private expandReplacement(matchArr: RegExpExecArray, replacement: string, input: string): string {
        // Handle replacement tokens like $1, $&, $$, $` and $' and escaped \n/\t.
        // If regex mode is OFF, return the replacement text literally (no special processing).
        const isRegex = (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.checked;
        if (!isRegex) return replacement; // No expansion in non-regex mode

        const offset = matchArr.index ?? 0;
        let out = replacement;

        // Replace numbered capture groups: $1, $2, $3, etc.
        out = out.replace(/\$(\d+)/g, (_, n) => matchArr[Number(n)] ?? '');

        // Replace special regex tokens
        out = out
            .replace(/\$\$/g, '$')           // $$ -> literal $
            .replace(/\$&/g, matchArr[0])    // $& -> entire match
            .replace(/\$`/g, input.slice(0, offset))                       // $` -> text before match
            .replace(/\$'/g, input.slice(offset + (matchArr[0]?.length ?? 0))); // $' -> text after match

        // Handle escaped whitespace characters
        out = out.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

        return out;
    }

    /**
     * Builds the RegExp object used for searching based on current options
     * @returns RegExp configured with appropriate flags and pattern
     */
    private buildSearchRegex(): RegExp {
        // Get current option states
        const isRegex = (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.checked;
        const isWholeWord = (this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox') as HTMLInputElement)!.checked;
        const isMatchCase = (this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)!.checked;
        let pattern = this.searchInput.value ?? '';

        // If not in regex mode, escape special regex characters so they're treated literally
        if (!isRegex) {
            pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        // Check if pattern already has word boundaries or anchors to avoid double-wrapping
        const looksAnchoredOrHasBoundaries = /(^\\b|\\b$|\^|\$|\(\?<!|\(\?=|\(\?!|\(\?<=)/.test(pattern);

        // Add word boundaries if whole word mode is enabled and pattern doesn't already have them
        if (isWholeWord && !looksAnchoredOrHasBoundaries) {
            // When regex mode is ON, wrap in non-capturing group to preserve existing capture group indices
            pattern = isRegex ? `\\b(?:${pattern})\\b` : `\\b${pattern}\\b`;
        }

        // Build flags: 'g' for global, 'i' for case-insensitive if needed
        const flags = (isMatchCase ? '' : 'i') + 'g';
        return new RegExp(pattern, flags);
    }

    /**
     * Renders all search results in the UI
     * Groups results by file and creates collapsible sections
     */
    private renderResults() {
        // Clear previous results
        this.resultsContainer.empty();
        this.lineElements = [];

        // Start with all file groups collapsed
        this.resultsContainer?.querySelectorAll(".file-group").forEach(group => {
            group.classList.add("collapsed");
        });

        // Group results by file path
        const resultsByFile: Record<string, SearchResult[]> = {};
        this.results.forEach(r => {
            const path = r.file.path;
            if (!resultsByFile[path]) resultsByFile[path] = [];
            resultsByFile[path].push(r);
        });

        // Create UI elements for each file group
        const fileGroupsContainer = this.resultsContainer.createDiv('file-groups-container');
        let fileCount = 0;
        Object.entries(resultsByFile).forEach(([filePath, fileResults]) => {
            const fileDiv = fileGroupsContainer.createEl('div');
            fileDiv.addClass('file-group');

            // === FILE GROUP HEADER ===
            const header = fileDiv.createDiv('file-group-header');
            
            // Clickable file name (without .md extension)
            const fileGroupHeading = header.createSpan({ 
                cls: 'file-group-heading', 
                text: filePath.replace('.md', ''), 
                attr: { 'tabindex': 0, 'role': 'button' } 
            });
            
            // Handle clicking on file name to toggle collapse/expand
            fileGroupHeading.addEventListener('click', () => {
                const group = fileGroupHeading.closest('.file-group');
                if (group) group.classList.toggle('collapsed');
            });
            
            // Handle keyboard navigation for file name
            fileGroupHeading.addEventListener('keydown', (e: KeyboardEvent) => {
                const target = e.target as HTMLElement | null;
                if (
                    target?.getAttribute('role') === 'button' &&
                    target.tagName === 'SPAN'
                ) {
                    const key = e.key;
                    const isEnter = key === 'Enter';
                    const isSpace = key === ' ' || key === 'Spacebar';
                    if (isEnter || isSpace) {
                        e.preventDefault();
                        target.click(); // Trigger click handler
                    }
                }
            });
            
            // Display count of results in this file
            header.createSpan({ cls: 'file-results-count', text: ` (${fileResults.length})` });

            // "Replace all in file" button
            const replaceAllFileBtn = header.createEl('button', { 
                cls: 'clickable-icon', 
                attr: { 
                    'aria-label': `Replace all in "${filePath.replace('.md', '')}"`, 
                    'data-tooltip-position': 'top' 
                } 
            });
            setIcon(replaceAllFileBtn, 'replace-all');
            
            // Handle replace all in file
            this.registerDomEvent(replaceAllFileBtn, 'click', async () => {
                // Confirm replacement, especially if replacing with empty string
                const confirmMessage = this.replaceInput.value === ''
                    ? `Replace all matches in "${filePath}" with an empty value? This action cannot be undone.`
                    : `Replace all matches in "${filePath}?" This action cannot be undone.`;

                const confirmed = await this.confirmReplaceEmpty(confirmMessage);
                if (!confirmed) return; // User cancelled

                // Find the file object for this path
                const fileResults = this.results.filter(r => r.file.path === filePath);
                let file: TFile | null = fileResults.length ? fileResults[0].file : null;

                // Fallback: try to resolve path through vault if no results found
                if (!file) {
                    const af = this.app.vault.getAbstractFileByPath(filePath);
                    if (af && af instanceof TFile) file = af;
                }

                if (!file) {
                    new Notice(`Cannot locate file ${filePath}. Aborting replace.`);
                    return;
                }

                // Perform replacement and refresh search
                await this.dispatchReplace("file", file);
                this.performSearch();
            });

            // === INDIVIDUAL RESULT LINES ===
            // Create UI elements for each match in this file
            fileResults.forEach((res, idx) => {
                const lineDiv = fileDiv.createDiv({ cls: 'line-result' });
                
                // Set accessibility label with line/column info
                if (typeof res.col === "number" && res.col >= 0) {
                    lineDiv.setAttr('aria-label', `line ${res.line + 1}, col ${res.col + 1}`);
                } else {
                    lineDiv.setAttr('aria-label', `line ${res.line + 1}`);
                }
                lineDiv.setAttr('data-tooltip-position', 'top');

                // Create clickable text snippet
                const span = lineDiv.createSpan('snippet');
                span.setAttr('tabindex', 0);
                span.setAttr('role', 'button');
                
                // Handle keyboard navigation for snippets
                span.addEventListener('keydown', (e: KeyboardEvent) => {
                    const target = e.target as HTMLElement | null;
                    if (
                        target?.getAttribute('role') === 'button' &&
                        target.tagName === 'SPAN'
                    ) {
                        const key = e.key;
                        const isEnter = key === 'Enter' || e.keyCode === 13;
                        const isSpace = key === ' ' || key === 'Spacebar' || e.keyCode === 32;
                        if (isEnter || isSpace) {
                            e.preventDefault();
                            target.click(); // Trigger click handler
                        }
                    }
                });
                
                // Handle clicking on snippet to open file at that location
                span.addEventListener('click', async (e) => {
                    if (e.metaKey || e.ctrlKey) return; // Ignore modifier key clicks
                    
                    // Find the match position within the line
                    const matchIndex = res.content.toLowerCase().indexOf(
                        res.matchText.toLowerCase(),
                        res.col ?? 0
                    );
                    this.openFileAtLine(res.file, res.line, matchIndex, res.matchText, span);
                });
                
                // Highlight the matched text within the line context
                this.highlightMatchText(span, res.content, res.matchText, res.col);

                // "Replace this match" button
                const replaceBtn = lineDiv.createEl('button', { 
                    cls: 'clickable-icon', 
                    attr: { 
                        'aria-label': 'Replace this match', 
                        'data-tooltip-position': 'top' 
                    } 
                });
                setIcon(replaceBtn, 'replace');
                
                // Handle individual match replacement
                this.registerDomEvent(replaceBtn, 'click', async () => {
                    // Confirm if replacing with empty string
                    if (!this.replaceInput || this.replaceInput.value === '') {
                        const confirmed = await this.confirmReplaceEmpty('Replace match with empty content? This cannot be undone.');
                        if (!confirmed) return; // User cancelled
                    }
                    
                    // Perform replacement and refresh search
                    await this.dispatchReplace("one", res);
                    this.performSearch();
                });

                // Store reference to line element for selection styling
                this.lineElements.push(lineDiv);
            });
            fileCount += 1;
        });

        // Update UI elements with current results
        this.updateResultsUI(fileCount);

        // Set up keyboard navigation and selection functionality
        this.setupKeyboardNavigation();
    }

    /**
     * Updates UI elements based on current results state
     * @param fileCount - Number of files containing results
     */
    private updateResultsUI(fileCount: number = 0) {
        const resultCount = this.results.length;
        const hasResults = resultCount > 0;
        
        // Create descriptive text for result count
        const resultText = hasResults
            ? `${resultCount} result${resultCount !== 1 ? 's' : ''} in ${fileCount} file${fileCount > 1 ? 's' : ''}`
            : '0 results';

        // Update results count display
        this.resultsCountEl?.setText(resultText);

        // Configure expand/collapse toolbar button with null safety
        if (this.toolbarBtn) {
            this.toolbarBtn.classList.toggle('hidden', !hasResults); // Hide if no results

            if (hasResults) {
                setIcon(this.toolbarBtn, 'copy-minus');
                this.toolbarBtn.setAttr('aria-label', 'Collapse all');
            } else {
                setIcon(this.toolbarBtn, 'copy-plus');
                this.toolbarBtn.setAttr('aria-label', 'Expand all');
            }
        }

        // Enable/disable replace all button based on results
        this.replaceAllVaultBtn?.toggleAttribute('disabled', !hasResults);

        // Show/hide results toolbar based on whether we have results
        this.resultsToolbar?.classList.toggle('hidden', !hasResults);

        // Update collapse state tracking
        this.isCollapsed = !hasResults;

        // Update file group collapse state - single DOM query with optimized toggle
        this.resultsContainer?.querySelectorAll('.file-group').forEach(group => {
            group.classList.toggle('collapsed', !hasResults);
        });
    }

    /**
     * Highlights the matched text within a line and shows replacement preview
     * @param container - DOM element to populate with highlighted content
     * @param lineText - Full text of the line containing the match
     * @param matchText - The specific text that matched
     * @param col - Column position of the match (optional)
     */
    private highlightMatchText(
        container: HTMLElement,
        lineText: string,
        matchText: string,
        col?: number
    ) {
        container.empty(); // Clear any existing content

        // Find the match position within the line
        const matchIndex = lineText.toLowerCase().indexOf(
            matchText.toLowerCase(),
            col ?? 0
        );

        if (matchIndex === -1) {
            // Match not found - just display the line as-is
            container.appendChild(document.createTextNode(lineText));
            return;
        }

        const matchLen = matchText.length;

        // Define context window around the match for better readability
        const beforeContext = 10; // Characters to show before match
        const afterContext = 50;  // Characters to show after match

        // Calculate start and end positions for context window
        const start = Math.max(0, matchIndex - beforeContext);
        const end = Math.min(lineText.length, matchIndex + matchLen + afterContext);

        // Extract text segments
        let before = lineText.slice(start, matchIndex);
        const mid = lineText.slice(matchIndex, matchIndex + matchLen);
        let after = lineText.slice(matchIndex + matchLen, end);

        // Add ellipsis if we're not showing the full line
        if (start > 0) before = "… " + before;
        if (end < lineText.length) after = after + " …";

        // Build the highlighted content
        if (before) container.appendChild(document.createTextNode(before));

        // Create highlighted match element
        const mark = document.createElement("mark");
        mark.textContent = mid;
        container.appendChild(mark);

        // === REPLACEMENT PREVIEW FEATURE ===
        // Show what the replacement will look like if replacement text is provided
        if (this.replaceInput?.value) {
            const regex = this.buildSearchRegex();
            regex.lastIndex = 0; // Reset regex state

            // Test the replacement on just the matched text
            const fakeMatch = regex.exec(mid);
            if (fakeMatch) {
                const preview = this.expandReplacement(fakeMatch, this.replaceInput.value, lineText);
                // Only show preview if it's different from the original
                if (preview !== mid) {
                    const previewSpan = document.createElement("span");
                    previewSpan.className = "replace-preview";
                    previewSpan.textContent = `${preview}`;
                    container.appendChild(previewSpan);
                }
            }
        }

        // Add the text after the match
        if (after) container.appendChild(document.createTextNode(after));
    }

    /**
     * Replaces all matches across the entire vault
     * Shows confirmation dialog and performs replacement on all results
     */
    async replaceAllInVault() {
        if (!this.results || this.results.length === 0) {
            new Notice('No results to replace.');
            return;
        }

        // Confirm the vault-wide replacement
        const confirmMessage = this.replaceInput.value === ''
            ? 'Replace all matches across the vault with an empty value? This action cannot be undone.'
            : 'Replace all matches across the vault? This action cannot be undone.';

        const confirmed = await this.confirmReplaceEmpty(confirmMessage);
        if (!confirmed) return; // User cancelled

        // Perform replacement and refresh search
        await this.dispatchReplace("vault");
        this.performSearch();
    }

    /**
     * Replaces only the user-selected matches
     * Shows confirmation for empty replacements and processes selected results
     */
    private async replaceSelectedMatches() {
        if (!this.selectedIndices.size) return; // No selections made
        
        // Confirm if replacing with empty string
        if (!this.replaceInput || this.replaceInput.value === '') {
            const confirmed = await this.confirmReplaceEmpty('Replace selected matches with empty content? This cannot be undone.');
            if (!confirmed) return; // User cancelled
        }
        
        // Get the selected results
        const toReplace = Array.from(this.selectedIndices).map(i => this.results[i]);
        for (const res of toReplace) await this.dispatchReplace("selected");

        // Clear selections and refresh
        this.selectedIndices.clear();
        this.performSearch();
    }

    /**
     * Central dispatch method for all replacement operations
     * Handles different replacement modes and groups operations by file for efficiency
     * @param mode - Type of replacement: "one" | "selected" | "file" | "vault"
     * @param target - Optional target (SearchResult for "one", TFile for "file")
     */
    private async dispatchReplace(
        mode: "one" | "selected" | "file" | "vault",
        target?: SearchResult | TFile
    ) {
        // Group matches by file for efficient processing
        const grouped = new Map<TFile, SearchResult[]>();

        switch (mode) {
            case "one": {
                // Replace a single specific match
                const res = target as SearchResult;
                grouped.set(res.file, [res]);
                break;
            }

            case "selected": {
                // Replace all user-selected matches
                for (const idx of this.selectedIndices) {
                    const res = this.results[idx];
                    if (!grouped.has(res.file)) grouped.set(res.file, []);
                    grouped.get(res.file)!.push(res);
                }
                break;
            }

            case "file": {
                // Replace all matches in a specific file
                const file = target as TFile;
                const fileResults = this.results.filter(r => r.file.path === file.path);
                if (fileResults.length) grouped.set(file, fileResults);
                break;
            }

            case "vault": {
                // Replace all matches in the entire vault
                for (const res of this.results) {
                    if (!grouped.has(res.file)) grouped.set(res.file, []);
                    grouped.get(res.file)!.push(res);
                }
                break;
            }
        }

        // Process each file's replacements
        let total = 0;
        for (const [file, matches] of grouped) {
            const replaceAllInFile = mode === "file" || mode === "vault";
            await this.applyReplacements(file, matches, replaceAllInFile);
            total += matches.length;
        }

        // Show success notification
        if (mode === 'vault') {
            new Notice('All matches replaced');
        } else {
            if (total > 0) {
                new Notice(`${total} match${total > 1 ? 'es' : ''} replaced`);
            }
        }

        // Clean up state
        this.selectedIndices.clear();
        this.performSearch();
    }

    /**
     * Sets up keyboard navigation and multi-selection functionality for results
     * Allows Ctrl/Cmd+click to select multiple results for batch replacement
     */
    private setupKeyboardNavigation() {
        if (!this.lineElements.length) return; // No results to set up
        
        // Add click handlers to each result line for multi-selection
        this.lineElements.forEach((el, idx) => {
            this.registerDomEvent(el, 'click', (e: MouseEvent) => {
                // Check for modifier keys (Ctrl on Windows/Linux, Cmd on Mac)
                if (e.metaKey || e.ctrlKey) {
                    // Toggle selection state for this result
                    if (this.selectedIndices.has(idx)) {
                        this.selectedIndices.delete(idx); // Deselect
                    } else {
                        this.selectedIndices.add(idx); // Select
                    }
                    this.updateSelectionStyles(); // Update visual indication
                }
            });
        });
    }

    /**
     * Updates visual styling and UI state based on current selections
     * Adds/removes 'selected' class and updates button states
     */
    private updateSelectionStyles() {
        // Update visual styling for each result line
        this.lineElements.forEach((el, idx) => {
            if (this.selectedIndices.has(idx)) {
                el.classList.add('selected'); // Highlight selected items
            } else {
                el.classList.remove('selected'); // Remove highlight from unselected
            }
        });
        
        // Update selection count display
        if (this.selectedCountEl) {
            this.selectedCountEl.textContent = `${this.selectedIndices.size} selected`;
        }
        
        // Enable/disable "Replace selected" button based on selection count
        if (this.selectedIndices.size < 1) {
            this.replaceSelectedBtn.setAttr('disabled', true); // Disable if nothing selected
        } else {
            this.replaceSelectedBtn.removeAttribute('disabled'); // Enable if selections exist
        }
    }

    /**
     * Opens a file at a specific line and column, highlighting the match
     * @param file - The file to open
     * @param line - Zero-based line number
     * @param col - Column position of the match
     * @param matchText - The matched text to highlight
     * @param snippet - The UI element that triggered this (for focus return)
     */
    private async openFileAtLine(file: TFile, line: number, col: number | undefined, matchText: string, snippet: HTMLSpanElement) {
        // Find existing leaf with this file or create a new one
        const existingLeaves = this.app.workspace.getLeavesOfType('markdown');
        let leaf = existingLeaves.find(l => l.view instanceof MarkdownView && l.view.file?.path === file.path);
        
        if (!leaf) {
            // File not currently open - open in new leaf
            leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(file);
            this.app.workspace.revealLeaf(leaf); // Bring to front
        } else {
            // File already open - just bring to front
            this.app.workspace.revealLeaf(leaf);
        }

        const mdView = leaf.view as MarkdownView;
        let viewState = leaf.getViewState();
        
        // Switch from preview mode to source mode if necessary (needed for editing)
        if (viewState.state!.mode === 'preview') {
            await leaf.setViewState({
                type: 'markdown',
                state: {
                    file: file.path,
                    mode: 'source' // Switch to source/edit mode
                },
            })
        }

        if (!mdView?.editor) return; // No editor available

        const editor = mdView.editor;
        
        // Calculate selection range for the match
        const lineContent = editor.getLine(line);
        let chStart = col ?? 0;
        let chEnd = 0;
        if (matchText) {
            if (chStart !== -1) chEnd = col! + matchText.length;
        }
        
        // Set selection to highlight the match and focus the editor
        editor.setSelection({ line, ch: chStart }, { line, ch: chEnd });
        editor.focus();
        
        // Return focus to the search result snippet after a brief delay
        setTimeout(async () => {
            snippet.focus();
        }, 100);

        // Center the match in the viewport using CodeMirror 6 API
        const cmView = (editor as any).cm; // Access CodeMirror instance
        if (cmView) {
            const pos = editor.posToOffset({ line, ch: chStart });
            cmView.dispatch({
                effects: cmView.constructor.scrollIntoView(pos, { y: 'center' })
            });
        }
    }

    /**
     * Shows a confirmation dialog for potentially destructive operations
     * @param message - The confirmation message to display
     * @returns Promise<boolean> - true if confirmed, false if cancelled
     */
    private async confirmReplaceEmpty(message: string): Promise<boolean> {
        const modal = new ConfirmModal(this.app, message);
        modal.open();

        // Wait for the modal to close using polling
        // (Alternative to complex event handling)
        await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                if (!modal.isOpen) {
                    clearInterval(interval);
                    resolve();
                }
            }, 50); // Check every 50ms
        });

        return modal.result; // true = confirmed, false = cancelled
    }
}