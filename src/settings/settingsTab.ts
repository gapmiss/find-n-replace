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

        containerEl.createEl("h2", { text: "Find-n-Replace Settings" });

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
        containerEl.createEl("h3", { text: "File Filtering Defaults" });
        containerEl.createEl("p", {
            text: "These settings provide default values when opening a new find & replace view. Once a view is open, filter changes are session-only.",
            cls: "setting-item-description"
        });

        // Default file extensions filter
        new Setting(containerEl)
            .setName("Default file extensions")
            .setDesc("Default comma-separated list of file extensions to search (leave empty for all). Example: md,txt,js")
            .addText((text) =>
                text
                    .setPlaceholder("md,txt,js")
                    .setValue(this.plugin.settings.fileExtensions.join(','))
                    .onChange(async (value) => {
                        this.plugin.settings.fileExtensions = value
                            .split(',')
                            .map(ext => ext.trim())
                            .filter(ext => ext.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        // Default exclude patterns
        new Setting(containerEl)
            .setName("Default exclude patterns")
            .setDesc("Default comma-separated list of file patterns to exclude from search. Supports * and ? wildcards. Example: *.tmp,temp/*,*backup*")
            .addText((text) =>
                text
                    .setPlaceholder("*.tmp,temp/*,*backup*")
                    .setValue(this.plugin.settings.excludePatterns.join(','))
                    .onChange(async (value) => {
                        this.plugin.settings.excludePatterns = value
                            .split(',')
                            .map(pattern => pattern.trim())
                            .filter(pattern => pattern.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        // Default search in folders
        new Setting(containerEl)
            .setName("Default search folders")
            .setDesc("Default comma-separated list of folders to search in (leave empty for all folders). Example: Notes,Projects,Daily")
            .addText((text) =>
                text
                    .setPlaceholder("Notes,Projects,Daily")
                    .setValue(this.plugin.settings.searchInFolders.join(','))
                    .onChange(async (value) => {
                        this.plugin.settings.searchInFolders = value
                            .split(',')
                            .map(folder => folder.trim())
                            .filter(folder => folder.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        // Default exclude folders
        new Setting(containerEl)
            .setName("Default exclude folders")
            .setDesc("Default comma-separated list of folders to exclude from search. Example: Archive,Templates,.trash")
            .addText((text) =>
                text
                    .setPlaceholder("Archive,Templates,.trash")
                    .setValue(this.plugin.settings.excludeFolders.join(','))
                    .onChange(async (value) => {
                        this.plugin.settings.excludeFolders = value
                            .split(',')
                            .map(folder => folder.trim())
                            .filter(folder => folder.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

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