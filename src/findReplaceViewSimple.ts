import { ItemView, WorkspaceLeaf, TFile, type App, Notice } from 'obsidian';
import VaultFindReplacePlugin from "./main";
import { SearchEngine } from "./core/searchEngine";
import { ReplacementEngine } from "./core/replacementEngine";

export const VIEW_TYPE_FIND_REPLACE = 'find-replace-view';

export interface SearchResult {
    file: TFile;
    line: number;
    content: string;
    matchText: string;
    col?: number;
    pattern: string;
}

export class FindReplaceView extends ItemView {
    searchInput: HTMLInputElement;
    replaceInput: HTMLInputElement;
    resultsContainer: HTMLElement;
    replaceAllBtn: HTMLButtonElement;
    matchCaseCheckbox: HTMLInputElement;
    wholeWordCheckbox: HTMLInputElement;
    regexCheckbox: HTMLInputElement;
    plugin: VaultFindReplacePlugin;
    searchEngine: SearchEngine;
    replacementEngine: ReplacementEngine;
    currentResults: SearchResult[] = [];

    constructor(leaf: WorkspaceLeaf, app: App, plugin: VaultFindReplacePlugin) {
        super(leaf);
        this.plugin = plugin;
        this.searchEngine = new SearchEngine(app, plugin);
        this.replacementEngine = new ReplacementEngine(app, plugin, this.searchEngine);
    }

    getViewType(): string { return VIEW_TYPE_FIND_REPLACE; }
    getDisplayText(): string { return 'Find-n-Replace'; }
    getIcon(): string { return 'text-search'; }

    async onOpen(): Promise<void> {
        this.containerEl.empty();
        this.containerEl.addClass('find-replace-container');

        // Create a simple search input for testing
        this.searchInput = this.containerEl.createEl('input', {
            type: 'text',
            placeholder: 'Search...'
        }) as HTMLInputElement;

        // Create replace input
        this.replaceInput = this.containerEl.createEl('input', {
            type: 'text',
            placeholder: 'Replace with...'
        }) as HTMLInputElement;

        // Create simple options
        const optionsContainer = this.containerEl.createDiv('options-container');

        // Match case checkbox
        const matchCaseLabel = optionsContainer.createEl('label');
        this.matchCaseCheckbox = matchCaseLabel.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
        matchCaseLabel.createSpan({ text: ' Match case' });

        // Whole word checkbox
        const wholeWordLabel = optionsContainer.createEl('label');
        this.wholeWordCheckbox = wholeWordLabel.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
        wholeWordLabel.createSpan({ text: ' Whole word' });

        // Regex checkbox
        const regexLabel = optionsContainer.createEl('label');
        this.regexCheckbox = regexLabel.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
        regexLabel.createSpan({ text: ' Use regex' });

        // Create replace all button
        this.replaceAllBtn = this.containerEl.createEl('button', { text: 'Replace All' }) as HTMLButtonElement;
        this.replaceAllBtn.disabled = true;

        // Create results container
        this.resultsContainer = this.containerEl.createDiv('search-results');

        // Simple Enter key handler with actual search
        this.searchInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const query = this.searchInput.value.trim();
                if (query) {
                    console.log('Search triggered:', query);
                    try {
                        const results = await this.searchEngine.performSearch(query, {
                            matchCase: this.matchCaseCheckbox.checked,
                            wholeWord: this.wholeWordCheckbox.checked,
                            useRegex: this.regexCheckbox.checked
                        });
                        this.currentResults = results;
                        console.log('Search results:', results.length, 'matches found');
                        new Notice(`Found ${results.length} matches`);
                        this.displayResults(results);
                        this.replaceAllBtn.disabled = results.length === 0;
                    } catch (error) {
                        console.error('Search error:', error);
                        new Notice('Search failed: ' + error.message);
                    }
                } else {
                    console.log('Empty search query');
                }
            }
        });

        // Replace All button handler
        this.replaceAllBtn.addEventListener('click', async () => {
            if (this.currentResults.length === 0) return;

            const replaceText = this.replaceInput.value;
            try {
                const allIndices = new Set(Array.from({length: this.currentResults.length}, (_, i) => i));
                const replacedCount = await this.replacementEngine.dispatchReplace(
                    'vault',
                    this.currentResults,
                    allIndices,
                    replaceText,
                    {
                        matchCase: this.matchCaseCheckbox.checked,
                        wholeWord: this.wholeWordCheckbox.checked,
                        useRegex: this.regexCheckbox.checked
                    }
                );
                new Notice(`Replaced ${replacedCount} matches`);

                // Clear results after successful replacement
                this.currentResults = [];
                this.displayResults([]);
                this.replaceAllBtn.disabled = true;
            } catch (error) {
                console.error('Replace error:', error);
                new Notice('Replace failed: ' + error.message);
            }
        });

        console.log('Simple view opened successfully');
    }

    displayResults(results: SearchResult[]): void {
        this.resultsContainer.empty();

        if (results.length === 0) {
            this.resultsContainer.createEl('p', { text: 'No matches found' });
            return;
        }

        const header = this.resultsContainer.createEl('h3', { text: `Found ${results.length} matches` });

        results.slice(0, 10).forEach((result, index) => {
            const resultItem = this.resultsContainer.createDiv('result-item');
            resultItem.createEl('strong', { text: result.file.basename });
            resultItem.createEl('span', { text: ` (line ${result.line})` });
            resultItem.createEl('br');
            resultItem.createEl('span', { text: result.content.trim() });
        });

        if (results.length > 10) {
            this.resultsContainer.createEl('p', { text: `... and ${results.length - 10} more matches` });
        }
    }
}