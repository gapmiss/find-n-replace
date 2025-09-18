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
    private isCollapsed: boolean = false;
    private logger: Logger;

    constructor(elements: FindReplaceElements, searchEngine: SearchEngine, plugin: VaultFindReplacePlugin) {
        this.elements = elements;
        this.searchEngine = searchEngine;
        this.logger = Logger.create(plugin, 'UIRenderer');
    }

    /**
     * Renders all search results in the UI
     * Groups results by file and creates collapsible sections
     * @param results - Array of search results to render
     * @param replaceText - Current replacement text for preview
     * @returns Array of line elements for selection management
     */
    renderResults(results: SearchResult[], replaceText: string): HTMLDivElement[] {
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

        Object.entries(resultsByFile).forEach(([filePath, fileResults]) => {
            const fileDiv = fileGroupsContainer.createEl('div');
            fileDiv.addClass('file-group');

            // Create file group header
            this.createFileGroupHeader(fileDiv, filePath, fileResults);

            // Create individual result lines
            fileResults.forEach((res) => {
                const lineDiv = this.createResultLine(fileDiv, res, replaceText, globalIndex);
                lineElements.push(lineDiv);
                globalIndex++;
            });

            fileCount += 1;
        });

        // Update UI elements with current results
        this.updateResultsUI(results.length, fileCount);

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
        fileResults: SearchResult[]
    ): void {
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
            if (this.isActivationKey(e)) {
                e.preventDefault();
                fileGroupHeading.click();
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

        // Store file path for event handling
        replaceAllFileBtn.setAttribute('data-file-path', filePath);
    }

    /**
     * Creates a UI element for a single search result line
     * @param container - Parent container element
     * @param result - The search result to render
     * @param replaceText - Current replacement text for preview
     * @param index - Global index of this result
     * @returns The created line element
     */
    private createResultLine(
        container: HTMLElement,
        result: SearchResult,
        replaceText: string,
        index: number
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
        span.setAttr('tabindex', 0);
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
        this.highlightMatchText(span, result.content, result.matchText, result.col, replaceText, result.pattern);

        // "Replace this match" button
        const replaceBtn = lineDiv.createEl('button', {
            cls: 'clickable-icon',
            attr: {
                'aria-label': 'Replace this match',
                'data-tooltip-position': 'top'
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
     */
    private highlightMatchText(
        container: HTMLElement,
        lineText: string,
        matchText: string,
        col: number | undefined,
        replaceText: string,
        pattern: string
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
                const regex = this.searchEngine.buildSearchRegex(pattern, {
                    matchCase: false, // Will be set properly by caller
                    wholeWord: false,
                    useRegex: false
                });
                regex.lastIndex = 0; // Reset regex state

                // Test the replacement on just the matched text
                const fakeMatch = regex.exec(mid);
                if (fakeMatch) {
                    // For now, just show simple replacement (will be enhanced with proper expansion)
                    const preview = replaceText;

                    // Only show preview if it's different from the original
                    if (preview !== mid) {
                        const previewSpan = document.createElement("span");
                        previewSpan.className = "replace-preview";
                        previewSpan.textContent = `${preview}`;
                        container.appendChild(previewSpan);
                    }
                }
            } catch (error) {
                // Ignore regex errors in preview
            }
        }

        // Add the text after the match
        if (after) container.appendChild(document.createTextNode(after));
    }

    /**
     * Updates UI elements based on current results state
     * @param resultCount - Number of search results
     * @param fileCount - Number of files containing results
     */
    updateResultsUI(resultCount: number, fileCount: number = 0): void {
        const hasResults = resultCount > 0;

        // Create descriptive text for result count
        const resultText = hasResults
            ? `${resultCount} result${resultCount !== 1 ? 's' : ''} in ${fileCount} file${fileCount > 1 ? 's' : ''}`
            : '0 results';

        // Update results count display
        this.elements.resultsCountEl?.setText(resultText);

        // Configure expand/collapse toolbar button
        if (this.elements.toolbarBtn) {
            this.elements.toolbarBtn.classList.toggle('hidden', !hasResults);

            if (hasResults) {
                setIcon(this.elements.toolbarBtn, 'copy-minus');
                this.elements.toolbarBtn.setAttr('aria-label', 'Collapse all');
            } else {
                setIcon(this.elements.toolbarBtn, 'copy-plus');
                this.elements.toolbarBtn.setAttr('aria-label', 'Expand all');
            }
        }

        // Enable/disable replace all button based on results
        this.elements.replaceAllVaultBtn?.toggleAttribute('disabled', !hasResults);

        // Show/hide results toolbar based on whether we have results
        this.elements.resultsToolbar?.classList.toggle('hidden', !hasResults);

        // Update collapse state tracking
        this.isCollapsed = !hasResults;

        // Update file group collapse state
        this.elements.resultsContainer?.querySelectorAll('.file-group').forEach(group => {
            group.classList.toggle('collapsed', !hasResults);
        });
    }

    /**
     * Toggles expand/collapse state for all file groups
     */
    toggleExpandCollapseAll(): void {
        this.elements.resultsContainer?.querySelectorAll(".file-group").forEach(group => {
            if (!this.isCollapsed) {
                // Currently expanded, so collapse all
                group.classList.add("collapsed");
                if (this.elements.toolbarBtn) {
                    setIcon(this.elements.toolbarBtn, 'copy-plus');
                    this.elements.toolbarBtn.setAttr('aria-label', "Expand all");
                }
            } else {
                // Currently collapsed, so expand all
                group.classList.remove("collapsed");
                if (this.elements.toolbarBtn) {
                    setIcon(this.elements.toolbarBtn, 'copy-minus');
                    this.elements.toolbarBtn.setAttr('aria-label', 'Collapse all');
                }
            }
        });
        this.isCollapsed = !this.isCollapsed;
    }

    /**
     * Clears all results from the UI
     */
    clearResults(): void {
        this.elements.resultsContainer.empty();
        this.updateResultsUI(0, 0);
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

        if (target.getAttribute('role') === 'button' && target.tagName === 'SPAN') {
            const key = event.key;
            return key === 'Enter' || key === ' ' || key === 'Spacebar';
        }
        return false;
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