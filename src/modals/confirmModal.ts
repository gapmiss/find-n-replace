import { App, Modal } from 'obsidian';

export interface ConfirmModalOptions {
    confirmText?: string;
    confirmClass?: string;
    cancelText?: string;
}

export class ConfirmModal extends Modal {
    result: boolean = false;
    isOpen: boolean = false; // track open state
    private options: ConfirmModalOptions;

    constructor(app: App, private message: string, options?: ConfirmModalOptions) {
        super(app);
        this.options = {
            confirmText: options?.confirmText || 'OK',
            confirmClass: options?.confirmClass || 'mod-cta',
            cancelText: options?.cancelText || 'Cancel'
        };
    }

    onOpen() {
        this.isOpen = true;
        const { contentEl } = this;
        contentEl.createEl('p', { text: this.message });

        const btnContainer = contentEl.createEl('div', { cls: 'modal-button-container' });
        const yesBtn = btnContainer.createEl('button', {
            text: this.options.confirmText,
            cls: this.options.confirmClass
        });
        const noBtn = btnContainer.createEl('button', { text: this.options.cancelText });

        yesBtn.addEventListener('click', async (evt) => {
            this.result = true;
            this.close();
        });
        noBtn.addEventListener('click', async (evt) => {
            this.result = false;
            this.close();
        });

        // Focus cancel button after modal renders (safer for destructive actions)
        setTimeout(() => {
            noBtn.focus();
        }, 0);
    }

    onClose() {
        this.isOpen = false;
        this.contentEl.empty();
    }
}