import { Plugin, WorkspaceLeaf } from 'obsidian';
import { FindReplaceView, VIEW_TYPE_FIND_REPLACE } from './ui/views/findReplaceView';
import {
	VaultFindReplaceSettings,
	DEFAULT_SETTINGS,
	VaultFindReplaceSettingTab,
} from "./settings";
import { LogLevel } from "./types";

export default class VaultFindReplacePlugin extends Plugin {
	settings: VaultFindReplaceSettings;
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new VaultFindReplaceSettingTab(this.app, this));
		this.registerView(
			VIEW_TYPE_FIND_REPLACE,
			(leaf: WorkspaceLeaf) => new FindReplaceView(leaf, this.app, this)
		);

		this.addRibbonIcon('text-search', 'Vault Find & Replace', () => {
			this.activateView();
		});
	}

	onunload() {
		// Plugin cleanup - Obsidian handles view cleanup automatically
		// Any global caches or resources would be cleared here
		// Currently all resources are managed at the view level
	}

	async activateView() {
		try {
			const { workspace } = this.app;

			let leaf: WorkspaceLeaf | null = null;
			const leaves = workspace.getLeavesOfType(VIEW_TYPE_FIND_REPLACE);

			if (leaves.length > 0) {
				leaf = leaves[0];
			} else {
				leaf = workspace.getRightLeaf(false);
				if (!leaf) {
					console.error("vault-find-replace: failed to get or create leaf");
					return;
				}
				await leaf.setViewState({ type: VIEW_TYPE_FIND_REPLACE, active: true });
			}

			workspace.revealLeaf(leaf);
		} catch (error) {
			console.error("vault-find-replace: failed to activate view:", error);
			// Don't throw - just log the error so plugin doesn't crash
		}
	}

	async loadSettings() {
		try {
			const loadedData = await this.loadData() || {};
			this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

			// Migration: Convert old enableDebugLogging to new logLevel
			if (loadedData.enableDebugLogging !== undefined && this.settings.logLevel === undefined) {
				this.settings.logLevel = loadedData.enableDebugLogging ? LogLevel.DEBUG : LogLevel.ERROR;
				console.log(`vault-find-replace: Migrated enableDebugLogging(${loadedData.enableDebugLogging}) to logLevel(${this.settings.logLevel})`);

				// Remove the old setting and save migrated settings
				delete (this.settings as any).enableDebugLogging;
				await this.saveSettings();
			}
		} catch (error) {
			console.error('vault-find-replace: Failed to load settings, using defaults:', error);
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	async saveSettings() {
		try {
			await this.saveData(this.settings);
		} catch (error) {
			console.error('vault-find-replace: Failed to save settings:', error);
			// Don't throw - settings save failure shouldn't break the plugin
		}
	}

}