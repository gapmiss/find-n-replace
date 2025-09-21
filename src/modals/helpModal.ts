import { App, Modal, Setting } from 'obsidian';
import VaultFindReplacePlugin from '../main';

interface CommandInfo {
    id: string;
    name: string;
    recommendedHotkey: string;
    description: string;
    category: string;
}

export class HelpModal extends Modal {
    private plugin: VaultFindReplacePlugin;

    constructor(app: App, plugin: VaultFindReplacePlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Modal title
        contentEl.createEl('h2', { text: 'Find-n-Replace - Keyboard Shortcuts' });

        // Introduction
        const introDiv = contentEl.createDiv('help-intro');
        introDiv.createEl('p', {
            text: 'Below are the recommended keyboard shortcuts for efficient use of the plugin. You can customize these hotkeys in Obsidian\'s Settings → Hotkeys.'
        });

        // Get command info with user's actual hotkeys
        const commands = this.getCommandsWithHotkeys();

        // Group commands by category
        const categories = this.groupCommandsByCategory(commands as (CommandInfo & { actualHotkey: string })[]);

        // Render each category
        for (const [categoryName, categoryCommands] of Object.entries(categories)) {
            this.renderCategory(contentEl, categoryName, categoryCommands);
        }

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
                id: 'open-find-replace',
                name: 'Open Find-n-Replace',
                recommendedHotkey: 'Cmd+Shift+F',
                description: 'Opens the plugin sidebar view',
                category: 'Primary'
            },
            {
                id: 'perform-search',
                name: 'Perform Search',
                recommendedHotkey: 'Cmd+Enter',
                description: 'Executes search with current query',
                category: 'Primary'
            },
            {
                id: 'replace-all-vault',
                name: 'Replace All in Vault',
                recommendedHotkey: 'Cmd+Shift+H',
                description: 'Replaces all matches vault-wide',
                category: 'Primary'
            },
            {
                id: 'focus-search-input',
                name: 'Focus Search Input',
                recommendedHotkey: 'Cmd+L',
                description: 'Focuses the search input field',
                category: 'Navigation'
            },
            {
                id: 'focus-replace-input',
                name: 'Focus Replace Input',
                recommendedHotkey: 'Cmd+Shift+L',
                description: 'Focuses the replace input field',
                category: 'Navigation'
            },
            {
                id: 'toggle-match-case',
                name: 'Toggle Match Case',
                recommendedHotkey: 'Cmd+Alt+C',
                description: 'Toggles case-sensitive search',
                category: 'Search Options'
            },
            {
                id: 'toggle-whole-word',
                name: 'Toggle Whole Word',
                recommendedHotkey: 'Cmd+Alt+W',
                description: 'Toggles whole word matching',
                category: 'Search Options'
            },
            {
                id: 'toggle-regex',
                name: 'Toggle Regex',
                recommendedHotkey: 'Cmd+Alt+R',
                description: 'Toggles regular expression mode',
                category: 'Search Options'
            },
            {
                id: 'replace-selected',
                name: 'Replace Selected Matches',
                recommendedHotkey: 'Cmd+Shift+R',
                description: 'Replaces only selected results',
                category: 'Replace Actions'
            },
            {
                id: 'select-all-results',
                name: 'Select All Results',
                recommendedHotkey: 'Cmd+K Cmd+A',
                description: 'Selects all visible search results',
                category: 'Selection'
            },
            {
                id: 'expand-collapse-all',
                name: 'Expand/Collapse All Results',
                recommendedHotkey: 'Cmd+K Cmd+E',
                description: 'Toggles all file group states',
                category: 'View'
            },
            {
                id: 'clear-search-replace',
                name: 'Clear Search and Replace',
                recommendedHotkey: 'Cmd+K Cmd+C',
                description: 'Clears inputs and resets toggles',
                category: 'Utility'
            }
        ];

        // Add actual user hotkeys
        return commands.map(cmd => ({
            ...cmd,
            actualHotkey: this.getUserHotkey(cmd.id)
        })) as (CommandInfo & { actualHotkey: string })[];
    }

    private getUserHotkey(commandId: string): string {
        // Get user's configured hotkey for this command
        const fullCommandId = `vault-find-replace:${commandId}`;

        // Try multiple ways to access hotkey data
        const app = this.app as any;

        // Method 1: Check hotkeyManager
        if (app.hotkeyManager?.customKeys?.[fullCommandId]) {
            const hotkeyData = app.hotkeyManager.customKeys[fullCommandId];
            if (hotkeyData.length > 0) {
                return this.formatHotkey(hotkeyData[0]);
            }
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
            if (command.hotkeys && command.hotkeys.length > 0) {
                return this.formatHotkey(command.hotkeys[0]);
            }
        }

        return 'Not set';
    }

    private formatHotkey(hotkeyData: any): string {
        const modifiers = [];
        if (hotkeyData.modifiers) {
            if (hotkeyData.modifiers.includes('Mod')) modifiers.push('Cmd');
            if (hotkeyData.modifiers.includes('Ctrl')) modifiers.push('Ctrl');
            if (hotkeyData.modifiers.includes('Alt')) modifiers.push('Alt');
            if (hotkeyData.modifiers.includes('Shift')) modifiers.push('Shift');
        }

        let key = hotkeyData.key || '';
        if (key === ' ') key = 'Space';

        return [...modifiers, key].join('+');
    }

    private formatHotkeyFromScope(scopeKey: any): string {
        const modifiers = [];

        // Check scope key modifiers
        if (scopeKey.modifiers) {
            if (scopeKey.modifiers & 1) modifiers.push('Ctrl');
            if (scopeKey.modifiers & 2) modifiers.push('Alt');
            if (scopeKey.modifiers & 4) modifiers.push('Shift');
            if (scopeKey.modifiers & 8) modifiers.push('Cmd');
        }

        let key = scopeKey.key || '';
        if (key === ' ') key = 'Space';

        return [...modifiers, key].join('+');
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

    private renderCategory(container: HTMLElement, categoryName: string, commands: (CommandInfo & { actualHotkey: string })[]) {
        const categoryDiv = container.createDiv('help-category');
        categoryDiv.createEl('h3', { text: categoryName });

        const table = categoryDiv.createEl('table', { cls: 'help-commands-table' });

        // Table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Command' });
        headerRow.createEl('th', { text: 'Your Hotkey' });
        headerRow.createEl('th', { text: 'Recommended' });
        headerRow.createEl('th', { text: 'Description' });

        // Table body
        const tbody = table.createEl('tbody');
        commands.forEach(cmd => {
            const row = tbody.createEl('tr');
            row.createEl('td', { text: cmd.name });

            const actualCell = row.createEl('td');
            const actualSpan = actualCell.createEl('span', {
                text: cmd.actualHotkey,
                cls: cmd.actualHotkey === 'Not set' ? 'hotkey-not-set' : 'hotkey-set'
            });

            const recommendedCell = row.createEl('td');
            recommendedCell.createEl('span', {
                text: cmd.recommendedHotkey,
                cls: 'hotkey-recommended'
            });

            row.createEl('td', { text: cmd.description });
        });
    }

    private renderFileFilteringGuide(container: HTMLElement) {
        const filterGuideDiv = container.createDiv('help-file-filtering');
        filterGuideDiv.createEl('h3', { text: 'File Filtering Guide' });

        // Introduction paragraph
        const introP = filterGuideDiv.createEl('p');
        introP.innerHTML = 'Use the <strong>filter button (🔍)</strong> next to the Clear button to open the expandable filtering panel. This helps you search only the files you need, improving performance on large vaults.';

        // Pattern types section
        const patternTypesDiv = filterGuideDiv.createDiv('filter-pattern-types');
        patternTypesDiv.createEl('h4', { text: 'Pattern Types' });

        const patternList = patternTypesDiv.createEl('ul');

        const patternTypes = [
            {
                type: 'Extensions',
                example: '.md, .txt, .js',
                description: 'Filter by file extensions (with or without the dot)'
            },
            {
                type: 'Folders',
                example: 'Notes/, Daily/, Projects/',
                description: 'Filter by folder paths (include trailing slash)'
            },
            {
                type: 'Glob Patterns',
                example: '*.tmp, *backup*, temp/*',
                description: 'Use * (any characters) and ? (single character) wildcards'
            }
        ];

        patternTypes.forEach(({ type, example, description }) => {
            const li = patternList.createEl('li');
            li.innerHTML = `<strong>${type}:</strong> <code>${example}</code> - ${description}`;
        });

        // Include patterns section
        const includeDiv = filterGuideDiv.createDiv('filter-include-section');
        includeDiv.createEl('h4', { text: 'Include Patterns (Search Only These Files)' });

        const includeExamples = includeDiv.createEl('ul');
        const includeItems = [
            '`.md` - Only markdown files',
            '`.md,.txt` - Markdown and text files only',
            '`Notes/,Daily/` - Only files in Notes and Daily folders',
            '`*.js` - Only JavaScript files (using glob pattern)',
            '`Notes/*.md` - Only markdown files in the Notes folder'
        ];

        includeItems.forEach(item => {
            const li = includeExamples.createEl('li');
            li.innerHTML = item;
        });

        // Exclude patterns section
        const excludeDiv = filterGuideDiv.createDiv('filter-exclude-section');
        excludeDiv.createEl('h4', { text: 'Exclude Patterns (Skip These Files)' });

        const excludeExamples = excludeDiv.createEl('ul');
        const excludeItems = [
            '`Archive/,Templates/` - Skip Archive and Templates folders',
            '`*.tmp,*.bak` - Skip temporary and backup files',
            '`*backup*,*draft*` - Skip files with "backup" or "draft" in the name',
            '`.obsidian/` - Skip Obsidian configuration folder',
            '`temp/*,*.log` - Skip temp folder and log files'
        ];

        excludeItems.forEach(item => {
            const li = excludeExamples.createEl('li');
            li.innerHTML = item;
        });

        // Real-world examples section
        const examplesDiv = filterGuideDiv.createDiv('filter-examples-section');
        examplesDiv.createEl('h4', { text: 'Common Use Cases' });

        const examplesList = examplesDiv.createEl('ul');
        const examples = [
            '<strong>Search only active notes:</strong> Include: <code>.md</code>, Exclude: <code>Archive/,Templates/</code>',
            '<strong>Search specific project:</strong> Include: <code>Projects/MyProject/</code>',
            '<strong>Skip all temporary files:</strong> Exclude: <code>*.tmp,*backup*,.trash/</code>',
            '<strong>Search code files:</strong> Include: <code>.js,.ts,.css,.html</code>',
            '<strong>Large vault optimization:</strong> Include: <code>Notes/,Daily/</code>, Exclude: <code>Archive/,*.pdf</code>'
        ];

        examples.forEach(example => {
            const li = examplesList.createEl('li');
            li.innerHTML = example;
        });

        // Performance tip
        const performanceTip = filterGuideDiv.createDiv('filter-performance-tip');
        performanceTip.innerHTML = '<strong>💡 Performance Tip:</strong> Filtering happens before search processing, so narrow filters dramatically speed up searches in large vaults with thousands of files.';
    }

    private renderUsageTips(container: HTMLElement) {
        const tipsDiv = container.createDiv('help-tips');
        tipsDiv.createEl('h3', { text: 'Usage Tips' });

        const tipsList = tipsDiv.createEl('ul');

        const tips = [
            'Use Cmd+Shift+F to quickly open the plugin from anywhere in Obsidian',
            'Regex mode supports capture groups ($1, $2) for advanced replacements',
            'Select specific results before using "Replace Selected" for precise control',
            'Use the filter button (🔍) to search only specific file types or folders',
            'Set default filters in Settings to avoid retyping common patterns',
            'Use Cmd+K prefix for less common actions to avoid hotkey conflicts',
            'The plugin remembers your expand/collapse preferences per file',
            'Multi-line replacements work great with regex patterns',
            'Include/exclude patterns are session-only; settings provide defaults'
        ];

        tips.forEach(tip => {
            tipsList.createEl('li', { text: tip });
        });

        const noteDiv = tipsDiv.createDiv('help-note');
        noteDiv.createEl('p', {
            text: 'To customize hotkeys: Go to Settings → Hotkeys → Search for "Find-n-Replace"'
        });

        const settingsNote = noteDiv.createEl('p');
        settingsNote.innerHTML = 'To set default filters: Go to <strong>Settings → Community Plugins → Find-n-Replace → Options</strong>';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}