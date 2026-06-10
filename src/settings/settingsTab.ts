import { App, PluginSettingTab, Setting, Notice, SettingDefinitionItem } from "obsidian";
import VaultFindReplacePlugin from "../main";
import { LogLevel } from "../types";
import { ConfirmModal } from "../modals/confirmModal";

export class VaultFindReplaceSettingTab extends PluginSettingTab {
    plugin: VaultFindReplacePlugin;

    constructor(app: App, plugin: VaultFindReplacePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        return [
            // Core settings group
            {
                type: 'group',
                heading: 'Search settings',
                items: [
                    {
                        name: "Maximum results",
                        desc: "Maximum number of search results to display. Higher values may impact performance.",
                        control: {
                            type: "text",
                            key: "maxResults",
                            placeholder: "1000",
                            validate: (value: string) => {
                                const num = parseInt(value, 10);
                                if (isNaN(num) || num <= 0) {
                                    return "Must be a positive number";
                                }
                                return undefined;
                            }
                        }
                    },
                    {
                        name: "Enable auto-search",
                        desc: "Automatically search as you type (with debounce delay).",
                        control: { type: "toggle", key: "enableAutoSearch" }
                    },
                    {
                        name: "Search debounce delay",
                        desc: "Delay in milliseconds before auto-search triggers while typing.",
                        control: {
                            type: "text",
                            key: "searchDebounceDelay",
                            placeholder: "300",
                            validate: (value: string) => {
                                const num = parseInt(value, 10);
                                if (isNaN(num) || num < 0) {
                                    return "Must be a non-negative number";
                                }
                                return undefined;
                            }
                        }
                    }
                ]
            },

            // Search history group
            {
                type: 'group',
                heading: 'Search history',
                items: [
                    {
                        name: "Enable search history",
                        desc: "Save search, replace, and file filter patterns for quick access using arrow keys (↑↓).",
                        control: { type: "toggle", key: "enableSearchHistory" }
                    },
                    {
                        name: "Maximum history entries",
                        desc: "Maximum number of patterns to remember in each history. Range: 10-200.",
                        control: {
                            type: "text",
                            key: "maxHistorySize",
                            placeholder: "50",
                            validate: (value: string) => {
                                const num = parseInt(value, 10);
                                if (isNaN(num) || num < 10 || num > 200) {
                                    return "Must be between 10 and 200";
                                }
                                return undefined;
                            }
                        }
                    },
                    {
                        name: "Clear search history",
                        render: (setting: Setting) => {
                            const updateDesc = () => {
                                setting.setDesc(`Clear all saved search, replace, and file filter patterns. Current history size: ${this.plugin.settings.searchHistory.length} search, ${this.plugin.settings.replaceHistory.length} replace, ${this.plugin.settings.includeHistory.length} include, ${this.plugin.settings.excludeHistory.length} exclude.`);
                            };
                            updateDesc();
                            setting.addButton((button) =>
                                button
                                    .setButtonText("Clear all history")
                                    .setDestructive()
                                    .onClick(async () => {
                                        const modal = new ConfirmModal(
                                            this.app,
                                            "Are you sure you want to clear all search, replace, and file filter history? This action cannot be undone.",
                                            {
                                                confirmText: "Clear",
                                                confirmClass: "mod-warning",
                                                cancelText: "Cancel"
                                            }
                                        );
                                        const confirmed = await modal.openAndConfirm();

                                        if (confirmed) {
                                            this.plugin.historyManager.clearAllHistory();
                                            await this.plugin.saveSettings();
                                            new Notice("Search, replace, and filter history cleared");
                                            updateDesc();
                                        }
                                    })
                            );
                        }
                    }
                ]
            },

            // File filtering defaults group
            {
                type: 'group',
                heading: 'File filtering defaults',
                items: [
                    {
                        name: "Filter behavior",
                        desc: "These settings provide default values when opening a new find & replace view. Once a view is open, filter changes are session-only."
                    },
                    {
                        name: "Default files to include",
                        desc: "Default patterns that populate the \"files to include\" input when opening the view. Supports extensions (.md), folders (Notes/), and globs (*.js). Example: .md,.txt,Notes/,Projects/",
                        render: (setting: Setting) => {
                            setting.addText((text) =>
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
                        }
                    },
                    {
                        name: "Default files to exclude",
                        desc: "Default patterns that populate the \"files to exclude\" input when opening the view. Supports globs (*.tmp), folders (Archive/), and patterns (*backup*). Example: *.tmp,Archive/,*backup*",
                        render: (setting: Setting) => {
                            setting.addText((text) =>
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
                        }
                    },
                    {
                        name: "How default file filters work",
                        render: (setting: Setting) => {
                            setting.settingEl.addClass('filter-info-box');
                            const descEl = setting.descEl;

                            const list = descEl.createEl('div');
                            list.appendText('• These default settings populate the ');
                            list.createEl('strong', { text: '"files to include"' });
                            list.appendText(' and ');
                            list.createEl('strong', { text: '"files to exclude"' });
                            list.appendText(' inputs when you open the Find-n-Replace view');
                            list.createEl('br');

                            list.appendText('• Filter inputs in the view are ');
                            list.createEl('strong', { text: 'session-only' });
                            list.appendText(' - they don\'t modify these default settings');
                            list.createEl('br');

                            list.appendText('• To apply new defaults: change settings above, then ');
                            list.createEl('strong', { text: 'close and reopen' });
                            list.appendText(' the Find-n-Replace view');
                            list.createEl('br');

                            list.appendText('• Leave settings empty to start with no filters by default');
                            list.createEl('br');

                            list.appendText('• Uses VSCode-style pattern syntax for familiar file filtering');
                        }
                    }
                ]
            },

            // User experience group
            {
                type: 'group',
                heading: 'User experience',
                items: [
                    {
                        name: "Confirm destructive actions",
                        desc: "Show confirmation dialog before replace all in vault operations. Disable for faster workflow if you're confident.",
                        control: { type: "toggle", key: "confirmDestructiveActions" }
                    },
                    {
                        name: "Remember search options",
                        desc: "Persist match case, whole word, regex, and multiline toggle states across sessions. When disabled, toggles reset to off each time you open the view.",
                        control: { type: "toggle", key: "rememberSearchOptions" }
                    },
                    {
                        name: "Remember file group states across restarts",
                        desc: "Persist expand/collapse state of result file groups to disk. When enabled, group states are saved across Obsidian restarts. When disabled, states only persist during current session (reset when view closes).",
                        control: { type: "toggle", key: "rememberFileGroupStates" }
                    },
                    {
                        name: "Warn about slow regex patterns",
                        desc: "Show a warning notice when using regex patterns that may cause performance issues (e.g., .* or .+ followed by specific characters).",
                        control: { type: "toggle", key: "warnDangerousRegex" }
                    }
                ]
            },

            // Troubleshooting group
            {
                type: 'group',
                heading: 'Troubleshooting',
                items: [
                    {
                        name: "Console logging level",
                        desc: "Control how much information is shown in the browser console. Higher levels include all lower levels.",
                        control: {
                            type: "dropdown",
                            key: "logLevel",
                            options: {
                                [LogLevel.SILENT.toString()]: "Silent - no console output",
                                [LogLevel.ERROR.toString()]: "Errors only - critical failures only (recommended)",
                                [LogLevel.WARN.toString()]: "Standard - errors and warnings",
                                [LogLevel.INFO.toString()]: "Verbose - all info, warnings, and errors",
                                [LogLevel.DEBUG.toString()]: "Debug - full debugging output",
                                [LogLevel.TRACE.toString()]: "Trace - maximum verbosity (development)"
                            }
                        }
                    }
                ]
            }
        ];
    }
}
