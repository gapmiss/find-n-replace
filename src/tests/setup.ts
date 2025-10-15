/**
 * Vitest global setup for Obsidian plugin testing
 * Configures global mocks and test environment
 */

import { vi } from 'vitest';

// Mock the entire Obsidian API module
vi.mock('obsidian', () => ({
  Plugin: class MockPlugin {
    app: any;
    manifest: any;
    constructor() {
      this.app = {};
      this.manifest = {};
    }
    onload() {}
    onunload() {}
  },
  ItemView: class MockItemView {
    getViewType() { return 'mock-view'; }
    getDisplayText() { return 'Mock View'; }
    getIcon() { return 'search'; }
  },
  TFile: class MockTFile {
    path: string;
    name: string;
    basename: string;
    extension: string;
    constructor(path: string) {
      this.path = path;
      this.name = path.split('/').pop() || '';
      this.basename = this.name.replace(/\.[^/.]+$/, '');
      this.extension = this.name.includes('.') ? this.name.split('.').pop() || '' : '';
    }
  },
  Notice: class MockNotice {
    constructor(message: string) {
      console.log(`Notice: ${message}`);
    }
  },
  PluginSettingTab: class MockPluginSettingTab {
    display() {}
  },
  App: class MockApp {
    constructor() {}
  },
  WorkspaceLeaf: class MockWorkspaceLeaf {
    constructor() {}
  },
  Modal: class MockModal {
    constructor() {}
    open() {}
    close() {}
  },
  MarkdownView: class MockMarkdownView {
    constructor() {}
  },
  TFolder: class MockTFolder {
    constructor() {}
  },
  TAbstractFile: class MockTAbstractFile {
    constructor() {}
  },
  Editor: class MockEditor {
    constructor() {}
  },
  Menu: class MockMenu {
    constructor() {}
  },
  Setting: class MockSetting {
    setName() { return this; }
    setDesc() { return this; }
    addText() { return this; }
    addToggle() { return this; }
    addButton() { return this; }
  },
  // Mock functions
  setIcon: vi.fn(),
  debounce: (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
  },
  // Mock constants
  VIEW_TYPE_EMPTY: 'empty',
  WORKSPACE_LEAF_TYPE: 'leaf'
}));

// Mock Obsidian's global Notice constructor
interface GlobalWithNotice extends typeof globalThis {
  Notice: any;
}
(global as GlobalWithNotice).Notice = vi.fn().mockImplementation((message: string) => ({
  noticeEl: { innerHTML: message },
  hide: vi.fn()
}));

// Mock window.crypto for consistent testing
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 15)
  }
});

// Mock performance.now for consistent timing tests
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now())
  }
});

// Global test utilities
global.createMockFile = (path: string, content: string) => ({
  path,
  name: path.split('/').pop() || path,
  basename: path.split('/').pop()?.replace(/\.[^.]*$/, '') || path,
  extension: path.split('.').pop() || '',
  stat: { mtime: Date.now(), ctime: Date.now(), size: content.length },
  vault: null!
});

// Console override for clean test output
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  // Suppress debug/info in tests unless explicitly needed
  debug: vi.fn(),
  info: vi.fn(),
  // Keep warn/error for test diagnostics
  warn: originalConsole.warn,
  error: originalConsole.error,
  log: originalConsole.log
};