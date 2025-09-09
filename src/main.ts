import { Plugin, WorkspaceLeaf } from 'obsidian';
import { FindReplaceView, VIEW_TYPE_FIND_REPLACE } from './vaultFindReplaceView';
import {
	VaultFindReplaceSettings,
	DEFAULT_SETTINGS,
	VaultFindReplaceSettingTab,
} from "./settings";

export default class VaultFindReplacePlugin extends Plugin {
	settings: any;
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

	onunload() { }

	async activateView() {
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
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}