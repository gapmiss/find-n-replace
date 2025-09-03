import { ItemView, WorkspaceLeaf, TFile, MarkdownView, type App, Notice, Modal, setIcon } from 'obsidian';

export const VIEW_TYPE_FIND_REPLACE = 'find-replace-view';

export interface SearchResult {
    file: TFile;
    line: number;
    content: string;
    matchText: string;
    col?: number | undefined;
}

export class FindReplaceView extends ItemView {
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
    toolbarBtn: HTMLButtonElement;
    resultsToolbar: HTMLElement;

    results: SearchResult[] = [];
    selectedIndices: Set<number> = new Set();
    lineElements: HTMLDivElement[] = [];
    private resultsCountEl: HTMLElement;

    constructor(leaf: WorkspaceLeaf, app: App) {
        super(leaf);
        this.renderUI();
    }

    getViewType(): string { return VIEW_TYPE_FIND_REPLACE; }
    getDisplayText(): string { return 'Vault Find & Replace'; }
    getIcon(): string { return 'text-search'; }

    private renderUI() {
        this.containerEl.empty();
        this.containerEl.addClass('find-replace-container');

        // Search input
        let findInputWrapper = this.containerEl.createDiv('find-replace-input-wrapper');
        this.searchInput = findInputWrapper.createEl('input', { type: 'text', cls: 'find-replace-input', placeholder: 'Find' }) as HTMLInputElement;
        let findClearBtn = findInputWrapper.createEl('button', { cls: 'clear-btn', attr: { 'aria-label': 'Clear input' } }) as HTMLInputElement;
        setIcon(findClearBtn, 'circle-x');
        setTimeout(async () => {
            this.searchInput.focus();
        }, 100);

        // Replace input
        let replaceInputWrapper = this.containerEl.createDiv('find-replace-input-wrapper');
        this.replaceInput = replaceInputWrapper.createEl('input', { type: 'text', cls: 'find-replace-input', placeholder: 'Replace' }) as HTMLInputElement;
        let replaceClearBtn = replaceInputWrapper.createEl('button', { cls: 'clear-btn', attr: { 'aria-label': 'Clear input' } }) as HTMLInputElement;
        setIcon(replaceClearBtn, 'circle-x');

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

        let collapsed = false;

        this.toolbarBtn?.addEventListener("click", () => {
            collapsed = !collapsed;
            this.resultsContainer?.querySelectorAll(".file-group").forEach(group => {
                if (collapsed) {
                    group.classList.add("collapsed");
                    if (this.toolbarBtn) setIcon(this.toolbarBtn!, 'copy-plus');
                    this.toolbarBtn.setAttr('aria-label', "Expand all");
                } else {
                    group.classList.remove("collapsed");
                    if (this.toolbarBtn) setIcon(this.toolbarBtn!, 'copy-minus');
                    this.toolbarBtn.setAttr('aria-label', 'Collapse all');
                }
            });
        });

        // Results container
        this.resultsContainer = this.containerEl.createDiv('find-replace-results');

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

    async performSearch() {

        this.selectedCountEl.textContent = '0 selected';
        this.replaceAllVaultBtn.setAttr('disabled', true);
        const query = this.searchInput.value;
        const trimmedQuery = this.searchInput.value.trim();
        if (!trimmedQuery) {
            this.resultsContainer.empty();
            this.resultsCountEl.textContent = '0 results';
            // this.toolbarBtn.classList.add('hidden');
            this.resultsToolbar.classList.add('hidden');
            return;
        }
        const matchCase = (this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)!.checked;
        const wholeWord = (this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox') as HTMLInputElement)!.checked;
        const useRegex = (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.checked;

        const results: SearchResult[] = [];

        for (const file of this.app.vault.getMarkdownFiles()) {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                if (useRegex) {
                    // REGEX: collect every match with its position
                    const flags = matchCase ? 'g' : 'gi';
                    const regex = new RegExp(query, flags);
                    let m: RegExpExecArray | null;
                    while ((m = regex.exec(line)) !== null) {
                        results.push({
                            file,
                            line: i,
                            content: line,
                            matchText: m[0],
                            col: m.index
                        });
                        // Prevent zero-width infinite loop
                        if (regex.lastIndex === m.index) regex.lastIndex++;
                    }
                } else {
                    // PLAIN TEXT (with optional whole-word): collect every occurrence
                    const haystack = matchCase ? line : line.toLowerCase();
                    const needle = matchCase ? query : query.toLowerCase();
                    if (!needle) continue; // (defensive) already guarded above
                    if (wholeWord) {
                        // Build a global word-boundary regex on the normalized haystack
                        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const wordRe = new RegExp(`\\b${escaped}\\b`, 'g');
                        let m: RegExpExecArray | null;
                        while ((m = wordRe.exec(haystack)) !== null) {
                            const col = m.index;
                            results.push({
                                file,
                                line: i,
                                content: line,
                                matchText: line.substr(col, needle.length), // preserve original casing
                                col
                            });
                            if (wordRe.lastIndex === col) wordRe.lastIndex++;
                        }
                    } else {
                        // Repeated indexOf scan to get all occurrences
                        let start = 0;
                        while (true) {
                            const idx = haystack.indexOf(needle, start);
                            if (idx === -1) break;
                            results.push({
                                file,
                                line: i,
                                content: line,
                                matchText: line.substr(idx, needle.length), // original casing
                                col: idx
                            });
                            start = idx + Math.max(needle.length, 1);
                        }
                    }
                }
            }
        }

        this.results = results;
        results.sort((a, b) => {
            // First: file path (alphabetical)
            if (a.file.path < b.file.path) return -1;
            if (a.file.path > b.file.path) return 1;
            // Then: line number
            if (a.line !== b.line) return a.line - b.line;
            // Then: column (fallback to 0 if missing)
            const colA = typeof a.col === "number" ? a.col : 0;
            const colB = typeof b.col === "number" ? b.col : 0;
            return colA - colB;
        });
        this.renderResults();

        this.selectedIndices.clear();
        this.replaceSelectedBtn.setAttr('disabled', true);
    }

    private renderResults() {
        this.resultsContainer.empty();
        this.lineElements = [];

        if (this.toolbarBtn) this.toolbarBtn.setAttr('aria-label', 'Collapse all');
        if (this.toolbarBtn) setIcon(this.toolbarBtn!, 'copy-minus');
        if (this.toolbarBtn) this.toolbarBtn.classList.remove('hidden');

        this.resultsToolbar.classList.remove('hidden');

        this.resultsContainer?.querySelectorAll(".file-group").forEach(group => {
            group.classList.add("collapsed");
        });

        if (this.results.length === 0) {
            this.replaceAllVaultBtn.setAttr('disabled', true);
            this.toolbarBtn.classList.add('hidden');
        } else {
            this.resultsCountEl.textContent = `${this.results.length} result${this.results.length !== 1 ? 's' : ''}`;
            this.replaceAllVaultBtn.removeAttribute('disabled');
        }

        const resultsByFile: Record<string, SearchResult[]> = {};
        this.results.forEach(r => {
            const path = r.file.path;
            if (!resultsByFile[path]) resultsByFile[path] = [];
            resultsByFile[path].push(r);
        });

        const fileGroupsContainer = this.resultsContainer.createDiv('file-groups-container');
        Object.entries(resultsByFile).forEach(([filePath, fileResults]) => {
            const fileDiv = fileGroupsContainer.createEl('div');
            fileDiv.addClass('file-group');

            const header = fileDiv.createEl('div');
            header.addClass('file-group-header');
            header.createDiv({ cls: 'file-group-heading', text: filePath.replace('.md', '') });
            header.createSpan({ cls: 'file-results-count', text: ` (${fileResults.length})` });

            const replaceAllFileBtn = header.createEl('button', { text: 'Replace all in file', cls: 'clickable-icon', attr: { 'aria-label': `Replace all in ${filePath.replace('.md', '')}`, 'data-tooltip-position': 'top' } });
            setIcon(replaceAllFileBtn, 'replace-all');
            this.registerDomEvent(replaceAllFileBtn, 'click', async () => {
                const confirmMessage = this.replaceInput.value === ''
                    ? `Replace all matches in "${filePath}" with an empty value? This action cannot be undone.`
                    : `Replace all matches in "${filePath}?" This action cannot be undone.`;

                const confirmed = await this.confirmReplaceEmpty(confirmMessage);
                if (!confirmed) return;

                for (const res of fileResults) await this.replaceResult(res, true);
                new Notice(`All replacements done in ${filePath}`);

                this.performSearch();
            });

            fileResults.forEach((res, idx) => {
                const lineDiv = fileDiv.createDiv({ cls: 'line-result', attr: { 'tabindex': 0 } });

                const span = lineDiv.createEl('span');
                this.highlightMatchText(span, res.file, res.content, res.matchText, res.line, res.col);

                const tags = lineDiv.createEl('span');
                if (typeof res.col === "number" && res.col >= 0) {
                    tags.setText(`${res.file.path} (line ${res.line + 1}, col ${res.col + 1})`);
                } else {
                    tags.setText(`${res.file.path} (line ${res.line + 1})`);
                }

                const replaceBtn = lineDiv.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Replace this match', 'data-tooltip-position': 'top' } });
                setIcon(replaceBtn, 'replace');
                this.registerDomEvent(replaceBtn, 'click', async () => {
                    if (!this.replaceInput || this.replaceInput.value === '') {
                        const confirmed = await this.confirmReplaceEmpty('Replace match with empty content? This cannot be undone.');
                        if (!confirmed) return; // user cancelled
                    }
                    await this.replaceResult(res);
                    new Notice(`Replacement done`);

                    this.performSearch();
                });

                this.lineElements.push(lineDiv);
            });
        });

        this.containerEl.querySelectorAll('.file-group-header').forEach(header => {
            header.addEventListener('click', () => {
                const group = header.closest('.file-group');
                if (group) group.classList.toggle('collapsed');
            });
        });

        this.setupKeyboardNavigation();
    }

    private highlightMatchText(container: HTMLElement, file: TFile, lineText: string, matchText: string, line: number, col?: number) {
        container.empty(); // remove previous content

        // If we have an exact column, highlight just that one occurrence.
        if (typeof col === 'number' && col >= 0) {
            const before = lineText.slice(0, col);
            const mid = lineText.slice(col, col + matchText.length);
            const after = lineText.slice(col + matchText.length);
            if (before) container.appendChild(document.createTextNode(before));
            const mark = document.createElement('mark');
            mark.textContent = mid;
            container.appendChild(mark);
            this.registerDomEvent(mark, 'click', async () => {
                this.openFileAtLine(file, line, col, matchText);
            });
            if (after) container.appendChild(document.createTextNode(after));
            return;
        }
        // Fallback: highlight ALL matches of the same text (previous behavior)
        let lastIndex = 0;
        const regex = new RegExp(matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let m: RegExpExecArray | null;
        while ((m = regex.exec(lineText)) !== null) {
            if (m.index > lastIndex) {
                container.appendChild(document.createTextNode(lineText.slice(lastIndex, m.index)));
            }
            const mark = document.createElement('mark');
            mark.textContent = m[0];
            container.appendChild(mark);
            lastIndex = m.index + m[0].length;
            if (regex.lastIndex === m.index) regex.lastIndex++;
        }
        if (lastIndex < lineText.length) {
            container.appendChild(document.createTextNode(lineText.slice(lastIndex)));
        }
    }

    private async replaceResult(res: SearchResult, replaceAll: boolean = false) {
        const content = await this.app.vault.read(res.file);
        let updated: string;
        if (replaceAll) {
            let flags = 'g'; // always global
            if (!(this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)!.checked) flags += 'i'; // add ignore-case if needed
            updated = content.replace(new RegExp(res.matchText, flags), this.replaceInput.value);
        } else {
            const lines = content.split('\n');
            const lineText = lines[res.line] ?? '';
            if (typeof res.col === 'number' && res.col >= 0) {
                // Replace exactly the matched span
                lines[res.line] =
                    lineText.slice(0, res.col) +
                    this.replaceInput.value +
                    lineText.slice(res.col + res.matchText.length);
            } else {
                // Fallback: first occurrence (keeps previous behavior)
                const idx = lineText.indexOf(res.matchText);
                if (idx !== -1) {
                    lines[res.line] =
                        lineText.slice(0, idx) +
                        this.replaceInput.value +
                        lineText.slice(idx + res.matchText.length);
                }
            }
            updated = lines.join('\n');
        }
        await this.app.vault.modify(res.file, updated);
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

        for (const res of this.results) await this.replaceResult(res, true);
        new Notice('All replacements done in vault!');

        this.performSearch();
    }

    private async replaceSelectedMatches() {
        if (!this.selectedIndices.size) return; // none selected
        if (!this.replaceInput || this.replaceInput.value === '') {
            const confirmed = await this.confirmReplaceEmpty('Replace selected matches with empty content? This cannot be undone.');
            if (!confirmed) return; // user cancelled
        }
        const toReplace = Array.from(this.selectedIndices).map(i => this.results[i]);
        for (const res of toReplace) await this.replaceResult(res, false);
        new Notice(`${toReplace.length} replacement(s) done.`);
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

        // Make results keyboard navigable
        const items = Array.from(this.containerEl.querySelectorAll<HTMLElement>(".line-result"));

        let activeIndex = 0;
        if (items.length > 0) {
            items[0].classList.add("active");
            items[0].focus();
        }

        this.containerEl.onkeydown = (evt: KeyboardEvent) => {
            if (!items.length) return;

            if (evt.key === "ArrowDown") {
                evt.preventDefault();
                items[activeIndex].classList.remove("active");
                activeIndex = (activeIndex + 1) % items.length;
                items[activeIndex].classList.add("active");
                items[activeIndex].focus();
            } else if (evt.key === "ArrowUp") {
                evt.preventDefault();
                items[activeIndex].classList.remove("active");
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                items[activeIndex].classList.add("active");
                items[activeIndex].focus();
            } else if (evt.key === "Enter") {
                if (evt.metaKey || evt.ctrlKey) {
                    evt.preventDefault();
                    items[activeIndex].querySelector('mark')!.click();
                }
                if (evt.shiftKey) {
                    console.log('⌥⌥');
                    evt.preventDefault();
                    console.log(items[activeIndex]);
                    if (this.selectedIndices.has(activeIndex)) this.selectedIndices.delete(activeIndex);
                    else this.selectedIndices.add(activeIndex);
                    this.updateSelectionStyles();
                }
            }
        };
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

    private async openFileAtLine(file: TFile, line: number, col: number | undefined, matchText?: string) {
        // Find or open leaf
        const existingLeaves = this.app.workspace.getLeavesOfType('markdown');
        let leaf = existingLeaves.find(l => (l.view as MarkdownView).file?.path === file.path);
        if (!leaf) {
            leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(file);
            this.app.workspace.revealLeaf(leaf);
        } else {
            this.app.workspace.revealLeaf(leaf);
        }
        const mdView = leaf.view as MarkdownView;
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

        // CM6 internal EditorView hack for centering (TS-safe)
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

class ConfirmModal extends Modal {
    result: boolean = false;
    isOpen: boolean = false; // track open state
    constructor(app: App, private message: string) {
        super(app);
    }

    onOpen() {
        this.isOpen = true;
        const { contentEl } = this;
        contentEl.createEl('p', { text: this.message });

        const btnContainer = contentEl.createEl('div', { cls: 'modal-button-container' });
        const yesBtn = btnContainer.createEl('button', { text: 'OK', cls: 'mod-cta' });
        const noBtn = btnContainer.createEl('button', { text: 'Cancel' });

        yesBtn.addEventListener('click', async (evt) => {
            this.result = true;
            this.close();
        });
        noBtn.addEventListener('click', async (evt) => {
            this.result = false;
            this.close();
        });
    }

    onClose() {
        this.isOpen = false;
        this.contentEl.empty();
    }
}
