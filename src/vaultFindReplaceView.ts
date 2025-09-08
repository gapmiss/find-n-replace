import { ItemView, WorkspaceLeaf, TFile, MarkdownView, type App, Notice, setIcon } from 'obsidian';
import { ConfirmModal } from "./modals";
import VaultFindReplacePlugin from "./main";

export const VIEW_TYPE_FIND_REPLACE = 'find-replace-view';

export interface SearchResult {
    file: TFile;
    line: number;
    content: string;
    matchText: string;
    col?: number | undefined;
    pattern: string;
}

export class FindReplaceView extends ItemView {
    containerEl: HTMLElement;
    searchInput: HTMLInputElement;
    replaceInput: HTMLInputElement;
    matchCaseCheckbox: HTMLElement;
    wholeWordCheckbox: HTMLElement;
    regexCheckbox: HTMLElement;
    resultsContainer: HTMLElement;
    // searchModeEl: HTMLElement;
    selectedCountEl: HTMLElement;
    replaceSelectedBtn: HTMLButtonElement;
    replaceAllVaultBtn: HTMLButtonElement;
    resultsToolbar: HTMLElement;
    toolbarBtn: HTMLButtonElement;
    isCollapsed: boolean;

    results: SearchResult[] = [];
    selectedIndices: Set<number> = new Set();
    lineElements: HTMLDivElement[] = [];
    private resultsCountEl: HTMLElement;
    plugin: VaultFindReplacePlugin;

    constructor(leaf: WorkspaceLeaf, app: App, plugin: VaultFindReplacePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return VIEW_TYPE_FIND_REPLACE; }
    getDisplayText(): string { return 'Vault Find & Replace'; }
    getIcon(): string { return 'text-search'; }

    async onOpen(): Promise<void> {
        this.containerEl.empty();
        this.containerEl.addClass('find-replace-container');
        this.isCollapsed = false;

        // Search input
        let findInputWrapper = this.containerEl.createDiv('find-replace-input-wrapper');
        this.searchInput = findInputWrapper.createEl('input', { type: 'text', cls: 'find-replace-input', placeholder: 'Find' }) as HTMLInputElement;
        findInputWrapper.createEl('button', { cls: 'clear-btn', attr: { 'aria-label': 'Clear input' } }) as HTMLInputElement;
        setTimeout(async () => {
            this.searchInput.focus();
        }, 100);

        // Replace input
        let replaceInputWrapper = this.containerEl.createDiv('find-replace-input-wrapper');
        this.replaceInput = replaceInputWrapper.createEl('input', { type: 'text', cls: 'find-replace-input', placeholder: 'Replace' }) as HTMLInputElement;
        replaceInputWrapper.createEl('button', { cls: 'clear-btn', attr: { 'aria-label': 'Clear input' } }) as HTMLInputElement;
        this.replaceInput.addEventListener("input", () => {
            // re-render results when replacement changes
            this.renderResults();
        });

        // Clear input button listeners
        const clearBtns = this.containerEl.querySelectorAll<HTMLButtonElement>(".clear-btn");
        clearBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const input = btn.previousElementSibling as HTMLInputElement;
                input.value = "";
                input.dispatchEvent(new Event("input")); // notify listeners
                input.focus();
            });
        });

        // Options
        const optionsDiv = this.containerEl.createDiv('find-replace-options');
        this.matchCaseCheckbox = this.createOption(optionsDiv, 'Match Case', 'match-case');
        this.wholeWordCheckbox = this.createOption(optionsDiv, 'Whole Word', 'whole-word');
        this.regexCheckbox = this.createOption(optionsDiv, 'Regex', 'regex');

        // Results toolbar
        this.resultsToolbar = this.containerEl.createDiv('find-replace-results-toolbar');
        this.resultsToolbar.classList.add('hidden');

        // Count display
        this.resultsCountEl = this.resultsToolbar.createDiv({ cls: 'find-replace-results-count', text: '0 results' });

        // Expand/collapse all
        this.toolbarBtn = this.resultsToolbar.createEl('button', { cls: 'collapse-toggle clickable-icon hidden', attr: { 'aria-label': 'Collapse all' } });
        setIcon(this.toolbarBtn!, 'copy-minus');
        this.toolbarBtn?.addEventListener("click", () => {
            this.resultsContainer?.querySelectorAll(".file-group").forEach(group => {
                if (!this.isCollapsed) {
                    group.classList.add("collapsed");
                    if (this.toolbarBtn) setIcon(this.toolbarBtn!, 'copy-plus');
                    this.toolbarBtn.setAttr('aria-label', "Expand all");
                } else {
                    group.classList.remove("collapsed");
                    if (this.toolbarBtn) setIcon(this.toolbarBtn!, 'copy-minus');
                    this.toolbarBtn.setAttr('aria-label', 'Collapse all');
                }
            });
            this.isCollapsed = !this.isCollapsed;
        });

        // Results container
        this.resultsContainer = this.containerEl.createDiv('find-replace-results');

        // this.searchModeEl = this.containerEl.createDiv("search-mode-status");
        // this.searchModeEl.style.cssText = "font-size: 0.8em; opacity: 0.7; margin-left: 8px;";
        // this.searchModeEl.setText("📂 Ready (no search yet)");


        // Replace selected controls
        const selectedContainer = this.containerEl.createDiv('find-replace-selected-all');

        this.selectedCountEl = selectedContainer.createEl('span', { text: '0 selected' });
        this.replaceSelectedBtn = selectedContainer.createEl('button', { text: 'Replace selected', attr: { 'disabled': true } });
        this.registerDomEvent(this.replaceSelectedBtn, 'click', async () => {
            await this.replaceSelectedMatches();
        });

        this.replaceAllVaultBtn = selectedContainer.createEl('button', { cls: 'find-replace-btn', attr: { 'disabled': true } });
        this.replaceAllVaultBtn.textContent = 'Replace all in vault';
        this.registerDomEvent(this.replaceAllVaultBtn, 'click', async () => {
            await this.replaceAllInVault();
        });

        this.containerEl.appendChild(selectedContainer);

        // Keyboard search on Enter
        const elements = [
            this.searchInput,
            this.replaceInput,
            this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox'),
            this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox'),
            this.regexCheckbox.querySelector('#toggle-regex-checkbox'),
        ].filter((el): el is HTMLInputElement => el instanceof HTMLInputElement);

        elements.forEach(el => {
            el.addEventListener('keydown', async (evt) => {
                if (evt.key === 'Enter') this.performSearch();
            });
        });
    }

    private createOption(parent: HTMLElement, label: string, id: string): HTMLElement {
        const toggleContainer = parent.createDiv('toggle-container');
        toggleContainer.createEl(
            'label',
            {
                text: `${label}:`,
                attr: {
                    'for': `toggle-${id}-checkbox`
                }
            }
        );
        const checkboxContainer = toggleContainer.createDiv('checkbox-container');
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
        checkboxContainer.addEventListener('click', () => {
            const isEnabled = checkboxContainer.classList.toggle('is-enabled');
            checkbox.checked = isEnabled;
        });

        return toggleContainer;
    }

    // async performSearch() {

    //     this.selectedCountEl.textContent = '0 selected';
    //     this.replaceAllVaultBtn.setAttr('disabled', true);
    //     const query = this.searchInput.value;
    //     const trimmedQuery = this.searchInput.value.trim();
    //     if (!trimmedQuery) {
    //         this.resultsContainer.empty();
    //         this.results = [];
    //         this.updateResultsUI();
    //         return;
    //     }
    //     const matchCase = (this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)!.checked;
    //     const wholeWord = (this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox') as HTMLInputElement)!.checked;
    //     const useRegex = (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.checked;

    //     if (useRegex) {
    //         try {
    //             this.buildSearchRegex();
    //         } catch (error) {
    //             console.warn(error);
    //             new Notice('Invalid regular expression. Please see the developer console for more information.', 5000);
    //             return;
    //         }
    //     }

    //     const results: SearchResult[] = [];
    //     for (const file of this.app.vault.getMarkdownFiles()) {
    //         const content = await this.app.vault.cachedRead(file);
    //         const lines = content.split('\n');

    //         for (let i = 0; i < lines.length; i++) {
    //             let line = lines[i];
    //             if (useRegex) {
    //                 // REGEX: collect every match with its position
    //                 const regex = this.buildSearchRegex();
    //                 let m: RegExpExecArray | null;
    //                 while ((m = regex.exec(line)) !== null) {
    //                     results.push({
    //                         file,
    //                         line: i,
    //                         content: line,
    //                         matchText: m[0],
    //                         col: m.index,
    //                         pattern: this.searchInput.value
    //                     });
    //                     // Prevent zero-width infinite loop
    //                     if (regex.lastIndex === m.index) regex.lastIndex++;
    //                 }
    //             } else {
    //                 // PLAIN TEXT (with optional whole-word): collect every occurrence
    //                 const haystack = matchCase ? line : line.toLowerCase();
    //                 const needle = matchCase ? query : query.toLowerCase();
    //                 if (!needle) continue; // (defensive) already guarded above
    //                 if (wholeWord) {
    //                     // Build a global word-boundary regex on the normalized haystack
    //                     const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    //                     const wordRe = new RegExp(`\\b${escaped}\\b`, 'g');
    //                     let m: RegExpExecArray | null;
    //                     while ((m = wordRe.exec(haystack)) !== null) {
    //                         const col = m.index;
    //                         results.push({
    //                             file,
    //                             line: i,
    //                             content: line,
    //                             matchText: line.substr(col, needle.length), // preserve original casing
    //                             col,
    //                             pattern: this.searchInput.value
    //                         });
    //                         if (wordRe.lastIndex === col) wordRe.lastIndex++;
    //                     }
    //                 } else {
    //                     // Repeated indexOf scan to get all occurrences
    //                     let start = 0;
    //                     while (true) {
    //                         const idx = haystack.indexOf(needle, start);
    //                         if (idx === -1) break;
    //                         results.push({
    //                             file,
    //                             line: i,
    //                             content: line,
    //                             matchText: line.substr(idx, needle.length), // original casing
    //                             col: idx,
    //                             pattern: this.searchInput.value
    //                         });
    //                         start = idx + Math.max(needle.length, 1);
    //                     }
    //                 }
    //             }
    //         }
    //     }

    //     this.results = results;
    //     results.sort((a, b) => {
    //         // First: file path (alphabetical)
    //         if (a.file.path < b.file.path) return -1;
    //         if (a.file.path > b.file.path) return 1;
    //         // Then: line number
    //         if (a.line !== b.line) return a.line - b.line;
    //         // Then: column (fallback to 0 if missing)
    //         const colA = typeof a.col === "number" ? a.col : 0;
    //         const colB = typeof b.col === "number" ? b.col : 0;
    //         return colA - colB;
    //     });
    //     this.renderResults();

    //     this.selectedIndices.clear();
    //     this.replaceSelectedBtn.setAttr('disabled', true);
    // }

    // async performSearch() {
    //     this.selectedCountEl.textContent = '0 selected';
    //     this.replaceAllVaultBtn.setAttr('disabled', true);

    //     const query = this.searchInput.value;
    //     const trimmedQuery = query.trim();
    //     if (!trimmedQuery) {
    //         this.resultsContainer.empty();
    //         this.results = [];
    //         this.updateResultsUI();
    //         return;
    //     }

    //     const matchCase = (this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)!.checked;
    //     const wholeWord = (this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox') as HTMLInputElement)!.checked;
    //     const useRegex = (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.checked;

    //     const results: SearchResult[] = [];
    //     const files = this.app.vault.getMarkdownFiles();

    //     // Prebuild regex
    //     let regex: RegExp | null = null;
    //     if (useRegex || wholeWord) {
    //         regex = this.buildSearchRegex();
    //     }

    //     let lastYield = Date.now();

    //     for (const file of files) {
    //         const content = await this.app.vault.read(file);

    //         if (useRegex && regex) {
    //             // Special case for /.*/ or /./
    //             if (regex.source === '.' || regex.source === '.*') {
    //                 // One match per line
    //                 let lineStart = 0;
    //                 for (let i = 0; i < content.length; i++) {
    //                     if (content[i] === '\n' || i === content.length - 1) {
    //                         const lineText = content.slice(lineStart, i + 1);
    //                         results.push({
    //                             file,
    //                             line: content.slice(0, lineStart).split('\n').length - 1,
    //                             content: lineText,
    //                             matchText: lineText,
    //                             col: 0,
    //                             pattern: query
    //                         });
    //                         lineStart = i + 1;
    //                     }
    //                 }
    //                 continue;
    //             }

    //             let m: RegExpExecArray | null;
    //             regex.lastIndex = 0;
    //             while ((m = regex.exec(content)) !== null) {
    //                 // Compute line number and column
    //                 const beforeMatch = content.slice(0, m.index);
    //                 const lineNumber = beforeMatch.split('\n').length - 1;
    //                 const lineStart = beforeMatch.lastIndexOf('\n') + 1;
    //                 const col = m.index - lineStart;

    //                 // Extract full line content for context
    //                 const nextNewline = content.indexOf('\n', m.index);
    //                 const lineEnd = nextNewline === -1 ? content.length : nextNewline;
    //                 const lineText = content.slice(lineStart, lineEnd);

    //                 results.push({
    //                     file,
    //                     line: lineNumber,
    //                     content: lineText,
    //                     matchText: m[0],
    //                     col,
    //                     pattern: query
    //                 });

    //                 if (regex.lastIndex === m.index) regex.lastIndex++;
    //             }
    //         } else {
    //             // Plain text search
    //             const haystack = matchCase ? content : content.toLowerCase();
    //             const needle = matchCase ? query : query.toLowerCase();
    //             if (!needle) continue;

    //             let start = 0;
    //             while (true) {
    //                 const idx = haystack.indexOf(needle, start);
    //                 if (idx === -1) break;

    //                 // Compute line number and column
    //                 const beforeMatch = content.slice(0, idx);
    //                 const lineNumber = beforeMatch.split('\n').length - 1;
    //                 const lineStart = beforeMatch.lastIndexOf('\n') + 1;
    //                 const col = idx - lineStart;
    //                 const nextNewline = content.indexOf('\n', idx);
    //                 const lineEnd = nextNewline === -1 ? content.length : nextNewline;
    //                 const lineText = content.slice(lineStart, lineEnd);

    //                 results.push({
    //                     file,
    //                     line: lineNumber,
    //                     content: lineText,
    //                     matchText: content.slice(idx, idx + needle.length),
    //                     col,
    //                     pattern: query
    //                 });

    //                 start = idx + Math.max(needle.length, 1);
    //             }
    //         }

    //         // Yield to UI
    //         if (Date.now() - lastYield > 50) {
    //             await new Promise(r => setTimeout(r, 0));
    //             lastYield = Date.now();
    //         }
    //     }

    //     // Sort results
    //     results.sort((a, b) => {
    //         if (a.file.path < b.file.path) return -1;
    //         if (a.file.path > b.file.path) return 1;
    //         if (a.line !== b.line) return a.line - b.line;
    //         const colA = typeof a.col === "number" ? a.col : 0;
    //         const colB = typeof b.col === "number" ? b.col : 0;
    //         return colA - colB;
    //     });

    //     this.results = results;
    //     this.renderResults();

    //     this.selectedIndices.clear();
    //     this.replaceSelectedBtn.setAttr('disabled', true);
    // }

    async performSearch() {
        this.selectedCountEl.textContent = '0 selected';
        this.replaceAllVaultBtn.setAttr('disabled', true);

        const query = this.searchInput.value;
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            this.resultsContainer.empty();
            this.results = [];
            this.updateResultsUI();
            return;
        }

        const matchCase = (this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)!.checked;
        const wholeWord = (this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox') as HTMLInputElement)!.checked;
        const useRegex = (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.checked;

        const results: SearchResult[] = [];
        const files = this.app.vault.getMarkdownFiles();

        // Prebuild regex
        let regex: RegExp | null = null;
        if (useRegex || wholeWord) {
            regex = this.buildSearchRegex();
        }

        const BATCH_SIZE = 10;   // number of files per batch
        const YIELD_DELAY = 0;   // ms delay between batches
        let lastYield = Date.now();

        // Process files in batches
        for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
            const batch = files.slice(batchStart, batchStart + BATCH_SIZE);

            await Promise.all(batch.map(async (file) => {
                const content = await this.app.vault.read(file);
                const lines = content.split('\n');

                const isDotRegex = useRegex && regex && (regex.source === '.' || regex.source === '.*');
                if (isDotRegex) {
                    for (let i = 0; i < lines.length; i++) {
                        const lineText = lines[i];
                        if (lineText.trim() === '') continue;

                        results.push({
                            file,
                            line: i,
                            content: lineText,
                            matchText: lineText,
                            col: 0,
                            pattern: query
                        });
                    }
                    return;
                }

                for (let i = 0; i < lines.length; i++) {
                    const lineText = lines[i];
                    if (lineText.trim() === '') continue;

                    if ((useRegex || wholeWord) && regex) {
                        for (const m of lineText.matchAll(regex)) {
                            if (!m[0]) continue;
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
                        const haystack = matchCase ? lineText : lineText.toLowerCase();
                        const needle = matchCase ? query : query.toLowerCase();
                        if (!needle) continue;

                        let start = 0;
                        while (true) {
                            const idx = haystack.indexOf(needle, start);
                            if (idx === -1) break;
                            results.push({
                                file,
                                line: i,
                                content: lineText,
                                matchText: lineText.slice(idx, idx + needle.length),
                                col: idx,
                                pattern: query
                            });
                            start = idx + Math.max(needle.length, 1);
                        }
                    }
                }
            }));

            // Yield to UI between batches
            await new Promise(r => setTimeout(r, YIELD_DELAY));
            if (Date.now() - lastYield > 50) {
                this.renderResults(); // progressive rendering
                lastYield = Date.now();
            }
        }

        results.sort((a, b) => {
            if (a.file.path < b.file.path) return -1;
            if (a.file.path > b.file.path) return 1;
            if (a.line !== b.line) return a.line - b.line;
            const colA = typeof a.col === "number" ? a.col : 0;
            const colB = typeof b.col === "number" ? b.col : 0;
            return colA - colB;
        });

        this.results = results;
        this.renderResults();
        this.selectedIndices.clear();
        this.replaceSelectedBtn.setAttr('disabled', true);
    }



    private async applyReplacements(file: TFile, matches: SearchResult[], replaceAllInFile: boolean = false) {
        let content = await this.app.vault.read(file);
        const lines = content.split('\n');

        const regex = this.buildSearchRegex();

        if (replaceAllInFile) {
            // Replace once per unique line (prevents repeated passes)
            const uniqueLines = Array.from(new Set(matches.map(m => m.line)));
            for (const lineNum of uniqueLines) {
                const lineText = lines[lineNum] ?? '';
                lines[lineNum] = lineText.replace(regex, (match, ...rest: any[]) => {
                    // rest = [group1, group2, ..., offset, input]
                    const offset = rest[rest.length - 2] as number;
                    const input = rest[rest.length - 1] as string;
                    const groups = rest.slice(0, -2) as string[];

                    // Reconstruct a RegExpExecArray-like object so expandReplacement sees groups & index
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

            for (const res of matches) {
                const lineText = lines[res.line] ?? '';
                let matchArr: RegExpExecArray | null;
                regex.lastIndex = 0;
                while ((matchArr = regex.exec(lineText)) !== null) {
                    if (matchArr.index === res.col) {
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

        await this.app.vault.modify(file, lines.join('\n'));
    }

    private expandReplacement(matchArr: RegExpExecArray, replacement: string, input: string): string {
        // Handles $1, $&, $$, $` and $' and escaped \n/\t.
        // If regex mode is OFF we return the replacement literally.
        const isRegex = (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.checked;
        if (!isRegex) return replacement;

        const offset = matchArr.index ?? 0;
        let out = replacement;

        // numbered groups: $1, $2, ...
        out = out.replace(/\$(\d+)/g, (_, n) => matchArr[Number(n)] ?? '');

        // special tokens
        out = out
            .replace(/\$\$/g, '$')           // $$ -> $
            .replace(/\$&/g, matchArr[0])    // $& -> whole match
            .replace(/\$`/g, input.slice(0, offset))                       // $` -> prefix
            .replace(/\$'/g, input.slice(offset + (matchArr[0]?.length ?? 0))); // $' -> suffix

        // escaped whitespace
        out = out.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

        return out;
    }

    private buildSearchRegex(): RegExp {
        const isRegex = (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.checked;
        const isWholeWord = (this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox') as HTMLInputElement)!.checked;
        const isMatchCase = (this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)!.checked;
        let pattern = this.searchInput.value ?? '';

        // If regex mode is off, escape the user's input so it's treated literally.
        if (!isRegex) {
            pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        // Defensive check: if user-provided regex already contains anchors or boundaries,
        // don't automatically wrap — that could change an intentional pattern.
        const looksAnchoredOrHasBoundaries = /(^\\b|\\b$|\^|\$|\(\?<!|\(\?=|\(\?!|\(\?<=)/.test(pattern);

        if (isWholeWord && !looksAnchoredOrHasBoundaries) {
            // When regex mode is ON we wrap in a non-capturing group so existing capture groups
            // inside the user's pattern keep their indices.
            pattern = isRegex ? `\\b(?:${pattern})\\b` : `\\b${pattern}\\b`;
        }

        const flags = (isMatchCase ? '' : 'i') + 'g';
        return new RegExp(pattern, flags);
    }

    private renderResults() {
        this.resultsContainer.empty();
        this.lineElements = [];



        this.resultsContainer?.querySelectorAll(".file-group").forEach(group => {
            group.classList.add("collapsed");
        });

        const resultsByFile: Record<string, SearchResult[]> = {};
        this.results.forEach(r => {
            const path = r.file.path;
            if (!resultsByFile[path]) resultsByFile[path] = [];
            resultsByFile[path].push(r);
        });

        const fileGroupsContainer = this.resultsContainer.createDiv('file-groups-container');
        let fileCount = 0;
        Object.entries(resultsByFile).forEach(([filePath, fileResults]) => {
            const fileDiv = fileGroupsContainer.createEl('div');
            fileDiv.addClass('file-group');

            const header = fileDiv.createDiv('file-group-header');
            const fileGroupHeading = header.createSpan({ cls: 'file-group-heading', text: filePath.replace('.md', ''), attr: { 'tabindex': 0, 'role': 'button' } });
            fileGroupHeading.addEventListener('click', () => {
                const group = fileGroupHeading.closest('.file-group');
                if (group) group.classList.toggle('collapsed');
            });
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
                        target.click();
                    }
                }
            });
            header.createSpan({ cls: 'file-results-count', text: ` (${fileResults.length})` });

            const replaceAllFileBtn = header.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': `Replace all in "${filePath.replace('.md', '')}"`, 'data-tooltip-position': 'top' } });
            setIcon(replaceAllFileBtn, 'replace-all');
            this.registerDomEvent(replaceAllFileBtn, 'click', async () => {
                const confirmMessage = this.replaceInput.value === ''
                    ? `Replace all matches in "${filePath}" with an empty value? This action cannot be undone.`
                    : `Replace all matches in "${filePath}?" This action cannot be undone.`;

                const confirmed = await this.confirmReplaceEmpty(confirmMessage);
                if (!confirmed) return;

                // Try to find any results for this path first
                const fileResults = this.results.filter(r => r.file.path === filePath);
                let file: TFile | null = fileResults.length ? fileResults[0].file : null;

                // Fallback: resolve path through the vault
                if (!file) {
                    const af = this.app.vault.getAbstractFileByPath(filePath);
                    if (af && af instanceof TFile) file = af;
                }

                if (!file) {
                    new Notice(`Cannot locate file ${filePath}. Aborting replace.`);
                    return;
                }

                await this.dispatchReplace("file", file);

                this.performSearch();
            });

            fileResults.forEach((res, idx) => {
                const lineDiv = fileDiv.createDiv({ cls: 'line-result' });
                if (typeof res.col === "number" && res.col >= 0) {
                    lineDiv.setAttr('aria-label', `line ${res.line + 1}, col ${res.col + 1}`);
                } else {
                    lineDiv.setAttr('aria-label', `line ${res.line + 1}`);
                }
                lineDiv.setAttr('data-tooltip-position', 'top');

                const span = lineDiv.createSpan('snippet');
                span.setAttr('tabindex', 0);
                span.setAttr('role', 'button');
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
                            target.click();
                        }
                    }
                });
                span.addEventListener('click', async (e) => {
                    if (e.metaKey || e.ctrlKey) return;
                    const matchIndex = res.content.toLowerCase().indexOf(
                        res.matchText.toLowerCase(),
                        res.col ?? 0
                    );
                    this.openFileAtLine(res.file, res.line, matchIndex, res.matchText, span);
                });
                this.highlightMatchText(span, res.content, res.matchText, res.col);

                const replaceBtn = lineDiv.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Replace this match', 'data-tooltip-position': 'top' } });
                setIcon(replaceBtn, 'replace');
                this.registerDomEvent(replaceBtn, 'click', async () => {
                    if (!this.replaceInput || this.replaceInput.value === '') {
                        const confirmed = await this.confirmReplaceEmpty('Replace match with empty content? This cannot be undone.');
                        if (!confirmed) return; // user cancelled
                    }
                    await this.dispatchReplace("one", res);

                    this.performSearch();
                });

                this.lineElements.push(lineDiv);
            });
            fileCount += 1;
        });

        // console.log(fileCount);
        this.updateResultsUI(fileCount);

        this.setupKeyboardNavigation();
    }

    private updateResultsUI(fileCount: number = 0) {
        const resultCount = this.results.length;
        const hasResults = resultCount > 0;
        const resultText = hasResults
            ? `${resultCount} result${resultCount !== 1 ? 's' : ''} in ${fileCount} file${fileCount > 1 ? 's' : ''}`
            : '0 results';

        // Update results count
        this.resultsCountEl?.setText(resultText);

        // Configure toolbar button with null safety
        if (this.toolbarBtn) {
            this.toolbarBtn.classList.toggle('hidden', !hasResults);

            if (hasResults) {
                setIcon(this.toolbarBtn, 'copy-minus');
                this.toolbarBtn.setAttr('aria-label', 'Collapse all');
            } else {
                setIcon(this.toolbarBtn, 'copy-plus');
                this.toolbarBtn.setAttr('aria-label', 'Expand all');
            }
        }

        // Configure replace button with null safety
        this.replaceAllVaultBtn?.toggleAttribute('disabled', !hasResults);

        // Show/hide results toolbar
        this.resultsToolbar?.classList.toggle('hidden', !hasResults);

        // Update collapse state
        this.isCollapsed = !hasResults;

        // Update file groups - single DOM query with optimized toggle
        this.resultsContainer?.querySelectorAll('.file-group').forEach(group => {
            group.classList.toggle('collapsed', !hasResults);
        });
    }

    private highlightMatchText(
        container: HTMLElement,
        lineText: string,
        matchText: string,
        col?: number
    ) {
        container.empty();

        const matchIndex = lineText.toLowerCase().indexOf(
            matchText.toLowerCase(),
            col ?? 0
        );

        if (matchIndex === -1) {
            container.appendChild(document.createTextNode(lineText));
            return;
        }

        const matchLen = matchText.length;

        const beforeContext = 10;
        const afterContext = 50;

        const start = Math.max(0, matchIndex - beforeContext);
        const end = Math.min(lineText.length, matchIndex + matchLen + afterContext);

        let before = lineText.slice(start, matchIndex);
        const mid = lineText.slice(matchIndex, matchIndex + matchLen);
        let after = lineText.slice(matchIndex + matchLen, end);

        if (start > 0) before = "… " + before;
        if (end < lineText.length) after = after + " …";

        if (before) container.appendChild(document.createTextNode(before));

        const mark = document.createElement("mark");
        mark.textContent = mid;
        container.appendChild(mark);

        // === NEW: replacement preview ===
        if (this.replaceInput?.value) {
            const regex = this.buildSearchRegex();
            regex.lastIndex = 0;

            const fakeMatch = regex.exec(mid);
            if (fakeMatch) {
                const preview = this.expandReplacement(fakeMatch, this.replaceInput.value, lineText);
                if (preview !== mid) {
                    const previewSpan = document.createElement("span");
                    previewSpan.className = "replace-preview";
                    previewSpan.textContent = `${preview}`;
                    container.appendChild(previewSpan);
                }
            }
        }

        if (after) container.appendChild(document.createTextNode(after));
    }

    async replaceAllInVault() {
        if (!this.results || this.results.length === 0) {
            new Notice('No results to replace.');
            return;
        }

        const confirmMessage = this.replaceInput.value === ''
            ? 'Replace all matches across the vault with an empty value? This action cannot be undone.'
            : 'Replace all matches across the vault? This action cannot be undone.';

        const confirmed = await this.confirmReplaceEmpty(confirmMessage);
        if (!confirmed) return;

        await this.dispatchReplace("vault");

        this.performSearch();
    }

    private async replaceSelectedMatches() {
        if (!this.selectedIndices.size) return; // none selected
        if (!this.replaceInput || this.replaceInput.value === '') {
            const confirmed = await this.confirmReplaceEmpty('Replace selected matches with empty content? This cannot be undone.');
            if (!confirmed) return; // user cancelled
        }
        const toReplace = Array.from(this.selectedIndices).map(i => this.results[i]);
        for (const res of toReplace) await this.dispatchReplace("selected");

        this.selectedIndices.clear();

        this.performSearch();
    }

    private async dispatchReplace(
        mode: "one" | "selected" | "file" | "vault",
        target?: SearchResult | TFile
    ) {
        const grouped = new Map<TFile, SearchResult[]>();

        switch (mode) {
            case "one": {
                const res = target as SearchResult;
                grouped.set(res.file, [res]);
                break;
            }

            case "selected": {
                for (const idx of this.selectedIndices) {
                    const res = this.results[idx];
                    if (!grouped.has(res.file)) grouped.set(res.file, []);
                    grouped.get(res.file)!.push(res);
                }
                break;
            }

            case "file": {
                const file = target as TFile;
                const fileResults = this.results.filter(r => r.file.path === file.path);
                if (fileResults.length) grouped.set(file, fileResults);
                break;
            }

            case "vault": {
                for (const res of this.results) {
                    if (!grouped.has(res.file)) grouped.set(res.file, []);
                    grouped.get(res.file)!.push(res);
                }
                break;
            }
        }

        let total = 0;
        for (const [file, matches] of grouped) {
            const replaceAllInFile = mode === "file" || mode === "vault";
            await this.applyReplacements(file, matches, replaceAllInFile);
            total += matches.length;
        }

        if (mode === 'vault') {
            new Notice('All matches replaced');
        } else {
            if (total > 0) {
                new Notice(`${total} match${total > 1 ? 'es' : ''} replaced`);
            }
        }

        this.selectedIndices.clear();
        this.performSearch();
    }

    private setupKeyboardNavigation() {
        if (!this.lineElements.length) return;
        this.lineElements.forEach((el, idx) => {
            this.registerDomEvent(el, 'click', (e: MouseEvent) => {
                if (e.metaKey || e.ctrlKey) {
                    if (this.selectedIndices.has(idx)) this.selectedIndices.delete(idx);
                    else this.selectedIndices.add(idx);
                    this.updateSelectionStyles();
                }
            });
        });
    }

    private updateSelectionStyles() {
        this.lineElements.forEach((el, idx) => {
            if (this.selectedIndices.has(idx)) el.classList.add('selected');
            else el.classList.remove('selected');
        });
        if (this.selectedCountEl) this.selectedCountEl.textContent = `${this.selectedIndices.size} selected`;
        if (this.selectedIndices.size < 1) {
            this.replaceSelectedBtn.setAttr('disabled', true);
        } else {
            this.replaceSelectedBtn.removeAttribute('disabled');
        }
    }

    private async openFileAtLine(file: TFile, line: number, col: number | undefined, matchText: string, snippet: HTMLSpanElement) {
        // Find or open leaf
        const existingLeaves = this.app.workspace.getLeavesOfType('markdown');
        let leaf = existingLeaves.find(l => l.view instanceof MarkdownView && l.view.file?.path === file.path);
        if (!leaf) {
            leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(file);
            this.app.workspace.revealLeaf(leaf);
        } else {
            this.app.workspace.revealLeaf(leaf);
        }

        const mdView = leaf.view as MarkdownView;
        let viewState = leaf.getViewState();
        // If in reading (preview) mode, change mode to source
        if (viewState.state!.mode === 'preview') {
            await leaf.setViewState({
                type: 'markdown',
                state: {
                    file: file.path,
                    mode: 'source'
                },
            })
        }

        if (!mdView?.editor) return;

        const editor = mdView.editor;
        // Determine start and end of match
        const lineContent = editor.getLine(line);
        let chStart = col ?? 0;
        let chEnd = 0;
        if (matchText) {
            if (chStart !== -1) chEnd = col! + matchText.length;
        }
        // Set selection and focus editor
        editor.setSelection({ line, ch: chStart }, { line, ch: chEnd });
        editor.focus();
        setTimeout(async () => {
            snippet.focus();
        }, 100);

        // CM6 for centering
        const cmView = (editor as any).cm; // cmView is any
        if (cmView) {
            const pos = editor.posToOffset({ line, ch: chStart });
            cmView.dispatch({
                effects: cmView.constructor.scrollIntoView(pos, { y: 'center' })
            });
        }
    }

    private async confirmReplaceEmpty(message: string): Promise<boolean> {
        const modal = new ConfirmModal(this.app, message);
        modal.open();

        // Wait until modal closes
        await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                if (!modal.isOpen) {
                    clearInterval(interval);
                    resolve();
                }
            }, 50);
        });

        return modal.result; // true = confirmed, false = cancelled
    }

}
