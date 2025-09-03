import { App, Modal } from 'obsidian';

export class ConfirmModal extends Modal {
    result: boolean = false;
    isOpen: boolean = false; // track open state
    constructor(app: App, private message: string) {
        super(app);
    }

    onOpen() {
        this.isOpen = true;
        const { contentEl } = this;
        contentEl.createEl('p', { text: this.message });

        const btnContainer = contentEl.createEl('div', { cls: 'modal-button-container' });
        const yesBtn = btnContainer.createEl('button', { text: 'OK', cls: 'mod-cta' });
        const noBtn = btnContainer.createEl('button', { text: 'Cancel' });

        yesBtn.addEventListener('click', async (evt) => {
            this.result = true;
            this.close();
        });
        noBtn.addEventListener('click', async (evt) => {
            this.result = false;
            this.close();
        });
    }

    onClose() {
        this.isOpen = false;
        this.contentEl.empty();
    }
}
