import { App, MarkdownView, TFile, WorkspaceLeaf, Editor } from 'obsidian';
import { Logger } from '../utils';
import VaultFindReplacePlugin from '../main';

/**
 * Handles file opening and navigation operations
 */
export class FileOperations {
    private app: App;
    private logger: Logger;

    constructor(app: App, plugin?: VaultFindReplacePlugin) {
        this.app = app;
        this.logger = plugin ? Logger.create(plugin, 'FileOperations') : {
            debug: console.debug.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console)
        } as Logger;
    }

    /**
     * Opens a file at a specific line and column, highlighting the match
     * @param file - The file to open
     * @param line - Zero-based line number
     * @param col - Column position of the match
     * @param matchText - The matched text to highlight
     * @param sourceElement - The UI element that triggered this (for focus return)
     */
    async openFileAtLine(
        file: TFile,
        line: number,
        col: number | undefined,
        matchText: string,
        sourceElement?: HTMLElement
    ): Promise<void> {
        try {
            this.logger.debug('FileOperations.openFileAtLine called with:', { file: file.path, line, col, matchText });
            // Find existing leaf with this file or create a new one
            const existingLeaves = this.app.workspace.getLeavesOfType('markdown');
            let leaf = existingLeaves.find(l =>
                l.view instanceof MarkdownView && l.view.file?.path === file.path
            );

            if (!leaf) {
                // File not currently open - open in new leaf
                leaf = this.app.workspace.getLeaf(true);
                await leaf.openFile(file);
                this.app.workspace.revealLeaf(leaf);
            } else {
                // File already open - just bring to front
                this.app.workspace.revealLeaf(leaf);
            }

            const mdView = leaf.view as MarkdownView;
            await this.ensureSourceMode(leaf, file);

            if (!mdView?.editor) {
                this.logger.warn('No editor available for file:', file.path);
                return;
            }

            const editor = mdView.editor;

            // Calculate selection range for the match
            const chStart = col ?? 0;
            let chEnd = chStart;
            if (matchText) {
                chEnd = chStart + matchText.length;
            }

            // Set selection to highlight the match and focus the editor
            editor.setSelection({ line, ch: chStart }, { line, ch: chEnd });
            editor.focus();

            // Center the match in the viewport
            await this.centerMatchInViewport(editor, line, chStart);

            // Return focus to source element after a brief delay
            if (sourceElement) {
                setTimeout(() => {
                    sourceElement.focus();
                }, 100);
            }

        } catch (error) {
            this.logger.error('Error opening file at line:', error);
        }
    }


    /**
     * Ensures a leaf is in source mode (not preview mode)
     * @param leaf - The workspace leaf
     * @param file - The file being opened
     */
    private async ensureSourceMode(leaf: WorkspaceLeaf, file: TFile): Promise<void> {
        const viewState = leaf.getViewState();

        // Switch from preview mode to source mode if necessary
        if (viewState.state?.mode === 'preview') {
            await leaf.setViewState({
                type: 'markdown',
                state: {
                    file: file.path,
                    mode: 'source'
                },
            });
        }
    }

    /**
     * Centers a match in the editor viewport using CodeMirror 6 API
     * @param editor - The editor instance
     * @param line - Line number to center
     * @param ch - Character position
     */
    private async centerMatchInViewport(editor: Editor, line: number, ch: number): Promise<void> {
        try {
            this.logger.debug('Centering match in viewport', { line, ch });

            // Access CodeMirror instance with proper type checking
            const editorWithCm = editor as Editor & {
                cm?: {
                    dispatch: (transaction: unknown) => void;
                    constructor?: {
                        scrollIntoView: (pos: number, options: { y: string }) => unknown;
                    };
                }
            };
            const cmView = editorWithCm.cm;

            if (cmView && typeof cmView.dispatch === 'function') {
                const pos = editor.posToOffset({ line, ch });
                if (typeof pos === 'number' && cmView.constructor?.scrollIntoView) {
                    cmView.dispatch({
                        effects: cmView.constructor.scrollIntoView(pos, { y: 'center' })
                    });
                    this.logger.debug('Successfully centered match using CodeMirror API');
                    return;
                }
            }

            // Fallback: use standard Obsidian scroll method
            this.logger.debug('Using fallback scroll method');
            const startPos = { line, ch };
            const endPos = { line, ch };
            editor.scrollIntoView({ from: startPos, to: endPos }, true);

        } catch (error) {
            this.logger.warn('Could not center match in viewport, trying basic scroll', error);
            try {
                const startPos = { line, ch };
                const endPos = { line, ch };
                editor.scrollIntoView({ from: startPos, to: endPos }, true);
            } catch (fallbackError) {
                this.logger.error('All scroll methods failed', fallbackError);
            }
        }
    }

    /**
     * Gets a file by its path
     * @param path - The file path
     * @returns The file or null if not found
     */
    getFileByPath(path: string): TFile | null {
        const file = this.app.vault.getAbstractFileByPath(path);
        return file instanceof TFile ? file : null;
    }

    /**
     * Cleanup method for when file operations are no longer needed
     * Clears all references for garbage collection
     */
    dispose(): void {
        // Clear references for garbage collection
        this.app = null as any;
        this.logger = null as any;
    }
}