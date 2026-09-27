import { App, Modal, Setting, setIcon } from 'obsidian';
import VaultFindReplacePlugin from '../main';
import { Logger } from '../utils';

interface CommandInfo {
    id: string;
    name: string;
    description: string;
    category: string;
}

// A usage tip is a sequence of parts: plain text, a key combo, inline code, or an icon
type TipPart = string | { keys: string[] } | { code: string } | { icon: string };

interface HotkeyData {
    modifiers?: string[];
    key?: string;
}

interface ScopeKeyData {
    modifiers?: number;
    key?: string;
    func?: () => unknown;
}

interface ObsidianInternalApp {
    hotkeyManager?: {
        customKeys?: Record<string, HotkeyData[]>;
    };
    scope?: {
        keys?: ScopeKeyData[];
    };
    commands?: {
        commands?: Record<string, {
            hotkeys?: HotkeyData[];
        }>;
    };
}

export class HelpModal extends Modal {
    private plugin: VaultFindReplacePlugin;
    private logger: Logger;

    constructor(app: App, plugin: VaultFindReplacePlugin) {
        super(app);
        this.plugin = plugin;
        this.logger = Logger.create(plugin, 'HelpModal');
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Add scoped class to prevent CSS conflicts
        contentEl.addClass('find-replace-help-modal');

        // Modal title
        new Setting(contentEl).setName('Find-n-Replace - Keyboard shortcuts').setHeading();

        // Subtitle explaining what the plugin does
        const subtitleDiv = contentEl.createDiv('help-subtitle');
        subtitleDiv.createEl('p', {
            text: 'Vault-wide search and replace with file filters and multi-selection',
            cls: 'help-subtitle-text'
        });

        // Introduction
        const introDiv = contentEl.createDiv('help-intro');
        introDiv.createEl('p', {
            text: 'No commands have hotkeys by default. The table shows any hotkeys you have assigned. Assign hotkeys in Settings → Hotkeys.'
        });

        // Get command info with user's actual hotkeys
        const commands = this.getCommandsWithHotkeys();

        // Group commands by category
        const categories = this.groupCommandsByCategory(commands as (CommandInfo & { actualHotkey: string })[]);

        // Render all categories in one table so columns line up
        this.renderCommandsTable(contentEl, categories);

        // File filtering guide section
        this.renderFileFilteringGuide(contentEl);

        // Usage tips section
        this.renderUsageTips(contentEl);

        // Close button
        const buttonDiv = contentEl.createDiv('help-buttons');
        const closeButton = buttonDiv.createEl('button', { text: 'Close' });
        closeButton.addClass('mod-cta');
        closeButton.onclick = () => this.close();
    }

    private getCommandsWithHotkeys(): CommandInfo[] {
        const commands: CommandInfo[] = [
            {
                id: 'open',
                name: 'Open',
                description: 'Opens the plugin sidebar view',
                category: 'Primary'
            },
            {
                id: 'perform-search',
                name: 'Perform search',
                description: 'Executes search with current query',
                category: 'Primary'
            },
            {
                id: 'replace-all-vault',
                name: 'Replace all in vault',
                description: 'Replaces all matches vault-wide',
                category: 'Primary'
            },
            {
                id: 'focus-search-input',
                name: 'Focus search input',
                description: 'Focuses the search input field',
                category: 'Navigation'
            },
            {
                id: 'focus-replace-input',
                name: 'Focus replace input',
                description: 'Focuses the replace input field',
                category: 'Navigation'
            },
            {
                id: 'toggle-match-case',
                name: 'Toggle match case',
                description: 'Toggles case-sensitive search',
                category: 'Search options'
            },
            {
                id: 'toggle-whole-word',
                name: 'Toggle whole word',
                description: 'Toggles whole word matching',
                category: 'Search options'
            },
            {
                id: 'toggle-regex',
                name: 'Toggle regex',
                description: 'Toggles regular expression mode',
                category: 'Search options'
            },
            {
                id: 'toggle-multiline',
                name: 'Toggle multiline',
                description: 'Toggles multiline mode',
                category: 'Search options'
            },
            {
                id: 'replace-selected',
                name: 'Replace selected matches',
                description: 'Replaces only selected results',
                category: 'Replace actions'
            },
            {
                id: 'select-all-results',
                name: 'Select all results',
                description: 'Selects all visible search results',
                category: 'Selection'
            },
            {
                id: 'expand-collapse-all',
                name: 'Expand/collapse all results',
                description: 'Toggles all file group states',
                category: 'View'
            },
            {
                id: 'clear-all',
                name: 'Clear search and replace',
                description: 'Clears inputs and resets toggles',
                category: 'Utility'
            },
            {
                id: 'open-help',
                name: 'Open help',
                description: 'Opens this help dialog',
                category: 'Utility'
            },
            {
                id: 'toggle-word-wrap',
                name: 'Toggle word-wrap',
                description: 'Wraps long result lines',
                category: 'View'
            }
        ];

        // Add actual user hotkeys
        return commands.map(cmd => ({
            ...cmd,
            actualHotkey: this.getUserHotkey(cmd.id)
        }));
    }

    private getUserHotkey(commandId: string): string {
        // Get user's configured hotkey for this command
        const fullCommandId = `find-n-replace:${commandId}`;

        // Debug logging to help troubleshoot hotkey detection
        this.logger.debug(`Looking for hotkey for command: ${fullCommandId}`);

        // Try multiple ways to access hotkey data
        const app = this.app as unknown as ObsidianInternalApp;

        // Method 1: Check hotkeyManager
        if (app.hotkeyManager?.customKeys?.[fullCommandId]) {
            const hotkeyData = app.hotkeyManager.customKeys[fullCommandId];
            this.logger.debug('Found in hotkeyManager.customKeys:', hotkeyData);
            if (hotkeyData.length > 0) {
                return this.formatHotkeys(hotkeyData);
            }
        } else {
            this.logger.debug('Not found in hotkeyManager.customKeys. Available keys:', Object.keys(app.hotkeyManager?.customKeys || {}));
        }

        // Method 2: Check scope registry
        if (app.scope?.keys) {
            for (const key of app.scope.keys) {
                if (key.func && typeof key.func === 'function') {
                    // Check if this key is bound to our command
                    const funcStr = key.func.toString();
                    if (funcStr.includes(commandId)) {
                        return this.formatHotkeyFromScope(key);
                    }
                }
            }
        }

        // Method 3: Check commands registry
        const commands = app.commands?.commands;
        if (commands && commands[fullCommandId]) {
            const command = commands[fullCommandId];
            this.logger.debug('Found command in registry:', command);
            if (command.hotkeys && command.hotkeys.length > 0) {
                this.logger.debug('Found hotkeys in command:', command.hotkeys);
                return this.formatHotkeys(command.hotkeys);
            }
        } else {
            this.logger.debug('Command not found in registry. Available commands:', Object.keys(commands || {}));
        }

        return 'Not set';
    }

    private formatHotkeys(hotkeyArray: HotkeyData[]): string {
        if (hotkeyArray.length === 1) {
            return this.formatHotkey(hotkeyArray[0]);
        } else if (hotkeyArray.length > 1) {
            // Handle multiple alternative hotkeys for the same command
            return hotkeyArray.map(hotkey => this.formatHotkey(hotkey)).join(' or ');
        }
        return 'Not set';
    }

    private formatHotkey(hotkeyData: HotkeyData): string {
        const modifiers = [];
        if (hotkeyData.modifiers) {
            if (hotkeyData.modifiers.includes('Mod')) modifiers.push('Ctrl/Cmd');
            if (hotkeyData.modifiers.includes('Ctrl')) modifiers.push('Ctrl');
            if (hotkeyData.modifiers.includes('Alt')) modifiers.push('Alt');
            if (hotkeyData.modifiers.includes('Shift')) modifiers.push('Shift');
        }

        let key = hotkeyData.key || '';
        if (key === ' ') key = 'Space';

        const keys = [...modifiers, key];
        return keys.map(k => `<kbd>${k}</kbd>`).join('+');
    }

    private formatHotkeyFromScope(scopeKey: ScopeKeyData): string {
        const modifiers = [];

        // Check scope key modifiers
        if (scopeKey.modifiers) {
            if (scopeKey.modifiers & 1) modifiers.push('Ctrl');
            if (scopeKey.modifiers & 2) modifiers.push('Alt');
            if (scopeKey.modifiers & 4) modifiers.push('Shift');
            if (scopeKey.modifiers & 8) modifiers.push('Ctrl/Cmd');
        }

        let key = scopeKey.key || '';
        if (key === ' ') key = 'Space';

        const keys = [...modifiers, key];
        return keys.map(k => `<kbd>${k}</kbd>`).join('+');
    }

    private groupCommandsByCategory(commands: (CommandInfo & { actualHotkey: string })[]): Record<string, (CommandInfo & { actualHotkey: string })[]> {
        const groups: Record<string, (CommandInfo & { actualHotkey: string })[]> = {};

        commands.forEach(cmd => {
            if (!groups[cmd.category]) {
                groups[cmd.category] = [];
            }
            groups[cmd.category].push(cmd);
        });

        return groups;
    }

    private renderHotkeyWithKbd(container: HTMLElement, hotkeyString: string): void {
        // Parse the hotkey string with <kbd> tags and render safely
        const parts = hotkeyString.split('<kbd>');
        container.insertAdjacentText('beforeend', parts[0]); // Text before first <kbd>

        for (let i = 1; i < parts.length; i++) {
            const kbdParts = parts[i].split('</kbd>');
            if (kbdParts.length >= 2) {
                // Create the kbd element
                const kbd = container.createEl('kbd');
                kbd.insertAdjacentText('beforeend', kbdParts[0]);

                // Add text after </kbd>
                container.insertAdjacentText('beforeend', kbdParts[1]);
            } else {
                // No closing </kbd> found, treat as regular text
                container.insertAdjacentText('beforeend', '<kbd>' + parts[i]);
            }
        }
    }

    private renderCommandsTable(container: HTMLElement, categories: Record<string, (CommandInfo & { actualHotkey: string })[]>) {
        const table = container.createEl('table', { cls: 'help-commands-table' });

        // Table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Command' });
        headerRow.createEl('th', { text: 'Your hotkey' });
        headerRow.createEl('th', { text: 'Description' });

        for (const [categoryName, commands] of Object.entries(categories)) {
            this.renderCategoryRows(table, categoryName, commands);
        }
    }

    private renderCategoryRows(table: HTMLTableElement, categoryName: string, commands: (CommandInfo & { actualHotkey: string })[]) {
        // One tbody per category, starting with a heading row
        const tbody = table.createEl('tbody');
        const headingRow = tbody.createEl('tr', { cls: 'help-category-row' });
        headingRow.createEl('th', { text: categoryName, attr: { colspan: '3', scope: 'rowgroup' } });

        commands.forEach(cmd => {
            const row = tbody.createEl('tr');
            row.createEl('td', { text: cmd.name });

            const actualCell = row.createEl('td');
            const actualSpan = actualCell.createEl('span', {
                cls: cmd.actualHotkey === 'Not set' ? 'hotkey-not-set' : 'hotkey-set'
            });
            if (cmd.actualHotkey === 'Not set') {
                actualSpan.insertAdjacentText('beforeend', cmd.actualHotkey);
            } else {
                this.renderHotkeyWithKbd(actualSpan, cmd.actualHotkey);
            }

            row.createEl('td', { text: cmd.description });
        });
    }

    private renderFileFilteringGuide(container: HTMLElement) {
        const filterGuideDiv = container.createDiv('help-file-filtering');
        new Setting(filterGuideDiv).setName('File filtering guide').setHeading();

        // Default behavior note
        const defaultP = filterGuideDiv.createEl('p');
        defaultP.insertAdjacentText('beforeend', 'With no filters, Find-n-Replace searches ');
        const allTypesStrong = defaultP.createEl('strong');
        allTypesStrong.insertAdjacentText('beforeend', 'common text file types');
        defaultP.insertAdjacentText('beforeend', ' (.md, .txt, .html, .json, .js, .css, and more). Other formats, such as .canvas and .base, are skipped unless you include them. Files that aren\'t Markdown show a colored extension badge in the results.');

        // Introduction paragraph
        const introP = filterGuideDiv.createEl('p');
        introP.insertAdjacentText('beforeend', 'Click the ');
        const filterBtnStrong = introP.createEl('strong');
        filterBtnStrong.insertAdjacentText('beforeend', 'filter button ');
        const filterIcon = filterBtnStrong.createEl('span', { cls: 'help-tip-icon' });
        setIcon(filterIcon, 'filter');
        introP.insertAdjacentText('beforeend', ' to show the ');
        const includeStrong = introP.createEl('strong');
        includeStrong.insertAdjacentText('beforeend', '"files to include"');
        introP.insertAdjacentText('beforeend', ' and ');
        const excludeStrong = introP.createEl('strong');
        excludeStrong.insertAdjacentText('beforeend', '"files to exclude"');
        introP.insertAdjacentText('beforeend', ' boxes. Separate patterns with commas. Paths start at the vault root.');

        // Pattern types section
        const patternTypesDiv = filterGuideDiv.createDiv('filter-pattern-types');
        patternTypesDiv.createEl('h4', { text: 'Pattern types' });

        const patternList = patternTypesDiv.createEl('ul');

        const patternTypes = [
            {
                type: 'Extensions',
                example: '.md, .txt, .js',
                description: 'Start with a dot. Without the dot, the name is read as a folder.'
            },
            {
                type: 'Folders',
                example: 'Notes/, Daily/, Projects/',
                description: 'Files in that folder and its subfolders'
            },
            {
                type: 'Wildcards',
                example: '*.tmp, *backup*, temp/*',
                description: '* matches any characters, including /. ? matches one character.'
            }
        ];

        patternTypes.forEach(({ type, example, description }) => {
            const li = patternList.createEl('li');
            const strong = li.createEl('strong');
            strong.insertAdjacentText('beforeend', `${type}:`);
            li.insertAdjacentText('beforeend', ' ');
            const code = li.createEl('code');
            code.insertAdjacentText('beforeend', example);
            li.insertAdjacentText('beforeend', ` - ${description}`);
        });

        // Include patterns section
        const includeDiv = filterGuideDiv.createDiv('filter-include-section');
        includeDiv.createEl('h4', { text: 'Files to include' });

        const includeItems: [string, string][] = [
            ['.md', 'Markdown files only'],
            ['.canvas', 'Canvas files, which are skipped by default'],
            ['Notes/, Daily/', 'Files in Notes or Daily'],
            ['.md, Projects/', 'Markdown files in Projects (different pattern types combine with AND)'],
            ['Notes/*.md', 'Markdown files anywhere under Notes']
        ];
        this.renderPatternExamples(includeDiv, includeItems);

        // Exclude patterns section
        const excludeDiv = filterGuideDiv.createDiv('filter-exclude-section');
        excludeDiv.createEl('h4', { text: 'Files to exclude' });

        const excludeItems: [string, string][] = [
            ['Archive/, Templates/', 'Skip the Archive and Templates folders'],
            ['.tmp, .bak', 'Skip temporary and backup files'],
            ['*backup*, *draft*', 'Skip paths containing "backup" or "draft"'],
            ['*Daily/*', 'Skip folders whose name ends in Daily, at any depth']
        ];
        this.renderPatternExamples(excludeDiv, excludeItems);

        // Performance tip
        const performanceTip = filterGuideDiv.createDiv('filter-performance-tip');
        const strong = performanceTip.createEl('strong');
        strong.insertAdjacentText('beforeend', '💡 Performance tip:');
        performanceTip.insertAdjacentText('beforeend', ' Filters are applied before any file is read, so narrow filters make searches in large vaults much faster.');
    }

    private renderPatternExamples(container: HTMLElement, items: [string, string][]) {
        const list = container.createEl('ul');
        items.forEach(([pattern, description]) => {
            const li = list.createEl('li');
            li.createEl('code', { text: pattern });
            li.insertAdjacentText('beforeend', ` - ${description}`);
        });
    }

    private renderUsageTips(container: HTMLElement) {
        const tipsDiv = container.createDiv('help-tips');
        new Setting(tipsDiv).setName('Usage tips').setHeading();

        const tipsList = tipsDiv.createEl('ul');

        const tips: TipPart[][] = [
            [{ keys: ['Ctrl/Cmd'] }, '+click a result to select it. ', { keys: ['Ctrl/Cmd'] }, '+click a file header to select every match in that file.'],
            ['With focus in the view, ', { keys: ['Ctrl/Cmd', 'Enter'] }, ' replaces all in vault.'],
            ['With focus in the view, ', { keys: ['Alt', 'Enter'] }, ' replaces the selected matches.'],
            ['Press ', { keys: ['↑'] }, ' or ', { keys: ['↓'] }, ' in any text box to browse its history. Press ', { keys: ['Enter'] }, ' to save an entry.'],
            ['With regex on, use ', { code: '$1' }, ' for capture groups and ', { code: '$&' }, ' for the whole match.'],
            ['The list shows up to "Maximum results" matches (1,000 by default). "Replace all in vault" and the per-file button still replace every match, but "Replace selected" only acts on matches in the list.'],
            ['Filters set with the filter button ', { icon: 'filter' }, ' last until you close the view. Set defaults in settings to start with the same filters every time.'],
            ['Replacements cannot be undone from the plugin. Keep a backup or use git before large replacements.']
        ];

        tips.forEach(parts => {
            const li = tipsList.createEl('li');
            parts.forEach(part => {
                if (typeof part === 'string') {
                    li.insertAdjacentText('beforeend', part);
                } else if ('keys' in part) {
                    part.keys.forEach((key, index) => {
                        if (index > 0) li.insertAdjacentText('beforeend', '+');
                        const kbd = li.createEl('kbd');
                        kbd.insertAdjacentText('beforeend', key);
                    });
                } else if ('code' in part) {
                    const code = li.createEl('code');
                    code.insertAdjacentText('beforeend', part.code);
                } else {
                    const iconSpan = li.createEl('span', { cls: 'help-tip-icon' });
                    setIcon(iconSpan, part.icon);
                }
            });
        });

        const noteDiv = tipsDiv.createDiv('help-note');
        const hotkeyNote = noteDiv.createEl('p');
        hotkeyNote.insertAdjacentText('beforeend', 'To assign hotkeys, open ');
        hotkeyNote.createEl('strong', { text: 'Settings → Hotkeys' });
        hotkeyNote.insertAdjacentText('beforeend', ' and search for "Find-n-Replace".');

        const settingsNote = noteDiv.createEl('p');
        settingsNote.insertAdjacentText('beforeend', 'To set default filters, open ');
        settingsNote.createEl('strong', { text: 'Settings → Find-n-Replace' });
        settingsNote.insertAdjacentText('beforeend', '.');
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}