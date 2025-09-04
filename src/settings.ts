import { App, PluginSettingTab, Setting } from "obsidian";

export interface VaultFindReplaceSettings {
    highlightDuration: number; // in ms
    persistentHighlight: boolean;
}

export const DEFAULT_SETTINGS: VaultFindReplaceSettings = {
    highlightDuration: 2000,
    persistentHighlight: false,
};

export class VaultFindReplaceSettingTab extends PluginSettingTab {
    plugin: any;

    constructor(app: App, plugin: any) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Vault Find & Replace Settings" });

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
    }
}
