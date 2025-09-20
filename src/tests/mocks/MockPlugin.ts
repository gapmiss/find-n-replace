import { App } from 'obsidian';
import VaultFindReplacePlugin from '../../main';
import { VaultFindReplaceSettings, DEFAULT_SETTINGS } from '../../settings';
import { MockApp } from './MockApp';

/**
 * Mock VaultFindReplacePlugin for testing
 */
export class MockPlugin {
    app: App;
    settings: VaultFindReplaceSettings;

    constructor(app?: App) {
        this.app = app || new MockApp() as unknown as App;
        this.settings = { ...DEFAULT_SETTINGS };
    }

    async loadData(): Promise<any> {
        return {};
    }

    async saveData(data: any): Promise<void> {
        // Mock save
    }

    loadSettings(): Promise<void> {
        return Promise.resolve();
    }

    saveSettings(): Promise<void> {
        return Promise.resolve();
    }
}

/**
 * Creates a mock plugin instance for testing
 */
export function createMockPlugin(app?: App): VaultFindReplacePlugin {
    const mockPlugin = new MockPlugin(app);
    return mockPlugin as unknown as VaultFindReplacePlugin;
}