import { App, Modal, Setting, setIcon } from 'obsidian';
import VaultFindReplacePlugin from '../main';

interface CommandInfo {
    id: string;
    name: string;
    recommendedHotkey: string;
    description: string;
    category: string;
}

interface TipItem {
    text: string;
    keys?: string[];
    icon?: string;
    code?: string;
    middle?: string;
    code2?: string;
    suffix?: string;
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

        // Add scoped class to prevent CSS conflicts
        contentEl.addClass('find-replace-help-modal');

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
                id: 'open-find-n-replace',
                name: 'Open Find-n-Replace',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>',
                description: 'Opens the plugin sidebar view',
                category: 'Primary'
            },
            {
                id: 'perform-search',
                name: 'Perform Search',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>Enter</kbd>',
                description: 'Executes search with current query',
                category: 'Primary'
            },
            {
                id: 'replace-all-vault',
                name: 'Replace All in Vault',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd>',
                description: 'Replaces all matches vault-wide',
                category: 'Primary'
            },
            {
                id: 'focus-search-input',
                name: 'Focus Search Input',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>L</kbd>',
                description: 'Focuses the search input field',
                category: 'Navigation'
            },
            {
                id: 'focus-replace-input',
                name: 'Focus Replace Input',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd>',
                description: 'Focuses the replace input field',
                category: 'Navigation'
            },
            {
                id: 'toggle-match-case',
                name: 'Toggle Match Case',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>Alt</kbd>+<kbd>C</kbd>',
                description: 'Toggles case-sensitive search',
                category: 'Search Options'
            },
            {
                id: 'toggle-whole-word',
                name: 'Toggle Whole Word',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>Alt</kbd>+<kbd>W</kbd>',
                description: 'Toggles whole word matching',
                category: 'Search Options'
            },
            {
                id: 'toggle-regex',
                name: 'Toggle Regex',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>Alt</kbd>+<kbd>R</kbd>',
                description: 'Toggles regular expression mode',
                category: 'Search Options'
            },
            {
                id: 'replace-selected',
                name: 'Replace Selected Matches',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>',
                description: 'Replaces only selected results',
                category: 'Replace Actions'
            },
            {
                id: 'select-all-results',
                name: 'Select All Results',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>A</kbd>',
                description: 'Selects all visible search results',
                category: 'Selection'
            },
            {
                id: 'expand-collapse-all',
                name: 'Expand/Collapse All Results',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>E</kbd>',
                description: 'Toggles all file group states',
                category: 'View'
            },
            {
                id: 'clear-all',
                name: 'Clear Search and Replace',
                recommendedHotkey: '<kbd>Ctrl/Cmd</kbd>+<kbd>K</kbd>',
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
        const fullCommandId = `find-n-replace:${commandId}`;

        // Debug logging to help troubleshoot hotkey detection
        console.debug(`[Help Modal] Looking for hotkey for command: ${fullCommandId}`);

        // Try multiple ways to access hotkey data
        const app = this.app as any;

        // Method 1: Check hotkeyManager
        if (app.hotkeyManager?.customKeys?.[fullCommandId]) {
            const hotkeyData = app.hotkeyManager.customKeys[fullCommandId];
            console.debug(`[Help Modal] Found in hotkeyManager.customKeys:`, hotkeyData);
            if (hotkeyData.length > 0) {
                return this.formatHotkeys(hotkeyData);
            }
        } else {
            console.debug(`[Help Modal] Not found in hotkeyManager.customKeys. Available keys:`, Object.keys(app.hotkeyManager?.customKeys || {}));
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
            console.debug(`[Help Modal] Found command in registry:`, command);
            if (command.hotkeys && command.hotkeys.length > 0) {
                console.debug(`[Help Modal] Found hotkeys in command:`, command.hotkeys);
                return this.formatHotkeys(command.hotkeys);
            }
        } else {
            console.debug(`[Help Modal] Command not found in registry. Available commands:`, Object.keys(commands || {}));
        }

        return 'Not set';
    }

    private formatHotkeys(hotkeyArray: any[]): string {
        if (hotkeyArray.length === 1) {
            return this.formatHotkey(hotkeyArray[0]);
        } else if (hotkeyArray.length > 1) {
            // Handle multiple alternative hotkeys for the same command
            return hotkeyArray.map(hotkey => this.formatHotkey(hotkey)).join(' or ');
        }
        return 'Not set';
    }

    private formatHotkey(hotkeyData: any): string {
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

    private formatHotkeyFromScope(scopeKey: any): string {
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
                cls: cmd.actualHotkey === 'Not set' ? 'hotkey-not-set' : 'hotkey-set'
            });
            if (cmd.actualHotkey === 'Not set') {
                actualSpan.insertAdjacentText('beforeend', cmd.actualHotkey);
            } else {
                this.renderHotkeyWithKbd(actualSpan, cmd.actualHotkey);
            }

            const recommendedCell = row.createEl('td');
            const recommendedSpan = recommendedCell.createEl('span', {
                cls: 'hotkey-recommended'
            });
            this.renderHotkeyWithKbd(recommendedSpan, cmd.recommendedHotkey);

            row.createEl('td', { text: cmd.description });
        });
    }

    private renderFileFilteringGuide(container: HTMLElement) {
        const filterGuideDiv = container.createDiv('help-file-filtering');
        filterGuideDiv.createEl('h3', { text: 'File Filtering Guide' });

        // Introduction paragraph
        const introP = filterGuideDiv.createEl('p');
        introP.insertAdjacentText('beforeend', 'Use the ');
        const filterBtnStrong = introP.createEl('strong');
        filterBtnStrong.insertAdjacentText('beforeend', 'filter button ');
        const filterIcon = filterBtnStrong.createEl('span', { cls: 'help-tip-icon' });
        setIcon(filterIcon, 'filter');
        introP.insertAdjacentText('beforeend', ' next to the Clear button to open the VSCode-style expandable filtering panel with ');
        const includeStrong = introP.createEl('strong');
        includeStrong.insertAdjacentText('beforeend', '"files to include"');
        introP.insertAdjacentText('beforeend', ' and ');
        const excludeStrong = introP.createEl('strong');
        excludeStrong.insertAdjacentText('beforeend', '"files to exclude"');
        introP.insertAdjacentText('beforeend', ' inputs. This helps you search only the files you need, improving performance on large vaults.');

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
            const strong = li.createEl('strong');
            strong.insertAdjacentText('beforeend', `${type}:`);
            li.insertAdjacentText('beforeend', ' ');
            const code = li.createEl('code');
            code.insertAdjacentText('beforeend', example);
            li.insertAdjacentText('beforeend', ` - ${description}`);
        });

        // Include patterns section
        const includeDiv = filterGuideDiv.createDiv('filter-include-section');
        includeDiv.createEl('h4', { text: 'files to include (Search Only These Files)' });

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
            li.insertAdjacentText('beforeend', item);
        });

        // Exclude patterns section
        const excludeDiv = filterGuideDiv.createDiv('filter-exclude-section');
        excludeDiv.createEl('h4', { text: 'files to exclude (Skip These Files)' });

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
            li.insertAdjacentText('beforeend', item);
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
            // Parse the HTML-like content into safe DOM elements
            const parts = example.split('<strong>');
            li.insertAdjacentText('beforeend', parts[0]);

            if (parts.length > 1) {
                const strongPart = parts[1].split('</strong>');
                const strong = li.createEl('strong');
                strong.insertAdjacentText('beforeend', strongPart[0]);

                if (strongPart.length > 1) {
                    const remaining = strongPart[1];
                    const codeParts = remaining.split('<code>');
                    li.insertAdjacentText('beforeend', codeParts[0]);

                    if (codeParts.length > 1) {
                        const codeContent = codeParts[1].split('</code>');
                        const code = li.createEl('code');
                        code.insertAdjacentText('beforeend', codeContent[0]);

                        if (codeContent.length > 1) {
                            li.insertAdjacentText('beforeend', codeContent[1]);
                        }
                    }
                }
            }
        });

        // Performance tip
        const performanceTip = filterGuideDiv.createDiv('filter-performance-tip');
        const strong = performanceTip.createEl('strong');
        strong.insertAdjacentText('beforeend', '💡 Performance Tip:');
        performanceTip.insertAdjacentText('beforeend', ' Filtering happens before search processing, so narrow filters dramatically speed up searches in large vaults with thousands of files.');
    }

    private renderUsageTips(container: HTMLElement) {
        const tipsDiv = container.createDiv('help-tips');
        tipsDiv.createEl('h3', { text: 'Usage Tips' });

        const tipsList = tipsDiv.createEl('ul');

        const tips: (string | TipItem)[] = [
            { text: 'Use ', keys: ['Ctrl/Cmd', 'Shift', 'F'], suffix: ' to quickly open the plugin from anywhere in Obsidian' },
            { text: 'Regex mode supports capture groups (', code: '$1', middle: ', ', code2: '$2', suffix: ') for advanced replacements' },
            'Select specific results before using "Replace Selected" for precise control',
            { text: 'Use the filter button ', icon: 'filter', suffix: ' to search only specific file types or folders' },
            'Set default filters in Settings to avoid retyping common patterns',
            { text: 'Use ', keys: ['Ctrl/Cmd', 'K'], suffix: ' prefix for less common actions to avoid hotkey conflicts' },
            'The plugin remembers your expand/collapse preferences per file',
            'Multi-line replacements work great with regex patterns',
            'Include/exclude patterns are session-only; settings provide defaults'
        ];

        tips.forEach(tip => {
            const li = tipsList.createEl('li');

            if (typeof tip === 'string') {
                // Simple text tip
                li.insertAdjacentText('beforeend', tip);
            } else {
                // Complex tip with keyboard shortcuts
                li.insertAdjacentText('beforeend', tip.text);

                if (tip.keys) {
                    tip.keys.forEach((key, index) => {
                        if (index > 0) li.insertAdjacentText('beforeend', '+');
                        const kbd = li.createEl('kbd');
                        kbd.insertAdjacentText('beforeend', key);
                    });
                }

                if (tip.icon) {
                    const iconSpan = li.createEl('span', { cls: 'help-tip-icon' });
                    setIcon(iconSpan, tip.icon);
                }

                if (tip.code) {
                    const code = li.createEl('code');
                    code.insertAdjacentText('beforeend', tip.code);
                }

                if (tip.middle) {
                    li.insertAdjacentText('beforeend', tip.middle);
                }

                if (tip.code2) {
                    const code2 = li.createEl('code');
                    code2.insertAdjacentText('beforeend', tip.code2);
                }

                if (tip.suffix) {
                    li.insertAdjacentText('beforeend', tip.suffix);
                }
            }
        });

        const noteDiv = tipsDiv.createDiv('help-note');
        const hotkeyNote = noteDiv.createEl('p');
        hotkeyNote.insertAdjacentText('beforeend', 'To customize hotkeys: Go to ');
        const settingsKbd = hotkeyNote.createEl('kbd');
        settingsKbd.insertAdjacentText('beforeend', 'Settings');
        hotkeyNote.insertAdjacentText('beforeend', ' → ');
        const hotkeysKbd = hotkeyNote.createEl('kbd');
        hotkeysKbd.insertAdjacentText('beforeend', 'Hotkeys');
        hotkeyNote.insertAdjacentText('beforeend', ' → Search for "Find-n-Replace"');

        const settingsNote = noteDiv.createEl('p');
        settingsNote.insertAdjacentText('beforeend', 'To set default filters: Go to ');
        const strong = settingsNote.createEl('strong');
        strong.insertAdjacentText('beforeend', 'Settings → Community Plugins → Find-n-Replace → Options');
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}