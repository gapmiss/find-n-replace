import { setIcon, TFile } from 'obsidian';
import { SearchResult, FindReplaceElements } from '../../types';
import { SearchEngine } from '../../core';
import { Logger } from '../../utils';
import VaultFindReplacePlugin from '../../main';

/**
 * Handles all UI rendering and DOM manipulation for search results
 */
export class UIRenderer {
    private elements: FindReplaceElements;
    private searchEngine: SearchEngine;
    private isCollapsed: boolean = true; // Default to collapsed for better UX
    private plugin: VaultFindReplacePlugin; // Reference to plugin for settings access
    private logger: Logger;
    private sessionFileGroupStates: Record<string, boolean> = {}; // Session-only state (not persisted)

    constructor(elements: FindReplaceElements, searchEngine: SearchEngine, plugin: VaultFindReplacePlugin) {
        this.elements = elements;
        this.searchEngine = searchEngine;
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'UIRenderer');
    }

    /**
     * Renders all search results in the UI
     * Groups results by file and creates collapsible sections with full keyboard accessibility.
     *
     * @param {SearchResult[]} results - Array of search results to render
     * @param {string} replaceText - Current replacement text for preview display
     * @param {Object} searchOptions - Current search options for regex replacement preview
     * @param {boolean} searchOptions.matchCase - Case-sensitive search enabled
     * @param {boolean} searchOptions.wholeWord - Whole word matching enabled
     * @param {boolean} searchOptions.useRegex - Regular expression mode enabled
     * @param {number} [totalResults] - Total results found before limiting (for UI feedback)
     * @param {boolean} [isLimited] - Whether results are limited by max results setting
     * @returns {HTMLDivElement[]} Array of line elements for selection management
     *
     * @remarks
     * **Grouping and Display:**
     * - Results organized by file path with collapsible file groups
     * - Each file group shows result count
     * - Sequential tab order: toolbar → file headers → replace buttons → matches → replace buttons
     *
     * **File Group State:**
     * - 3-tier state priority: session → disk → default collapsed
     * - Session state always maintained (in-memory)
     * - Disk persistence optional (respects rememberFileGroupStates setting)
     * - States cleaned up for deleted files
     *
     * **Replacement Preview:**
     * - Live preview shows replacement text with regex capture group expansion
     * - Multiline matches show truncated preview with hover tooltip
     * - Preview only shown when different from original match
     *
     * **UI Updates:**
     * - Result count display updated (with "limited" indicator if applicable)
     * - Adaptive toolbar shown/hidden based on results
     * - Expand/collapse button state updated
     * - Ellipsis menu enabled/disabled based on results
     */
    renderResults(results: SearchResult[], replaceText: string, searchOptions: { matchCase: boolean; wholeWord: boolean; useRegex: boolean }, totalResults?: number, isLimited?: boolean): HTMLDivElement[] {
        // Clear previous results
        this.elements.resultsContainer.empty();
        const lineElements: HTMLDivElement[] = [];

        // Start with all file groups collapsed
        this.elements.resultsContainer?.querySelectorAll(".file-group").forEach(group => {
            group.classList.add("collapsed");
        });

        // Group results by file path
        const resultsByFile: Record<string, SearchResult[]> = {};
        results.forEach(r => {
            const path = r.file.path;
            if (!resultsByFile[path]) resultsByFile[path] = [];
            resultsByFile[path].push(r);
        });

        // Create UI elements for each file group
        const fileGroupsContainer = this.elements.resultsContainer.createDiv('file-groups-container');
        let fileCount = 0;
        let globalIndex = 0;
        let tabIndex = 13; // Start after toolbar elements (1-12)

        Object.entries(resultsByFile).forEach(([filePath, fileResults]) => {
            const fileDiv = fileGroupsContainer.createEl('div');
            fileDiv.addClass('file-group');

            // Set data attribute for file path to track state
            fileDiv.setAttribute('data-file-path', filePath);

            // Determine collapse state: priority order:
            // 1. Session state (current session's user interactions)
            // 2. Persisted state (saved to disk if rememberFileGroupStates enabled)
            // 3. Default to collapsed
            let isFileCollapsed = true;
            if (this.sessionFileGroupStates.hasOwnProperty(filePath)) {
                // Use session state if available (highest priority)
                isFileCollapsed = this.sessionFileGroupStates[filePath];
            } else if (this.plugin.settings.rememberFileGroupStates && this.plugin.settings.fileGroupStates[filePath] !== undefined) {
                // Use persisted state if session state not available and persistence enabled
                isFileCollapsed = this.plugin.settings.fileGroupStates[filePath];
            }

            if (isFileCollapsed) {
                fileDiv.addClass('collapsed');
            }

            // Create file group header with sequential tabindex (header gets tabIndex, button gets tabIndex+1)
            this.createFileGroupHeader(fileDiv, filePath, fileResults, tabIndex);
            tabIndex += 2; // Increment by 2 since header uses 2 tabindex values (header + button)

            // Create individual result lines with sequential tabindex (snippet gets tabIndex, button gets tabIndex+1)
            fileResults.forEach((res) => {
                const lineDiv = this.createResultLine(fileDiv, res, replaceText, globalIndex, searchOptions, tabIndex);
                lineElements.push(lineDiv);
                globalIndex++;
                tabIndex += 2; // Increment by 2 since each line uses 2 tabindex values (snippet + button)
            });

            fileCount += 1;
        });

        // Update UI elements with current results
        this.updateResultsUI(results.length, fileCount, totalResults, isLimited);

        // Clean up saved states for files that no longer exist (run periodically)
        this.cleanupFileGroupStates(Object.keys(resultsByFile));

        return lineElements;
    }

    /**
     * Creates the header section for a file group
     * @param fileDiv - Container element for the file group
     * @param filePath - Path of the file
     * @param fileResults - Results for this file
     */
    private createFileGroupHeader(
        fileDiv: HTMLElement,
        filePath: string,
        fileResults: SearchResult[],
        tabIndex: number
    ): void {
        const header = fileDiv.createDiv('file-group-header');

        // Make the entire header focusable and clickable for expand/collapse
        header.setAttribute('tabindex', tabIndex.toString());
        header.setAttribute('role', 'button');
        header.setAttribute('aria-label', `Toggle ${filePath.replace('.md', '')} section`);

        // File name (without .md extension) - no longer focusable itself
        const fileGroupHeading = header.createSpan({
            cls: 'file-group-heading',
            text: filePath.replace('.md', '')
        });

        // Display count of results in this file
        header.createSpan({ cls: 'file-results-count', text: ` (${fileResults.length})` });

        // "Replace all in file" button
        const replaceAllFileBtn = header.createEl('button', {
            cls: 'clickable-icon',
            attr: {
                'aria-label': `Replace all in "${filePath.replace('.md', '')}"`,
                'data-tooltip-position': 'top',
                'tabindex': (tabIndex + 1).toString()
            }
        });
        setIcon(replaceAllFileBtn, 'replace-all');

        // Store file path for event handling
        replaceAllFileBtn.setAttribute('data-file-path', filePath);

        // Handle clicking on header (but not the button) to toggle collapse/expand
        header.addEventListener('click', (e: MouseEvent) => {
            // Don't trigger expand/collapse if the replace button was clicked
            if ((e.target as HTMLElement).closest('.clickable-icon')) {
                return;
            }

            const group = header.closest('.file-group') as HTMLElement;
            if (group) {
                const isCurrentlyCollapsed = group.classList.contains('collapsed');
                group.classList.toggle('collapsed');

                // Track the new state in session (always) and optionally persist to disk
                const filePath = group.getAttribute('data-file-path');
                if (filePath) {
                    // Always save to session state (persists during current view session)
                    this.sessionFileGroupStates[filePath] = !isCurrentlyCollapsed;

                    // Optionally save to disk if persistence enabled
                    if (this.plugin.settings.rememberFileGroupStates) {
                        this.plugin.settings.fileGroupStates[filePath] = !isCurrentlyCollapsed;
                        this.plugin.saveSettings(); // Persist to disk
                    }
                }

                // Update global toolbar button state based on all file groups
                this.updateToolbarButtonState();
            }
        });

        // Handle keyboard navigation for header
        header.addEventListener('keydown', (e: KeyboardEvent) => {
            if (this.isActivationKey(e)) {
                e.preventDefault();
                // Simulate a click on the header (which will check for button target)
                header.click();
            }
        });
    }

    /**
     * Creates a UI element for a single search result line
     * @param container - Parent container element
     * @param result - The search result to render
     * @param replaceText - Current replacement text for preview
     * @param index - Global index of this result
     * @param searchOptions - Current search options (for regex replacement preview)
     * @returns The created line element
     */
    private createResultLine(
        container: HTMLElement,
        result: SearchResult,
        replaceText: string,
        index: number,
        searchOptions: { matchCase: boolean; wholeWord: boolean; useRegex: boolean },
        tabIndex: number
    ): HTMLDivElement {
        const lineDiv = container.createDiv({ cls: 'line-result' });

        // Set accessibility label with line/column info
        if (typeof result.col === "number" && result.col >= 0) {
            lineDiv.setAttr('aria-label', `line ${result.line + 1}, col ${result.col + 1}`);
        } else {
            lineDiv.setAttr('aria-label', `line ${result.line + 1}`);
        }
        lineDiv.setAttr('data-tooltip-position', 'top');

        // Create clickable text snippet
        const span = lineDiv.createSpan('snippet');
        span.setAttr('tabindex', tabIndex);
        span.setAttr('role', 'button');

        // Handle keyboard navigation for snippets
        span.addEventListener('keydown', (e: KeyboardEvent) => {
            if (this.isActivationKey(e)) {
                e.preventDefault();
                span.click();
            }
        });

        // Store result data for event handling
        span.setAttribute('data-file-path', result.file.path);
        span.setAttribute('data-line', result.line.toString());
        span.setAttribute('data-col', (result.col || 0).toString());
        span.setAttribute('data-match-text', result.matchText);

        // Highlight the matched text within the line context
        this.highlightMatchText(span, result.content, result.matchText, result.col, replaceText, result.pattern, searchOptions);

        // "Replace this match" button
        const replaceBtn = lineDiv.createEl('button', {
            cls: 'clickable-icon',
            attr: {
                'aria-label': 'Replace this match',
                'data-tooltip-position': 'top',
                'tabindex': (tabIndex + 1).toString()
            }
        });
        setIcon(replaceBtn, 'replace');

        // Store result data for event handling
        replaceBtn.setAttribute('data-result-index', index.toString());

        return lineDiv;
    }

    /**
     * Highlights the matched text within a line and shows replacement preview
     * @param container - DOM element to populate with highlighted content
     * @param lineText - Full text of the line containing the match
     * @param matchText - The specific text that matched
     * @param col - Column position of the match (optional)
     * @param replaceText - Current replacement text for preview
     * @param pattern - Original search pattern
     * @param searchOptions - Current search options (for regex handling)
     */
    private highlightMatchText(
        container: HTMLElement,
        lineText: string,
        matchText: string,
        col: number | undefined,
        replaceText: string,
        pattern: string,
        searchOptions: { matchCase: boolean; wholeWord: boolean; useRegex: boolean; multiline?: boolean }
    ): void {
        container.empty(); // Clear any existing content

        // Handle multiline matches differently
        if (searchOptions.multiline === true && searchOptions.useRegex && matchText.includes('\n')) {
            // For multiline matches, show a truncated version
            const lines = matchText.split('\n');
            const firstLine = lines[0];
            const hasMoreLines = lines.length > 1;

            // Show context before the match on the first line
            const beforeContext = 10;
            const matchIndex = col ?? 0;
            const start = Math.max(0, matchIndex - beforeContext);

            let before = lineText.slice(start, matchIndex);
            if (start > 0) before = "… " + before;

            // Build the highlighted content
            if (before) container.appendChild(document.createTextNode(before));

            // Create highlighted match element
            const mark = document.createElement("mark");
            mark.textContent = firstLine + (hasMoreLines ? '…' : '');
            if (hasMoreLines) {
                mark.title = `Multiline match (${lines.length} lines):\n${matchText}`;
            }
            container.appendChild(mark);

            // Generate replacement preview for multiline matches
            if (replaceText) {
                try {
                    let preview = '';
                    if (searchOptions.useRegex) {
                        // For multiline regex, we need to test against the full matchText
                        const regex = this.searchEngine.buildSearchRegex(pattern, searchOptions);
                        regex.lastIndex = 0;

                        // Test the replacement on the full multiline match
                        const fakeMatch = regex.exec(matchText);
                        if (fakeMatch) {
                            preview = this.expandReplacementString(replaceText, fakeMatch);
                        } else {
                            preview = replaceText;
                        }
                    } else {
                        preview = replaceText;
                    }

                    // Only show preview if it's different and not empty
                    if (preview !== matchText && preview.trim()) {
                        // For multiline previews, show first line + indicator
                        const previewLines = preview.split('\n');
                        const previewFirstLine = previewLines[0];
                        const previewHasMoreLines = previewLines.length > 1;

                        const previewSpan = document.createElement("span");
                        previewSpan.className = "replace-preview";
                        previewSpan.textContent = previewFirstLine + (previewHasMoreLines ? '…' : '');
                        if (previewHasMoreLines) {
                            previewSpan.title = `Replacement preview (${previewLines.length} lines):\n${preview}`;
                        }
                        container.appendChild(previewSpan);
                    }
                } catch (error) {
                    this.logger.debug('Error generating multiline replacement preview:', error);
                }
            }

            // Show context after match (for single-line portion)
            const afterContext = 50;
            const end = Math.min(lineText.length, matchIndex + firstLine.length + afterContext);
            let after = lineText.slice(matchIndex + firstLine.length, end);
            if (end < lineText.length) after = after + " …";
            if (after) container.appendChild(document.createTextNode(after));
            return;
        }

        // Original single-line logic
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
        if (replaceText) {
            try {
                let preview: string;

                if (searchOptions.useRegex) {
                    // For regex mode, we need to properly expand capture groups
                    const regex = this.searchEngine.buildSearchRegex(pattern, searchOptions);
                    regex.lastIndex = 0; // Reset regex state

                    // Test the replacement on just the matched text
                    const fakeMatch = regex.exec(mid);
                    if (fakeMatch) {
                        // Expand regex replacement string with capture groups
                        preview = this.expandReplacementString(replaceText, fakeMatch);
                    } else {
                        // Fallback if regex doesn't match (shouldn't happen)
                        preview = replaceText;
                    }
                } else {
                    // For simple text search, replacement is literal
                    preview = replaceText;
                }

                // Only show preview if it's different from the original
                if (preview !== mid) {
                    const previewSpan = document.createElement("span");
                    previewSpan.className = "replace-preview";
                    previewSpan.textContent = `${preview}`;
                    container.appendChild(previewSpan);
                }
            } catch (error) {
                // Ignore regex errors in preview
                this.logger.debug('Error generating replacement preview:', error);
            }
        }

        // Add the text after the match
        if (after) container.appendChild(document.createTextNode(after));
    }

    /**
     * Updates UI elements based on current results state
     * Manages result count display, adaptive toolbar visibility, and action button states.
     *
     * @param {number} resultCount - Number of search results being displayed
     * @param {number} [fileCount=0] - Number of files containing results
     * @param {number} [totalResults] - Total results found before limiting (for "limited" message)
     * @param {boolean} [isLimited] - Whether results are limited by max results setting
     *
     * @remarks
     * **Result Count Display:**
     * - No results: "0 results"
     * - Limited results: "X of Y results in Z files (limited)"
     * - Full results: "X results in Z files"
     * - Proper singular/plural handling for "result" and "file"
     *
     * **Adaptive Toolbar:**
     * - Hidden when no results exist
     * - Shown when results are present
     * - Ellipsis menu enabled/disabled based on results
     * - Expand/collapse button shown/hidden and state updated
     *
     * **Button States:**
     * - Expand/collapse button: Hidden when no results, state updated when visible
     * - Ellipsis menu: Disabled when no results, enabled when results exist
     * - Individual menu items handle their own enable/disable state
     */
    updateResultsUI(resultCount: number, fileCount: number = 0, totalResults?: number, isLimited?: boolean): void {
        const hasResults = resultCount > 0;

        // Create descriptive text for result count
        let resultText: string;
        if (!hasResults) {
            resultText = '0 results';
        } else if (isLimited && totalResults) {
            resultText = `${resultCount} of ${totalResults} result${totalResults !== 1 ? 's' : ''} in ${fileCount} file${fileCount > 1 ? 's' : ''} (limited)`;
        } else {
            resultText = `${resultCount} result${resultCount !== 1 ? 's' : ''} in ${fileCount} file${fileCount > 1 ? 's' : ''}`;
        }

        // Update results count display
        this.elements.resultsCountEl?.setText(resultText);

        // Configure expand/collapse button in adaptive toolbar
        if (this.elements.toolbarBtn) {
            this.elements.toolbarBtn.classList.toggle('hidden', !hasResults);

            if (hasResults) {
                // Update toolbar button based on current state
                this.updateToolbarButtonState();
            }
        }

        // Enable/disable ellipsis menu button based on results (Menu items are handled dynamically)
        this.elements.ellipsisMenuBtn?.toggleAttribute('disabled', !hasResults);

        // Show/hide adaptive toolbar based on whether we have results
        this.elements.adaptiveToolbar?.classList.toggle('hidden', !hasResults);
    }

    /**
     * Updates the toolbar button state based on current file group states
     */
    private updateToolbarButtonState(): void {
        const fileGroups = this.elements.resultsContainer?.querySelectorAll(".file-group");
        if (!fileGroups || fileGroups.length === 0) return;

        // Check if all groups are collapsed
        const allCollapsed = Array.from(fileGroups).every(group => group.classList.contains('collapsed'));

        if (this.elements.toolbarBtn) {
            if (allCollapsed) {
                setIcon(this.elements.toolbarBtn, 'copy-plus');
                this.elements.toolbarBtn.setAttr('aria-label', "Expand all");
                this.isCollapsed = true;
            } else {
                setIcon(this.elements.toolbarBtn, 'copy-minus');
                this.elements.toolbarBtn.setAttr('aria-label', 'Collapse all');
                this.isCollapsed = false;
            }
        }
    }

    /**
     * Toggles expand/collapse state for all file groups
     * Expands all groups if currently collapsed, collapses all if currently expanded.
     *
     * @remarks
     * **State Management:**
     * - Uses current isCollapsed flag to determine target state
     * - All file groups set to same state (all expanded OR all collapsed)
     * - Session state always updated for all groups
     * - Disk persistence optional (respects rememberFileGroupStates setting)
     *
     * **Behavior:**
     * - Currently collapsed → expand all groups
     * - Currently expanded → collapse all groups
     * - Toolbar button icon updated (copy-plus for expand, copy-minus for collapse)
     * - Settings saved to disk if persistence enabled
     *
     * **Performance:**
     * - Batch state updates before saving to disk
     * - Single saveSettings() call after all changes
     * - Efficient DOM manipulation with classList operations
     */
    toggleExpandCollapseAll(): void {
        const targetState = this.isCollapsed; // If currently collapsed, we want to expand (false), and vice versa

        this.elements.resultsContainer?.querySelectorAll(".file-group").forEach(group => {
            const htmlGroup = group as HTMLElement;
            const filePath = htmlGroup.getAttribute('data-file-path');

            if (targetState) {
                // Currently collapsed, so expand all
                htmlGroup.classList.remove("collapsed");
                if (filePath) {
                    // Always save to session state
                    this.sessionFileGroupStates[filePath] = false; // false = expanded

                    // Optionally persist to disk
                    if (this.plugin.settings.rememberFileGroupStates) {
                        this.plugin.settings.fileGroupStates[filePath] = false;
                    }
                }
            } else {
                // Currently expanded, so collapse all
                htmlGroup.classList.add("collapsed");
                if (filePath) {
                    // Always save to session state
                    this.sessionFileGroupStates[filePath] = true; // true = collapsed

                    // Optionally persist to disk
                    if (this.plugin.settings.rememberFileGroupStates) {
                        this.plugin.settings.fileGroupStates[filePath] = true;
                    }
                }
            }
        });

        // Save all state changes to disk (if persistence enabled)
        if (this.plugin.settings.rememberFileGroupStates) {
            this.plugin.saveSettings();
        }

        // Update the toolbar button state
        this.isCollapsed = !this.isCollapsed;
        this.updateToolbarButtonState();
    }

    /**
     * Clears all results from the UI
     * Removes all result elements and resets UI to empty state.
     *
     * @remarks
     * **Actions Performed:**
     * - Empties results container (removes all DOM elements)
     * - Resets result count to 0
     * - Hides adaptive toolbar
     * - Disables ellipsis menu button
     * - Hides expand/collapse button
     *
     * **When Called:**
     * - User clears search input
     * - Empty search query submitted
     * - Search returns no results
     * - Clear All button clicked
     */
    clearResults(): void {
        this.elements.resultsContainer.empty();
        this.updateResultsUI(0, 0);
    }

    /**
     * Cleans up saved file group states for files that no longer exist in the vault
     * @param currentFilePaths - Array of file paths that currently have search results
     */
    private cleanupFileGroupStates(currentFilePaths: string[]): void {
        const savedStates = this.plugin.settings.fileGroupStates;
        const vault = this.plugin.app.vault;
        let hasChanges = false;

        // Check each saved file path to see if the file still exists
        for (const filePath in savedStates) {
            const file = vault.getAbstractFileByPath(filePath);

            // Remove state if file doesn't exist anymore
            if (!file) {
                delete savedStates[filePath];
                hasChanges = true;
                this.logger.debug(`Cleaned up state for non-existent file: ${filePath}`);
            }
        }

        // Save changes if any cleanup was performed
        if (hasChanges) {
            this.plugin.saveSettings();
            this.logger.debug('File group states cleaned up');
        }
    }

    /**
     * Checks if a keyboard event is an activation key (Enter or Space)
     * @param event - The keyboard event to check
     * @returns true if it's an activation key
     */
    private isActivationKey(event: KeyboardEvent): boolean {
        const target = event.target;

        if (!(target instanceof HTMLElement)) {
            this.logger.debug('Keyboard event target is not an HTMLElement');
            return false;
        }

        if (target.getAttribute('role') === 'button' && (target.tagName === 'SPAN' || target.tagName === 'DIV')) {
            const key = event.key;
            return key === 'Enter' || key === ' ' || key === 'Spacebar';
        }
        return false;
    }

    /**
     * Expands a replacement string with regex capture groups
     * @param replaceText - The replacement pattern (e.g., "🚧🚧$1🚧🚧")
     * @param match - The regex match result containing capture groups
     * @returns The expanded replacement string
     */
    private expandReplacementString(replaceText: string, match: RegExpExecArray): string {
        let result = replaceText;

        // Replace $& with the full match
        result = result.replace(/\$&/g, match[0]);

        // Replace $n with capture groups (where n is 1-99)
        for (let i = 1; i < match.length; i++) {
            const captureGroup = match[i] || ''; // Use empty string if capture group is undefined
            const regex = new RegExp(`\\$${i}`, 'g');
            result = result.replace(regex, captureGroup);
        }

        // Replace $$ with literal $
        result = result.replace(/\$\$/g, '$');

        return result;
    }

    /**
     * Cleanup method for when the renderer is no longer needed
     * Clears all references and cached data to prevent memory leaks.
     *
     * @remarks
     * **Cleanup Actions:**
     * - Clears element references (DOM cleaned by Obsidian)
     * - Nullifies searchEngine reference
     * - Releases all object references for garbage collection
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
     */
    dispose(): void {
        // Clear DOM references (elements are cleaned by Obsidian)
        this.elements = null as any;
        this.searchEngine = null as any;
    }
}