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

			// Migration: Convert old filter settings to new unified pattern arrays
			if ((loadedData.fileExtensions !== undefined || loadedData.searchInFolders !== undefined ||
				 loadedData.includePatterns !== undefined || loadedData.excludePatterns !== undefined ||
				 loadedData.excludeFolders !== undefined) &&
				(this.settings.defaultIncludePatterns.length === 0 && this.settings.defaultExcludePatterns.length === 0)) {

				// Migrate include patterns (extensions + folders + include patterns)
				const includePatterns: string[] = [];
				if (loadedData.fileExtensions?.length > 0) {
					loadedData.fileExtensions.forEach((ext: string) => {
						// Add dot prefix if not already present
						includePatterns.push(ext.startsWith('.') ? ext : `.${ext}`);
					});
				}
				if (loadedData.searchInFolders?.length > 0) {
					loadedData.searchInFolders.forEach((folder: string) => {
						// Ensure folder ends with slash
						includePatterns.push(folder.endsWith('/') ? folder : `${folder}/`);
					});
				}
				if (loadedData.includePatterns?.length > 0) {
					includePatterns.push(...loadedData.includePatterns);
				}

				// Migrate exclude patterns (exclude patterns + exclude folders)
				const excludePatterns: string[] = [];
				if (loadedData.excludePatterns?.length > 0) {
					excludePatterns.push(...loadedData.excludePatterns);
				}
				if (loadedData.excludeFolders?.length > 0) {
					loadedData.excludeFolders.forEach((folder: string) => {
						// Ensure folder ends with slash
						excludePatterns.push(folder.endsWith('/') ? folder : `${folder}/`);
					});
				}

				this.settings.defaultIncludePatterns = includePatterns;
				this.settings.defaultExcludePatterns = excludePatterns;

				console.log(`vault-find-replace: Migrated old filter settings to unified patterns:`, {
					include: includePatterns,
					exclude: excludePatterns
				});

				// Remove old settings and save migrated settings
				delete (this.settings as any).fileExtensions;
				delete (this.settings as any).searchInFolders;
				delete (this.settings as any).includePatterns;
				delete (this.settings as any).excludePatterns;
				delete (this.settings as any).excludeFolders;
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