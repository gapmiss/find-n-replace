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

    constructor(elements: FindReplaceElements, searchEngine: SearchEngine, plugin: VaultFindReplacePlugin) {
        this.elements = elements;
        this.searchEngine = searchEngine;
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'UIRenderer');
    }

    /**
     * Renders all search results in the UI
     * Groups results by file and creates collapsible sections
     * @param results - Array of search results to render
     * @param replaceText - Current replacement text for preview
     * @param searchOptions - Current search options (for regex replacement preview)
     * @param totalResults - Total results found (before limiting)
     * @param isLimited - Whether results are limited
     * @returns Array of line elements for selection management
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
        let tabIndex = 12; // Start after toolbar elements (1-11)

        Object.entries(resultsByFile).forEach(([filePath, fileResults]) => {
            const fileDiv = fileGroupsContainer.createEl('div');
            fileDiv.addClass('file-group');

            // Set data attribute for file path to track state
            fileDiv.setAttribute('data-file-path', filePath);

            // Determine collapse state: use saved state or default to collapsed
            const isFileCollapsed = this.plugin.settings.fileGroupStates[filePath] ?? true; // Default to collapsed
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

                // Track the new state for this specific file and save to plugin settings
                const filePath = group.getAttribute('data-file-path');
                if (filePath) {
                    this.plugin.settings.fileGroupStates[filePath] = !isCurrentlyCollapsed;
                    this.plugin.saveSettings(); // Persist the change
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
        searchOptions: { matchCase: boolean; wholeWord: boolean; useRegex: boolean }
    ): void {
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
     * @param resultCount - Number of search results (displayed)
     * @param fileCount - Number of files containing results
     * @param totalResults - Total results found (before limiting)
     * @param isLimited - Whether results are limited
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
                    this.plugin.settings.fileGroupStates[filePath] = false; // false = expanded
                }
            } else {
                // Currently expanded, so collapse all
                htmlGroup.classList.add("collapsed");
                if (filePath) {
                    this.plugin.settings.fileGroupStates[filePath] = true; // true = collapsed
                }
            }
        });

        // Save all the state changes to plugin settings
        this.plugin.saveSettings();

        // Update the toolbar button state
        this.isCollapsed = !this.isCollapsed;
        this.updateToolbarButtonState();
    }

    /**
     * Clears all results from the UI
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
     * Clears all references and cached data
     */
    dispose(): void {
        // Clear DOM references (elements are cleaned by Obsidian)
        this.elements = null as any;
        this.searchEngine = null as any;
    }
}