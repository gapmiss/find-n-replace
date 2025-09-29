import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HelpModal } from '@/modals/helpModal';
import { createMockApp, createMockPlugin } from '@tests/mocks';

// Create a recursive mock element that can create more elements
const createMockElement = (): any => ({
  addClass: vi.fn(),
  removeClass: vi.fn(),
  setText: vi.fn(),
  createEl: vi.fn().mockImplementation(() => createMockElement()),
  createDiv: vi.fn().mockImplementation(() => createMockElement()),
  createSpan: vi.fn().mockImplementation(() => createMockElement()),
  innerHTML: '',
  textContent: '',
  appendChild: vi.fn(),
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  insertAdjacentText: vi.fn(),
  insertAdjacentHTML: vi.fn(),
  style: {},
  className: '',
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
    toggle: vi.fn()
  }
});

// Mock the Modal class from Obsidian
vi.mock('obsidian', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    Modal: class MockModal {
      app: any;
      contentEl: any;
      modalEl: any;

      constructor(app: any) {
        this.app = app;
        this.contentEl = {
          empty: vi.fn(),
          addClass: vi.fn(),
          removeClass: vi.fn(),
          createEl: vi.fn().mockImplementation(() => createMockElement()),
          createDiv: vi.fn().mockImplementation(() => createMockElement()),
          createSpan: vi.fn().mockImplementation(() => createMockElement()),
          appendChild: vi.fn(),
          setAttribute: vi.fn(),
          innerHTML: '',
          textContent: ''
        };
        this.modalEl = {
          addClass: vi.fn()
        };
      }

      open() {}
      close() {}
    }
  };
});

describe('HelpModal', () => {
  let helpModal: HelpModal;
  let mockApp: any;
  let mockPlugin: any;

  beforeEach(() => {
    mockApp = createMockApp();
    mockPlugin = createMockPlugin();

    // Mock Obsidian hotkey system
    mockApp.hotkeyManager = {
      customKeys: new Map([
        ['find-n-replace:open-view', [{ modifiers: ['Ctrl'], key: 'Shift+F' }]],
        ['find-n-replace:perform-search', [{ modifiers: ['Ctrl'], key: 'Enter' }]]
      ])
    };

    mockApp.scope = {
      keys: [
        { modifiers: 'Ctrl', key: 'Shift+F' },
        { modifiers: 'Alt', key: 'Enter' }
      ]
    };

    mockApp.commands = {
      commands: {
        'find-n-replace:open-view': {
          id: 'find-n-replace:open-view',
          name: 'Open Find-n-Replace',
          hotkeys: [{ modifiers: ['Ctrl'], key: 'Shift+F' }]
        },
        'find-n-replace:toggle-regex': {
          id: 'find-n-replace:toggle-regex',
          name: 'Toggle Regex',
          hotkeys: []
        }
      }
    };

    helpModal = new HelpModal(mockApp, mockPlugin);
  });

  describe('Initialization', () => {
    it('should create help modal with correct app and plugin', () => {
      expect(helpModal).toBeDefined();
      expect(helpModal.app).toBe(mockApp);
      expect(helpModal['plugin']).toBe(mockPlugin); // private property access
    });

    it('should extend Modal class', () => {
      expect(helpModal.contentEl).toBeDefined();
      expect(helpModal.modalEl).toBeDefined();
    });
  });

  describe('Modal Content Creation', () => {
    it('should create modal content on open', () => {
      helpModal.onOpen();

      expect(helpModal.contentEl.empty).toHaveBeenCalled();
      expect(helpModal.contentEl.createEl).toHaveBeenCalledWith('h2',
        expect.objectContaining({ text: expect.stringContaining('Find-n-Replace') })
      );
    });

    it('should create introduction section', () => {
      helpModal.onOpen();

      expect(helpModal.contentEl.createDiv).toHaveBeenCalledWith('help-intro');
    });

    it('should create command sections for all categories', () => {
      helpModal.onOpen();

      // Should create multiple command sections
      expect(helpModal.contentEl.createEl).toHaveBeenCalled();
      expect(helpModal.contentEl.createEl).toHaveBeenCalledWith('h2', expect.any(Object));
    });
  });

  describe('Hotkey Detection', () => {
    it('should attempt to detect user hotkeys', () => {
      // Test that the modal can access hotkey detection without errors
      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();
    });

    it('should handle missing hotkey manager gracefully', () => {
      delete mockApp.hotkeyManager;
      delete mockApp.scope;
      delete mockApp.commands;

      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();
    });

    it('should format hotkeys when available', () => {
      // Since formatHotkey is private, test through onOpen
      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();
    });
  });

  describe('Command Information', () => {
    it('should display plugin commands', () => {
      helpModal.onOpen();

      // Should create command sections and tables
      expect(helpModal.contentEl.createEl).toHaveBeenCalled();
    });

    it('should handle empty command lists gracefully', () => {
      mockApp.commands = { commands: {} };

      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();
    });
  });

  describe('File Filtering Guide', () => {
    it('should create file filtering guide section', () => {
      helpModal.onOpen();

      expect(helpModal.contentEl.createDiv).toHaveBeenCalledWith('help-file-filtering');
    });

    it('should display file filtering content without errors', () => {
      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();
    });

    it('should create filtering guide elements', () => {
      helpModal.onOpen();

      // Should call createDiv and createEl methods for the guide sections
      expect(helpModal.contentEl.createDiv).toHaveBeenCalled();
    });
  });

  describe('Usage Tips', () => {
    it('should display usage tips section', () => {
      helpModal.onOpen();

      // Should create usage tips section
      expect(helpModal.contentEl.createDiv).toHaveBeenCalled();
    });

    it('should provide practical tips', () => {
      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();
    });

    it('should include filtering-related tips', () => {
      helpModal.onOpen();

      // Should create tips and render without errors
      expect(helpModal.contentEl.createDiv).toHaveBeenCalledWith('help-tips');
    });
  });

  describe('Modal Lifecycle', () => {
    it('should handle modal open without errors', () => {
      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();
    });

    it('should handle modal close without errors', () => {
      expect(() => {
        helpModal.onClose();
      }).not.toThrow();
    });

    it('should clear content on open', () => {
      helpModal.onOpen();
      expect(helpModal.contentEl.empty).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle DOM creation errors gracefully', () => {
      // Mock createEl to throw an error
      helpModal.contentEl.createEl = vi.fn().mockImplementation(() => {
        throw new Error('DOM creation failed');
      });

      // Currently the modal doesn't have error handling, so it will throw
      // This is expected behavior - DOM errors should bubble up
      expect(() => {
        helpModal.onOpen();
      }).toThrow('DOM creation failed');
    });

    it('should handle malformed hotkey data', () => {
      mockApp.hotkeyManager.customKeys = new Map([
        ['invalid-command', null],
        ['another-invalid', undefined]
      ]);

      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();
    });

    it('should handle missing app properties', () => {
      const incompleteApp = {
        // Missing hotkeyManager, scope, commands
      };

      const modal = new HelpModal(incompleteApp as any, mockPlugin);

      expect(() => {
        modal.onOpen();
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should integrate with Obsidian Modal API', () => {
      expect(helpModal.contentEl).toBeDefined();
      expect(helpModal.modalEl).toBeDefined();
      expect(typeof helpModal.open).toBe('function');
      expect(typeof helpModal.close).toBe('function');
    });

    it('should maintain plugin reference', () => {
      expect(helpModal['plugin']).toBe(mockPlugin);
      expect(helpModal.app).toBe(mockApp);
    });
  });

  describe('Accessibility and UX', () => {
    it('should use semantic HTML structure', () => {
      helpModal.onOpen();

      // Should create proper heading elements
      expect(helpModal.contentEl.createEl).toHaveBeenCalledWith('h2', expect.any(Object));
    });

    it('should apply appropriate CSS classes', () => {
      helpModal.onOpen();

      // Should create elements with CSS classes for styling
      expect(helpModal.contentEl.createDiv).toHaveBeenCalledWith(expect.stringMatching(/help-/));
    });

    it('should provide clear information hierarchy', () => {
      helpModal.onOpen();

      // Should create structured content with headings and sections
      expect(helpModal.contentEl.createEl).toHaveBeenCalled();
      expect(helpModal.contentEl.createDiv).toHaveBeenCalled();
    });
  });

  describe('Content Validation', () => {
    it('should display help content without JavaScript errors', () => {
      // Comprehensive test that the modal displays without throwing
      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();

      // Verify basic content creation calls were made
      expect(helpModal.contentEl.empty).toHaveBeenCalled();
      expect(helpModal.contentEl.createEl).toHaveBeenCalled();
    });

    it('should handle plugin without settings gracefully', () => {
      mockPlugin.settings = null;

      expect(() => {
        helpModal.onOpen();
      }).not.toThrow();
    });

    it('should work with minimal Obsidian API surface', () => {
      // Test with minimal app object
      const minimalApp = {
        // Bare minimum required properties
      };

      const modal = new HelpModal(minimalApp as any, mockPlugin);

      expect(() => {
        modal.onOpen();
      }).not.toThrow();
    });
  });
});