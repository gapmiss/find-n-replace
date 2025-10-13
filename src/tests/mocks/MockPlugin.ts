import { App } from 'obsidian';
import VaultFindReplacePlugin from '../../main';
import { VaultFindReplaceSettings, DEFAULT_SETTINGS } from '../../settings';
import { MockApp } from './MockApp';
import { HistoryManager } from '../../core/historyManager';

/**
 * Mock VaultFindReplacePlugin for testing
 */
export class MockPlugin {
    app: App;
    settings: VaultFindReplaceSettings;
    historyManager: HistoryManager;

    constructor(app?: App) {
        this.app = app || new MockApp() as unknown as App;
        // Deep copy settings to avoid shared array references across tests
        this.settings = {
            ...DEFAULT_SETTINGS,
            searchHistory: [],
            replaceHistory: [],
            fileGroupStates: {}
        };
        // Initialize history manager
        this.historyManager = new HistoryManager(this as unknown as VaultFindReplacePlugin);
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