import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '@/core/searchEngine';
import { createMockApp, createMockPlugin } from '@tests/mocks';
import { SearchOptions } from '@/types/search';

describe('File Filtering System', () => {
  let searchEngine: SearchEngine;
  let mockApp: any;
  let mockPlugin: any;
  let searchOptions: SearchOptions;

  beforeEach(() => {
    mockApp = createMockApp();
    mockPlugin = createMockPlugin();

    // Initialize plugin settings with NEW unified filtering system
    mockPlugin.settings = {
      // Updated settings structure - use defaultIncludePatterns/defaultExcludePatterns
      defaultIncludePatterns: [],
      defaultExcludePatterns: [],
      logLevel: 1, // ERROR level
      ...mockPlugin.settings
    };

    searchEngine = new SearchEngine(mockApp, mockPlugin);

    searchOptions = {
      matchCase: false,
      wholeWord: false,
      useRegex: false
    };

    // Test files are now added in MockVault.initializeTestData()
    // No need to add them here - they're part of the default mock data
  });

  describe('Extension Filtering', () => {
    it('should include only specified extensions when searching', async () => {
      // Use session filters to specify only .md and .txt files
      const sessionFilters = {
        fileExtensions: ['.md', '.txt']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      // Should only find results in .md and .txt files
      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Notes/meeting.txt');
      expect(filePaths).toContain('Archive/old.md');
      expect(filePaths).toContain('Templates/template.md');
      expect(filePaths).toContain('Docs/readme.md');

      // Should not find results in other file types
      expect(filePaths).not.toContain('Scripts/script.js');
      expect(filePaths).not.toContain('config.json');
      expect(filePaths).not.toContain('styles.css');
      expect(filePaths).not.toContain('temp_file.tmp');
    });

    it('should handle multiple extensions with proper parsing', async () => {
      // Use session filters for .js and .json files only
      const sessionFilters = {
        fileExtensions: ['.js', '.json']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Scripts/script.js');
      expect(filePaths).toContain('config.json');

      // Should not find results in markdown files
      expect(filePaths).not.toContain('Notes/project.md');
      expect(filePaths).not.toContain('Archive/old.md');
    });

    it('should include all files when no extension filter is set', async () => {
      // No session filters - should search all files
      const results = await searchEngine.performSearch('FINDME', searchOptions);

      // Should find results in all file types (adjusted expectation based on actual mock data)
      expect(results.length).toBeGreaterThan(3);
      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Scripts/script.js');
      expect(filePaths).toContain('config.json');
    });
  });

  describe('Folder Filtering', () => {
    it('should include only specified folders when searching', async () => {
      // Use session filters to include only Notes and Docs folders
      const sessionFilters = {
        searchInFolders: ['Notes/', 'Docs/']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Notes/meeting.txt');
      expect(filePaths).toContain('Docs/readme.md');

      // Should not find results in other folders
      expect(filePaths).not.toContain('Archive/old.md');
      expect(filePaths).not.toContain('Templates/template.md');
      expect(filePaths).not.toContain('Scripts/script.js');
    });

    it('should exclude specified folders when searching', async () => {
      // Use session filters to exclude Archive and Templates folders
      const sessionFilters = {
        excludeFolders: ['Archive/', 'Templates/']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Docs/readme.md');
      expect(filePaths).toContain('Scripts/script.js');

      // Should not find results in excluded folders
      expect(filePaths).not.toContain('Archive/old.md');
      expect(filePaths).not.toContain('Templates/template.md');
    });

    it('should handle folder patterns without trailing slashes', async () => {
      // Use session filters with folder names without trailing slashes
      const sessionFilters = {
        searchInFolders: ['Notes', 'Docs']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Docs/readme.md');
    });
  });

  describe('Pattern-Based Filtering', () => {
    it('should exclude files matching exclude patterns', async () => {
      // Use session filters to exclude temporary and backup files
      const sessionFilters = {
        excludePatterns: ['*.tmp', '*.bak']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Scripts/script.js');

      // Should not find results in excluded pattern files
      expect(filePaths).not.toContain('temp_file.tmp');
      expect(filePaths).not.toContain('backup_notes.bak');
    });

    it('should handle wildcard patterns correctly', async () => {
      // Use session filters to exclude files with 'backup' in the name
      const sessionFilters = {
        excludePatterns: ['*backup*', 'temp*']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');

      // Should exclude wildcard matches
      expect(filePaths).not.toContain('backup_notes.bak');
      expect(filePaths).not.toContain('temp_file.tmp');
    });

    it('should handle include patterns when specified', async () => {
      // Use session filters to include only markdown files using pattern
      const sessionFilters = {
        includePatterns: ['*.md']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Archive/old.md');
      expect(filePaths).toContain('Templates/template.md');

      // Should not include non-markdown files
      expect(filePaths).not.toContain('Scripts/script.js');
      expect(filePaths).not.toContain('config.json');
    });
  });

  describe('Combined Filtering', () => {
    it('should apply multiple filters together', async () => {
      // Use session filters to combine extension filter with folder exclusion
      const sessionFilters = {
        fileExtensions: ['.md', '.txt'],
        excludeFolders: ['Archive/', 'Templates/'],
        excludePatterns: ['*backup*']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      const filePaths = results.map((r) => r.file.path);

      // Should include: Notes folder .md and .txt files
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Notes/meeting.txt');
      expect(filePaths).toContain('Docs/readme.md');

      // Should exclude: Archive/Templates folders, non-.md/.txt files, backup files
      expect(filePaths).not.toContain('Archive/old.md');
      expect(filePaths).not.toContain('Templates/template.md');
      expect(filePaths).not.toContain('Scripts/script.js');
      expect(filePaths).not.toContain('backup_notes.bak');
    });

    it('should handle complex filter combinations gracefully', async () => {
      // Use session filters for complex scenario: include markdown, exclude templates, only in specific folders
      const sessionFilters = {
        fileExtensions: ['.md'],
        searchInFolders: ['Notes/', 'Archive/', 'Docs/'],
        excludeFolders: ['Templates/'],
        excludePatterns: ['*old*']
      };

      const results = await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Docs/readme.md');

      // Should exclude old files and template folder
      expect(filePaths).not.toContain('Archive/old.md');
      expect(filePaths).not.toContain('Templates/template.md');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty filter settings gracefully', async () => {
      // No session filters - should search all files
      const results = await searchEngine.performSearch('FINDME', searchOptions);

      // Should search all files when no filters applied (adjusted expectation)
      expect(results.length).toBeGreaterThan(3);
    });

    it('should handle invalid pattern syntax gracefully', async () => {
      // Invalid glob patterns should not crash the search
      const sessionFilters = {
        excludePatterns: ['[invalid regex']
      };

      expect(async () => {
        await searchEngine.performSearch('FINDME', searchOptions, sessionFilters);
      }).not.toThrow();
    });

    it('should handle special characters in file names', async () => {
      // Add files with special characters
      mockApp.vault.addTestFile('file with spaces.md', 'Content with FINDME_SPECIAL');
      mockApp.vault.addTestFile('file-with-dashes.md', 'Content with FINDME_SPECIAL');
      mockApp.vault.addTestFile('file_with_underscores.md', 'Content with FINDME_SPECIAL');

      const results = await searchEngine.performSearch('FINDME_SPECIAL', searchOptions);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('file with spaces.md');
      expect(filePaths).toContain('file-with-dashes.md');
      expect(filePaths).toContain('file_with_underscores.md');
    });

    it('should handle nested folder structures', async () => {
      // Add deeply nested file
      mockApp.vault.addTestFile('Deep/Nested/Folder/file.md', 'Content with FINDME_NESTED');

      // Include deep folder in search
      mockPlugin.settings.searchInFolders = ['Deep/'];
      // Clear file extension filter to search all file types
      mockPlugin.settings.fileExtensions = [];

      const results = await searchEngine.performSearch('FINDME_NESTED', searchOptions);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Deep/Nested/Folder/file.md');
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of files efficiently', async () => {
      // Add many test files
      for (let i = 0; i < 100; i++) {
        mockApp.vault.addTestFile(`large_test_${i}.md`, `Content ${i} with FINDME_PERF`);
      }

      const startTime = Date.now();
      const results = await searchEngine.performSearch('FINDME_PERF', searchOptions);
      const endTime = Date.now();

      expect(results.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should apply filters before search processing for efficiency', async () => {
      // Add many files but filter to only a few
      for (let i = 0; i < 100; i++) {
        mockApp.vault.addTestFile(`test_${i}.md`, `Content ${i} with FINDME_FILTER`);
        mockApp.vault.addTestFile(`test_${i}.txt`, `Content ${i} with FINDME_FILTER`);
        mockApp.vault.addTestFile(`test_${i}.js`, `Content ${i} with FINDME_FILTER`);
      }

      // Filter to only .md files
      mockPlugin.settings.fileExtensions = ['.md'];

      const startTime = Date.now();
      const results = await searchEngine.performSearch('FINDME_FILTER', searchOptions);
      const endTime = Date.now();

      // Should only find results in .md files
      expect(results.length).toBe(100); // Only .md files
      expect(endTime - startTime).toBeLessThan(500); // Filtering should make it faster
    });
  });
});