/**
 * Mock implementation of Obsidian API for testing
 */

export class Plugin {
  app: any;
  manifest: any;

  constructor() {
    this.app = {};
    this.manifest = {};
  }

  onload() {}
  onunload() {}
}

export class ItemView {
  getViewType() { return 'mock-view'; }
  getDisplayText() { return 'Mock View'; }
  getIcon() { return 'search'; }
}

export class TFile {
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
}

export class Notice {
  constructor(message: string) {
    console.log(`Notice: ${message}`);
  }
}

export class Setting {
  setName() { return this; }
  setDesc() { return this; }
  addText() { return this; }
  addToggle() { return this; }
  addButton() { return this; }
}

export class PluginSettingTab {
  display() {}
}

export class App {
  constructor() {}
}

export class WorkspaceLeaf {
  constructor() {}
}

export class Modal {
  constructor() {}
  open() {}
  close() {}
}

export class MarkdownView {
  constructor() {}
}

export class TFolder {
  constructor() {}
}

export class TAbstractFile {
  constructor() {}
}

export class Editor {
  constructor() {}
}

export class Menu {
  constructor() {}
}

// Mock functions
export function setIcon() {}
export function debounce(fn: Function, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(null, args), delay);
  };
}

// Mock constants
export const VIEW_TYPE_EMPTY = 'empty';
export const WORKSPACE_LEAF_TYPE = 'leaf';

// Global mock function for creating test files
global.createMockFile = function(path: string, content: string = '') {
  return new TFile(path);
};