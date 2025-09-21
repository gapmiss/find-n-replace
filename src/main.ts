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

		this.addRibbonIcon('text-search', 'Find-n-Replace', () => {
			this.activateView();
		});

		// Register commands for keyboard shortcuts
		this.addCommand({
			id: 'open-vault-find-replace',
			name: 'Open Find-n-Replace',
			callback: () => {
				this.activateView();
			}
		});

		this.addCommand({
			id: 'perform-search',
			name: 'Perform Search',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandPerformSearch();
				}
			}
		});

		this.addCommand({
			id: 'clear-all',
			name: 'Clear Search and Replace',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandClearAll();
				}
			}
		});

		this.addCommand({
			id: 'focus-search-input',
			name: 'Focus Search Input',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandFocusSearch();
				}
			}
		});

		this.addCommand({
			id: 'focus-replace-input',
			name: 'Focus Replace Input',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandFocusReplace();
				}
			}
		});

		this.addCommand({
			id: 'toggle-match-case',
			name: 'Toggle Match Case',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandToggleMatchCase();
				}
			}
		});

		this.addCommand({
			id: 'toggle-whole-word',
			name: 'Toggle Whole Word',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandToggleWholeWord();
				}
			}
		});

		this.addCommand({
			id: 'toggle-regex',
			name: 'Toggle Regex',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandToggleRegex();
				}
			}
		});

		this.addCommand({
			id: 'replace-selected',
			name: 'Replace Selected Matches',
			callback: async () => {
				const view = this.getActiveView();
				if (view) {
					view.commandReplaceSelected();
				}
			}
		});

		this.addCommand({
			id: 'replace-all-vault',
			name: 'Replace All in Vault',
			callback: async () => {
				const view = this.getActiveView();
				if (view) {
					view.commandReplaceAllVault();
				}
			}
		});

		this.addCommand({
			id: 'expand-collapse-all',
			name: 'Expand/Collapse All Results',
			callback: async () => {
				const view = this.getActiveView();
				if (view) {
					view.commandExpandCollapseAll();
				}
			}
		});

		this.addCommand({
			id: 'select-all-results',
			name: 'Select All Results',
			callback: async () => {
				const view = this.getActiveView();
				if (view) {
					view.commandSelectAllResults();
				}
			}
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

	/**
	 * Gets the active FindReplaceView instance if it exists
	 * @returns FindReplaceView instance or null if not open
	 */
	getActiveView(): FindReplaceView | null {
		try {
			const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FIND_REPLACE);
			if (leaves.length > 0) {
				const view = leaves[0].view;
				return view instanceof FindReplaceView ? view : null;
			}
			return null;
		} catch (error) {
			console.error("vault-find-replace: failed to get active view:", error);
			return null;
		}
	}

	/**
	 * Gets the active view, opening it if it doesn't exist
	 * @returns FindReplaceView instance after ensuring it's open
	 */
	async getOrCreateView(): Promise<FindReplaceView | null> {
		let view = this.getActiveView();
		if (!view) {
			await this.activateView();
			view = this.getActiveView();
		}
		return view;
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

			// Notify active view of settings change for bidirectional sync
			this.notifyViewOfSettingsChange();
		} catch (error) {
			console.error('vault-find-replace: Failed to save settings:', error);
			// Don't throw - settings save failure shouldn't break the plugin
		}
	}

	/**
	 * Notify the active view that settings have changed (for bidirectional sync)
	 */
	private notifyViewOfSettingsChange(): void {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FIND_REPLACE);
		if (leaves.length > 0) {
			const view = leaves[0].view as FindReplaceView;
			if (view && typeof view.onSettingsChanged === 'function') {
				view.onSettingsChanged();
			}
		}
	}

}