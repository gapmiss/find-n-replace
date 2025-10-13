import { WorkspaceLeaf, Workspace } from 'obsidian';

/**
 * Mock Workspace for testing view management
 */
export class MockWorkspace {
    private leaves: Map<string, WorkspaceLeaf[]> = new Map();

    constructor() {
        // Initialize empty workspace
    }

    getLeavesOfType(viewType: string): WorkspaceLeaf[] {
        return this.leaves.get(viewType) || [];
    }

    getRightLeaf(split: boolean): WorkspaceLeaf | null {
        // Create a mock leaf for testing
        const mockLeaf = this.createMockLeaf();
        return mockLeaf;
    }

    revealLeaf(leaf: WorkspaceLeaf): void {
        // Simulate revealing a leaf
    }

    private createMockLeaf(): WorkspaceLeaf {
        return {
            view: null!,
            setViewState: async (state: any) => {
                // Mock view state setting
                return Promise.resolve();
            },
            getViewState: () => ({ type: 'empty' }),
            open: async (file: any) => Promise.resolve(),
            rebuildView: () => {},
        } as unknown as WorkspaceLeaf;
    }

    // Test utilities
    addLeaf(viewType: string, leaf: WorkspaceLeaf): void {
        if (!this.leaves.has(viewType)) {
            this.leaves.set(viewType, []);
        }
        this.leaves.get(viewType)!.push(leaf);
    }

    reset(): void {
        this.leaves.clear();
    }
}