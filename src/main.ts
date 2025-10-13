import { Plugin, WorkspaceLeaf } from 'obsidian';
import { FindReplaceView, VIEW_TYPE_FIND_REPLACE } from './ui/views/findReplaceView';
import {
	VaultFindReplaceSettings,
	DEFAULT_SETTINGS,
	VaultFindReplaceSettingTab,
} from "./settings";
import { LogLevel } from "./types";
import { HistoryManager } from './core/historyManager';

export default class VaultFindReplacePlugin extends Plugin {
	settings: VaultFindReplaceSettings;
	historyManager: HistoryManager;
	async onload() {
		await this.loadSettings();

		// Initialize history manager
		this.historyManager = new HistoryManager(this);

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
			id: 'open-find-n-replace',
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
			const wasAlreadyOpen = leaves.length > 0;

			if (leaves.length > 0) {
				leaf = leaves[0];
			} else {
				leaf = workspace.getRightLeaf(false);
				if (!leaf) {
					console.error("find-n-replace: failed to get or create leaf");
					return;
				}
				await leaf.setViewState({ type: VIEW_TYPE_FIND_REPLACE, active: true });
			}

			workspace.revealLeaf(leaf);

			// Focus the search input after activating the view
			// For newly opened views, use a delay to ensure rendering is complete
			// For already open views, focus immediately since they're already rendered
			const focusDelay = wasAlreadyOpen ? 0 : 100;
			setTimeout(() => {
				const view = this.getActiveView();
				if (view) {
					view.commandFocusSearch();
				}
			}, focusDelay);
		} catch (error) {
			console.error("find-n-replace: failed to activate view:", error);
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
			console.error("find-n-replace: failed to get active view:", error);
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
		} catch (error) {
			console.error('find-n-replace: Failed to load settings, using defaults:', error);
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	async saveSettings() {
		try {
			await this.saveData(this.settings);
		} catch (error) {
			console.error('find-n-replace: Failed to save settings:', error);
			// Don't throw - settings save failure shouldn't break the plugin
		}
	}

}