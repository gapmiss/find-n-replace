import { App, Modal } from 'obsidian';

export interface ConfirmModalOptions {
    confirmText?: string;
    confirmClass?: string;
    cancelText?: string;
}

export class ConfirmModal extends Modal {
    result: boolean = false;
    isOpen: boolean = false;
    private options: ConfirmModalOptions;
    private resolvePromise: ((value: boolean) => void) | null = null;

    constructor(app: App, private message: string, options?: ConfirmModalOptions) {
        super(app);
        this.options = {
            confirmText: options?.confirmText || 'OK',
            confirmClass: options?.confirmClass || 'mod-cta',
            cancelText: options?.cancelText || 'Cancel'
        };
    }

    /**
     * Opens the modal and returns a Promise that resolves with the user's choice
     * Replaces the spin-wait polling pattern
     */
    openAndConfirm(): Promise<boolean> {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.open();
        });
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

        yesBtn.addEventListener('click', () => {
            this.result = true;
            this.close();
        });
        noBtn.addEventListener('click', () => {
            this.result = false;
            this.close();
        });

        // Focus cancel button after modal renders (safer for destructive actions)
        window.setTimeout(() => {
            noBtn.focus();
        }, 0);
    }

    onClose() {
        this.isOpen = false;
        this.contentEl.empty();
        // Resolve the promise when modal closes
        if (this.resolvePromise) {
            this.resolvePromise(this.result);
            this.resolvePromise = null;
        }
    }
}