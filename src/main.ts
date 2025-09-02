import { Plugin, WorkspaceLeaf } from 'obsidian';
import { FindReplaceView, VIEW_TYPE_FIND_REPLACE } from './vaultFindReplaceView';

export default class VaultFindReplacePlugin extends Plugin {
	async onload() {
		this.registerView(
			VIEW_TYPE_FIND_REPLACE,
			(leaf: WorkspaceLeaf) => new FindReplaceView(leaf, this.app)
		);

		this.addRibbonIcon('text-search', 'Vault Find & Replace', () => {
			this.activateView();
		});
	}

	onunload() { }

	async activateView() {
		const { workspace } = this.app;

		// Check if view is already open
		const leaf = workspace.getLeavesOfType(VIEW_TYPE_FIND_REPLACE).first();
		if (leaf) {
			await workspace.revealLeaf(leaf);
			return;
		}

		// Open view in right sidebar
		await workspace.getRightLeaf(false)?.setViewState({
			type: VIEW_TYPE_FIND_REPLACE,
			active: true,
		});

		workspace.revealLeaf(
			workspace.getLeavesOfType(VIEW_TYPE_FIND_REPLACE).first()!
		);
	}
}