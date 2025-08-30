import { ItemView, WorkspaceLeaf, TFile, MarkdownView, type App, Notice, Modal } from 'obsidian';

export const VIEW_TYPE_FIND_REPLACE = 'find-replace-view';

export interface SearchResult {
    file: TFile;
    line: number;
    content: string;
    matchText: string;
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

    results: SearchResult[] = [];
    focusedIndex: number = -1;
    selectedIndices: Set<number> = new Set();
    lineElements: HTMLDivElement[] = [];
    private resultsCountEl: HTMLElement;

    constructor(leaf: WorkspaceLeaf, app: App) {
        super(leaf);
        this.renderUI();
    }

    getViewType(): string { return VIEW_TYPE_FIND_REPLACE; }
    getDisplayText(): string { return 'Vault Find & Replace'; }
    getIcon(): string { return 'search'; }

    private renderUI() {
        this.containerEl.empty();
        this.containerEl.addClass('find-replace-container');

        // Search input
        this.searchInput = this.containerEl.createEl('input', { type: 'text' }) as HTMLInputElement;
        this.searchInput.addClass('find-replace-input');
        this.searchInput.placeholder = 'Find';

        // Replace input
        this.replaceInput = this.containerEl.createEl('input', { type: 'text' }) as HTMLInputElement;
        this.replaceInput.addClass('find-replace-input');
        this.replaceInput.placeholder = 'Replace';

        // Options
        const optionsDiv = this.containerEl.createEl('div');
        optionsDiv.addClass('find-replace-options');

        this.matchCaseCheckbox = this.createOption(optionsDiv, 'Match Case', 'match-case');
        this.wholeWordCheckbox = this.createOption(optionsDiv, 'Whole Word', 'whole-word');
        this.regexCheckbox = this.createOption(optionsDiv, 'Regex', 'regex');

        this.resultsCountEl = this.containerEl.createDiv({ cls: 'find-replace-results-count' });
        this.resultsCountEl.textContent = '0 results';

        // Results container
        this.resultsContainer = this.containerEl.createEl('div');
        this.resultsContainer.addClass('find-replace-results');

        // Replace selected controls
        const selectedContainer = this.containerEl.createEl('div');
        selectedContainer.style.marginTop = '4px';
        selectedContainer.style.display = 'flex';
        selectedContainer.style.alignItems = 'center';
        selectedContainer.style.gap = '8px';

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
        this.searchInput.addEventListener('keydown', async (evt) => {
            if (evt.key === 'Enter') {
                this.performSearch();
            }
        });
        this.replaceInput.addEventListener('keydown', async (evt) => {
            if (evt.key === 'Enter') {
                this.performSearch();
            }
        });
        (this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement).addEventListener('keydown', async (evt) => {
            if (evt.key === 'Enter') {
                this.performSearch();
            }
        });
        (this.wholeWordCheckbox.querySelector('#toggle-whole-word-checkbox') as HTMLInputElement)!.addEventListener('keydown', async (evt) => {
            if (evt.key === 'Enter') {
                this.performSearch();
            }
        });
        (this.regexCheckbox.querySelector('#toggle-regex-checkbox') as HTMLInputElement)!.addEventListener('keydown', async (evt) => {
            if (evt.key === 'Enter') {
                this.performSearch();
            }
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

        // const container = parent.createEl('label');
        // const input = container.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
        // container.appendText(' ' + label);
        // return input;
    }

    async performSearch() {
        this.selectedCountEl.textContent = '0 selected';
        const query = this.searchInput.value;
        if (!query) {
            this.resultsContainer.empty();
            this.resultsCountEl.textContent = '0 results';
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
                let match: RegExpMatchArray | null;

                if (useRegex) {
                    const regex = new RegExp(query, matchCase ? 'g' : 'gi');
                    match = line.match(regex);
                    if (match) match.forEach(m => results.push({ file, line: i, content: line, matchText: m }));
                } else {
                    const searchLine = matchCase ? line : line.toLowerCase();
                    const searchQuery = matchCase ? query : query.toLowerCase();

                    if (wholeWord) {
                        const pattern = new RegExp(`\\b${searchQuery}\\b`);
                        if (pattern.test(searchLine)) results.push({ file, line: i, content: line, matchText: query });
                    } else if (searchLine.includes(searchQuery)) {
                        results.push({ file, line: i, content: line, matchText: query });
                    }
                }
            }
        }
        this.results = results;

        // Update count display
        if (this.results.length === 0) {
            this.resultsCountEl.textContent = '0 results';
            this.replaceAllVaultBtn.setAttr('disabled', true);
        } else {
            this.resultsCountEl.textContent = `${this.results.length} result${this.results.length !== 1 ? 's' : ''}`;
            this.replaceAllVaultBtn.removeAttribute('disabled');
        }

        this.renderResults();

        this.selectedIndices.clear();
        this.replaceSelectedBtn.setAttr('disabled', true);
    }

    private renderResults() {
        this.resultsContainer.empty();
        this.lineElements = [];
        this.focusedIndex = -1;

        const resultsByFile: Record<string, SearchResult[]> = {};
        this.results.forEach(r => {
            const path = r.file.path;
            if (!resultsByFile[path]) resultsByFile[path] = [];
            resultsByFile[path].push(r);
        });

        Object.entries(resultsByFile).forEach(([filePath, fileResults]) => {
            const fileDiv = this.resultsContainer.createEl('div');
            fileDiv.addClass('file-group');

            const header = fileDiv.createEl('div');
            header.addClass('file-group-header');
            header.createEl('strong', { text: filePath });
            const countEl = header.createEl('span', { text: ` (${fileResults.length} match${fileResults.length > 1 ? 'es' : ''})` });
            countEl.style.marginLeft = '4px';
            countEl.style.color = 'var(--text-muted)';

            const replaceAllFileBtn = header.createEl('button', { text: 'Replace all in file' });
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
                const lineDiv = fileDiv.createEl('div');
                lineDiv.addClass('line-result');

                const span = lineDiv.createEl('span');
                this.highlightMatchText(span, res.content, res.matchText);
                this.registerDomEvent(span, 'click', async () => {
                    console.log(res);
                    this.openFileAtLine(res.file, res.line, res.matchText)
                });

                const replaceBtn = lineDiv.createEl('button', { text: 'Replace' });
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

        this.setupKeyboardNavigation();
    }

    private highlightMatchText(container: HTMLElement, lineText: string, matchText: string) {
        container.empty(); // remove previous content

        let lastIndex = 0;
        const regex = new RegExp(matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(lineText)) !== null) {
            // Append text before match
            if (match.index > lastIndex) {
                container.appendChild(document.createTextNode(lineText.slice(lastIndex, match.index)));
            }

            // Append highlighted match
            const mark = document.createElement('mark');
            mark.textContent = match[0];
            container.appendChild(mark);

            lastIndex = match.index + match[0].length;
        }

        // Append remaining text
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
            let flags = 'g'; // always global
            if (!(this.matchCaseCheckbox.querySelector('#toggle-match-case-checkbox') as HTMLInputElement)!.checked) flags += 'i'; // add ignore-case if needed
            const escaped = res.matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape special regex chars
            const regex = new RegExp(escaped, flags);
            lines[res.line] = lines[res.line].replace(regex, this.replaceInput.value);
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

    /*
    private async replaceInFile(file: TFile, results: SearchResult[]): Promise<number> {
        if (results.length === 0) return 0;

        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        let replacedCount = 0;

        for (const res of results) {
            // Build regex from the found match
            let flags = 'g';
            if (!this.matchCaseCheckbox.checked) flags += 'i';

            const escaped = res.matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, flags);

            const before = lines[res.line];
            const after = before.replace(regex, this.replaceInput.value);

            if (before !== after) {
                lines[res.line] = after;
                replacedCount++;
            }
        }

        if (replacedCount > 0) {
            await this.app.vault.modify(file, lines.join('\n'));
        }

        return replacedCount;
    }
    */

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
    }

    private updateSelectionStyles() {
        this.lineElements.forEach((el, idx) => {
            if (this.selectedIndices.has(idx)) el.classList.add('selected');
            else el.classList.remove('selected');
        });
        if (this.selectedCountEl) this.selectedCountEl.textContent = `${this.selectedIndices.size} selected`;
        if (this.selectedIndices.size < 1) {
            console.log('a: ' + this.selectedIndices.size);
            this.replaceSelectedBtn.setAttr('disabled', true);
        } else {
            this.replaceSelectedBtn.removeAttribute('disabled');
            console.log('b: ' + this.selectedIndices.size);
        }
    }

    private async openFileAtLine(file: TFile, line: number, matchText?: string) {
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
        let chStart = 0;
        let chEnd = 0;
        if (matchText) {
            // https://stackoverflow.com/questions/1126227/indexof-case-sensitive
            chStart = lineContent.toLowerCase().indexOf(matchText.toLowerCase());
            if (chStart !== -1) chEnd = chStart + matchText.length;
        }

        // Set selection and focus
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
