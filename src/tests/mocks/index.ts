/**
 * Mock infrastructure exports
 * Provides comprehensive Obsidian API simulation for testing
 */

export { MockVault } from './MockVault';
export { MockWorkspace } from './MockWorkspace';
export { MockApp, createMockApp } from './MockApp';
export { MockPlugin, createMockPlugin } from './MockPlugin';

// Global mock utilities (used in setup.ts)
declare global {
    function createMockFile(path: string, content: string): any;
}