import { App, PluginSettingTab, Setting } from "obsidian";
import VaultFindReplacePlugin from "../main";
import { VaultFindReplaceSettings, LogLevel } from "../types";

export class VaultFindReplaceSettingTab extends PluginSettingTab {
    plugin: VaultFindReplacePlugin;

    constructor(app: App, plugin: VaultFindReplacePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // TODO: Implement search result highlighting feature
        // See ROADMAP.md - High Priority feature
        /*
        // Highlight duration
        new Setting(containerEl)
            .setName("Highlight duration")
            .setDesc("How long (in milliseconds) to keep highlights visible before fading out.")
            .addText((text) =>
                text
                    .setPlaceholder("2000")
                    .setValue(this.plugin.settings.highlightDuration.toString())
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.highlightDuration = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // Persistent highlight toggle
        new Setting(containerEl)
            .setName("Persistent highlight")
            .setDesc("Keep highlights visible until you run another search. Overrides highlight duration.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.persistentHighlight)
                    .onChange(async (value) => {
                        this.plugin.settings.persistentHighlight = value;
                        await this.plugin.saveSettings();
                    })
            );
        */

        // Max results
        new Setting(containerEl)
            .setName("Maximum results")
            .setDesc("Maximum number of search results to display. Higher values may impact performance.")
            .addText((text) =>
                text
                    .setPlaceholder("1000")
                    .setValue(this.plugin.settings.maxResults.toString())
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.maxResults = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // Auto search toggle
        new Setting(containerEl)
            .setName("Enable auto-search")
            .setDesc("Automatically search as you type (with debounce delay).")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableAutoSearch)
                    .onChange(async (value) => {
                        this.plugin.settings.enableAutoSearch = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Search debounce delay
        new Setting(containerEl)
            .setName("Search debounce delay")
            .setDesc("Delay in milliseconds before auto-search triggers while typing.")
            .addText((text) =>
                text
                    .setPlaceholder("300")
                    .setValue(this.plugin.settings.searchDebounceDelay.toString())
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.searchDebounceDelay = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // History settings section
        new Setting(containerEl)
            .setName('Search history')
            .setHeading();

        // Enable search history toggle
        new Setting(containerEl)
            .setName("Enable search history")
            .setDesc("Save search and replace patterns for quick access using arrow keys (↑↓).")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableSearchHistory)
                    .onChange(async (value) => {
                        this.plugin.settings.enableSearchHistory = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Max history size
        new Setting(containerEl)
            .setName("Maximum history entries")
            .setDesc("Maximum number of search and replace patterns to remember. Range: 10-200.")
            .addText((text) =>
                text
                    .setPlaceholder("50")
                    .setValue(this.plugin.settings.maxHistorySize.toString())
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 10 && num <= 200) {
                            this.plugin.settings.maxHistorySize = num;
                            await this.plugin.saveSettings();
                            // Trim existing history if needed
                            this.plugin.historyManager.updateMaxSize();
                        }
                    })
            );

        // Clear history button
        new Setting(containerEl)
            .setName("Clear search history")
            .setDesc(`Clear all saved search and replace patterns. Current history size: ${this.plugin.settings.searchHistory.length} search, ${this.plugin.settings.replaceHistory.length} replace.`)
            .addButton((button) =>
                button
                    .setButtonText("Clear All History")
                    .setWarning()
                    .onClick(async () => {
                        this.plugin.historyManager.clearAllHistory();
                        await this.plugin.saveSettings();
                        // Refresh the display to update the count
                        this.display();
                    })
            );

        // TODO: Implement line number display in search results
        // See ROADMAP.md - Medium Priority feature
        /*
        // Show line numbers
        new Setting(containerEl)
            .setName("Show line numbers")
            .setDesc("Display line numbers in search results.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showLineNumbers)
                    .onChange(async (value) => {
                        this.plugin.settings.showLineNumbers = value;
                        await this.plugin.saveSettings();
                    })
            );
        */

        // TODO: Implement file extension display in file headers
        // See ROADMAP.md - Low Priority feature
        /*
        // Show file extensions
        new Setting(containerEl)
            .setName("Show file extensions")
            .setDesc("Display file extensions in search results.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showFileExtensions)
                    .onChange(async (value) => {
                        this.plugin.settings.showFileExtensions = value;
                        await this.plugin.saveSettings();
                    })
            );
        */

        // File filtering default settings
        new Setting(containerEl)
            .setName('File filtering defaults')
            .setHeading();
        containerEl.createEl("p", {
            text: "These settings provide default values when opening a new find & replace view. Once a view is open, filter changes are session-only.",
            cls: "setting-item-description"
        });

        // Default files to include (VSCode-style)
        new Setting(containerEl)
            .setName("Default files to include")
            .setDesc("Default patterns that populate the \"files to include\" input when opening the view. Supports extensions (.md), folders (Notes/), and globs (*.js). Example: .md,.txt,Notes/,Projects/")
            .addText((text) =>
                text
                    .setPlaceholder("e.g. .md, Notes/, *.js")
                    .setValue(this.plugin.settings.defaultIncludePatterns.join(','))
                    .onChange(async (value) => {
                        this.plugin.settings.defaultIncludePatterns = value
                            .split(',')
                            .map(pattern => pattern.trim())
                            .filter(pattern => pattern.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        // Default files to exclude (VSCode-style)
        new Setting(containerEl)
            .setName("Default files to exclude")
            .setDesc("Default patterns that populate the \"files to exclude\" input when opening the view. Supports globs (*.tmp), folders (Archive/), and patterns (*backup*). Example: *.tmp,Archive/,*backup*")
            .addText((text) =>
                text
                    .setPlaceholder("e.g. *.tmp, Archive/, *backup*")
                    .setValue(this.plugin.settings.defaultExcludePatterns.join(','))
                    .onChange(async (value) => {
                        this.plugin.settings.defaultExcludePatterns = value
                            .split(',')
                            .map(pattern => pattern.trim())
                            .filter(pattern => pattern.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        // Add information section about how default settings work
        const filterInfoDiv = containerEl.createDiv('setting-item');
        filterInfoDiv.createEl('div', {
            cls: 'setting-item-info',
            text: ''
        });

        const filterInfoContent = filterInfoDiv.createDiv('setting-item-description');
        filterInfoContent.innerHTML = `
            <strong>💡 How default file filters work:</strong><br>
            • These default settings populate the <strong>"files to include"</strong> and <strong>"files to exclude"</strong> inputs when you open the Find-n-Replace view<br>
            • Filter inputs in the view are <strong>session-only</strong> - they don't modify these default settings<br>
            • To apply new defaults: change settings above, then <strong>close and reopen</strong> the Find-n-Replace view<br>
            • Leave settings empty to start with no filters by default<br>
            • Uses VSCode-style pattern syntax for familiar file filtering
        `;
        filterInfoContent.style.marginTop = '10px';
        filterInfoContent.style.padding = '12px';
        filterInfoContent.style.backgroundColor = 'var(--background-secondary)';
        filterInfoContent.style.borderRadius = '6px';
        filterInfoContent.style.borderLeft = '3px solid var(--interactive-accent)';

        // Troubleshooting section
        new Setting(containerEl)
            .setName('Troubleshooting')
            .setHeading();

        // Log level dropdown
        new Setting(containerEl)
            .setName("Console logging level")
            .setDesc("Control how much information is shown in the browser console. Higher levels include all lower levels.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption(LogLevel.SILENT.toString(), "Silent - No console output")
                    .addOption(LogLevel.ERROR.toString(), "Errors Only - Critical failures only (recommended)")
                    .addOption(LogLevel.WARN.toString(), "Standard - Errors and warnings")
                    .addOption(LogLevel.INFO.toString(), "Verbose - All info, warnings, and errors")
                    .addOption(LogLevel.DEBUG.toString(), "Debug - Full debugging output")
                    .addOption(LogLevel.TRACE.toString(), "Trace - Maximum verbosity (development)")
                    .setValue(this.plugin.settings.logLevel.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.logLevel = parseInt(value) as LogLevel;
                        await this.plugin.saveSettings();
                    });
            });
    }
}