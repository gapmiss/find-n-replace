import { App, Workspace, WorkspaceLeaf } from 'obsidian';
import { MockVault } from './MockVault';
import { MockWorkspace } from './MockWorkspace';

/**
 * Mock Obsidian App for testing
 * Provides complete Obsidian API simulation for plugin testing
 */
export class MockApp {
    vault: MockVault;
    workspace: MockWorkspace;

    constructor() {
        this.vault = new MockVault();
        this.workspace = new MockWorkspace();
    }

    // App API simulation
    loadData(): Promise<any> {
        return Promise.resolve({});
    }

    saveData(data: any): Promise<void> {
        return Promise.resolve();
    }

    // Reset for clean test state
    reset(): void {
        this.vault.reset();
        this.workspace.reset();
    }
}

/**
 * Creates a mock App instance for testing
 */
export function createMockApp(): App {
    const mockApp = new MockApp();

    // Return as App type for compatibility
    return mockApp as unknown as App;
}