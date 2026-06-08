import { Plugin, WorkspaceLeaf, MarkdownView, TFile, TAbstractFile, debounce, Debouncer } from 'obsidian';
import { FindReplaceView, VIEW_TYPE_FIND_REPLACE } from './ui/views/findReplaceView';
import {
	VaultFindReplaceSettings,
	DEFAULT_SETTINGS,
	VaultFindReplaceSettingTab,
} from "./settings";
import { HistoryManager } from './core/historyManager';
import { Logger, FOCUS_DELAY } from './utils';

export default class VaultFindReplacePlugin extends Plugin {
	settings!: VaultFindReplaceSettings;
	historyManager!: HistoryManager;
	private logger!: Logger;
	async onload() {
		await this.loadSettings();

		// Initialize logger
		this.logger = Logger.create(this, 'Plugin');

		// Initialize history manager
		this.historyManager = new HistoryManager(this);

		this.addSettingTab(new VaultFindReplaceSettingTab(this.app, this));
		this.registerView(
			VIEW_TYPE_FIND_REPLACE,
			(leaf: WorkspaceLeaf) => new FindReplaceView(leaf, this.app, this)
		);

		this.addRibbonIcon('replace', 'Find-n-Replace', () => {
			void this.activateView();
		});

		// Register commands for keyboard shortcuts
		this.addCommand({
			id: 'open',
			name: 'Open',
			callback: () => {
				void this.activateView();
			}
		});

		this.addCommand({
			id: 'perform-search',
			name: 'Perform search',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					await view.commandPerformSearch();
				}
			}
		});

		this.addCommand({
			id: 'clear-all',
			name: 'Clear search and replace',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandClearAll();
				}
			}
		});

		this.addCommand({
			id: 'focus-search-input',
			name: 'Focus search input',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandFocusSearch();
				}
			}
		});

		this.addCommand({
			id: 'focus-replace-input',
			name: 'Focus replace input',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandFocusReplace();
				}
			}
		});

		this.addCommand({
			id: 'toggle-match-case',
			name: 'Toggle match case',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandToggleMatchCase();
				}
			}
		});

		this.addCommand({
			id: 'toggle-whole-word',
			name: 'Toggle whole word',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandToggleWholeWord();
				}
			}
		});

		this.addCommand({
			id: 'toggle-regex',
			name: 'Toggle regex',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandToggleRegex();
				}
			}
		});

		this.addCommand({
			id: 'toggle-multiline',
			name: 'Toggle multiline',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandToggleMultiline();
				}
			}
		});

		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected matches',
			callback: async () => {
				const view = this.getActiveView();
				if (view) {
					await view.commandReplaceSelected();
				}
			}
		});

		this.addCommand({
			id: 'replace-all-vault',
			name: 'Replace all in vault',
			callback: async () => {
				const view = this.getActiveView();
				if (view) {
					await view.commandReplaceAllVault();
				}
			}
		});

		this.addCommand({
			id: 'expand-collapse-all',
			name: 'Expand/collapse all results',
			callback: () => {
				const view = this.getActiveView();
				if (view) {
					view.commandExpandCollapseAll();
				}
			}
		});

		this.addCommand({
			id: 'select-all-results',
			name: 'Select all results',
			callback: () => {
				const view = this.getActiveView();
				if (view) {
					view.commandSelectAllResults();
				}
			}
		});

		this.addCommand({
			id: 'open-help',
			name: 'Open help',
			callback: async () => {
				const view = await this.getOrCreateView();
				if (view) {
					view.commandOpenHelp();
				}
			}
		});

		// Register file modification events to update search results dynamically
		this.registerFileEvents();
	}

	/**
	 * Registers file system event handlers for dynamic result updates
	 * Uses debouncing to avoid excessive updates during rapid file changes
	 */
	private registerFileEvents(): void {
		const FILE_MODIFY_DEBOUNCE_MS = 250;

		// Create a debounced handler for file modifications
		// Uses a Map to debounce per-file, so rapid edits to different files don't block each other
		const pendingModifications = new Map<string, Debouncer<[TFile], void>>();

		// File modify event - update search results when a file is edited
		this.registerEvent(
			this.app.vault.on('modify', (file: TAbstractFile) => {
				if (!(file instanceof TFile)) return;

				const view = this.getActiveView();
				if (!view) return;

				// Get or create a debounced handler for this specific file
				let debouncedHandler = pendingModifications.get(file.path);
				if (!debouncedHandler) {
					debouncedHandler = debounce((f: TFile) => {
						const currentView: FindReplaceView | null = this.getActiveView();
						if (currentView) {
							void currentView.handleFileModified(f);
						}
						// Clean up the handler after execution
						pendingModifications.delete(f.path);
					}, FILE_MODIFY_DEBOUNCE_MS, true);
					pendingModifications.set(file.path, debouncedHandler);
				}

				debouncedHandler(file);
			})
		);

		// File delete event - remove results for deleted files immediately
		this.registerEvent(
			this.app.vault.on('delete', (file: TAbstractFile) => {
				if (!(file instanceof TFile)) return;

				const view: FindReplaceView | null = this.getActiveView();
				if (view) {
					view.handleFileDeleted(file);
				}
			})
		);

		// File rename event - update file references in results immediately
		this.registerEvent(
			this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
				if (!(file instanceof TFile)) return;

				const view: FindReplaceView | null = this.getActiveView();
				if (view) {
					view.handleFileRenamed(file, oldPath);
				}
			})
		);

		this.logger.debug('File event handlers registered');
	}

	onunload() {
		// Plugin cleanup - Obsidian handles view cleanup automatically
		// Any global caches or resources would be cleared here
		// Currently all resources are managed at the view level
	}

	async activateView() {
		try {
			const { workspace } = this.app;

			// Get selected text from the active editor, if any
			let selectedText = '';
			const activeView = workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const editor = activeView.editor;
				selectedText = editor.getSelection();
			}

			let leaf: WorkspaceLeaf | null = null;
			const leaves = workspace.getLeavesOfType(VIEW_TYPE_FIND_REPLACE);
			const wasAlreadyOpen = leaves.length > 0;

			if (leaves.length > 0) {
				leaf = leaves[0];
			} else {
				leaf = workspace.getRightLeaf(false);
				if (!leaf) {
					this.logger.error("Failed to get or create leaf", undefined, true);
					return;
				}
				await leaf.setViewState({ type: VIEW_TYPE_FIND_REPLACE, active: true });
			}

			await workspace.revealLeaf(leaf);

			// Focus the search input after activating the view
			// For newly opened views, use a delay to ensure rendering is complete
			// For already open views, focus immediately since they're already rendered
			const focusDelay = wasAlreadyOpen ? 0 : FOCUS_DELAY;
			window.setTimeout(() => {
				const view = this.getActiveView();
				if (view) {
					// Pre-populate search input with selected text if available
					if (selectedText) {
						view.setSearchText(selectedText);
					}
					view.commandFocusSearch();
				}
			}, focusDelay);
		} catch (error) {
			this.logger.error("Failed to activate view", error, true);
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
			this.logger.error("Failed to get active view", error);
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
			const loadedData = (await this.loadData()) as Partial<VaultFindReplaceSettings> | null;
			// Deep clone DEFAULT_SETTINGS to avoid mutating module-level defaults
			this.settings = Object.assign(structuredClone(DEFAULT_SETTINGS), loadedData ?? {});
		} catch (error) {
			// Logger not initialized yet during loadSettings, use console as fallback
			console.error('find-n-replace: Failed to load settings, using defaults:', error);
			this.settings = structuredClone(DEFAULT_SETTINGS);
		}
	}

	async saveSettings() {
		try {
			await this.saveData(this.settings);
		} catch (error) {
			this.logger.error('Failed to save settings', error, true);
			// Don't throw - settings save failure shouldn't break the plugin
		}
	}

}
