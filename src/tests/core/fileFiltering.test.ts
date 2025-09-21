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

    // Initialize plugin settings with default filtering options
    mockPlugin.settings = {
      fileExtensions: [],
      searchInFolders: [],
      includePatterns: '',
      excludeFolders: [],
      excludePatterns: '',
      logLevel: 1, // ERROR level
      ...mockPlugin.settings
    };

    searchEngine = new SearchEngine(mockApp, mockPlugin);

    searchOptions = {
      matchCase: false,
      wholeWord: false,
      useRegex: false
    };

    // Add comprehensive test files with unique search terms
    mockApp.vault.addTestFile('Notes/project.md', 'Project content with FINDME_NOTES');
    mockApp.vault.addTestFile('Notes/meeting.txt', 'Meeting notes with FINDME_NOTES');
    mockApp.vault.addTestFile('Archive/old.md', 'Archived content with FINDME_ARCHIVE');
    mockApp.vault.addTestFile('Templates/template.md', 'Template content with FINDME_TEMPLATES');
    mockApp.vault.addTestFile('Scripts/script.js', 'JavaScript code with FINDME_SCRIPTS');
    mockApp.vault.addTestFile('Docs/readme.md', 'Documentation with FINDME_DOCS');
    mockApp.vault.addTestFile('temp_file.tmp', 'Temporary file with FINDME_TEMP');
    mockApp.vault.addTestFile('backup_notes.bak', 'Backup content with FINDME_BACKUP');
    mockApp.vault.addTestFile('config.json', 'Configuration with FINDME_CONFIG');
    mockApp.vault.addTestFile('styles.css', 'CSS content with FINDME_CSS');
  });

  describe('Extension Filtering', () => {
    it('should include only specified extensions when searching', async () => {
      // Set file extension filter to only .md and .txt files
      mockPlugin.settings.fileExtensions = ['.md', '.txt'];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

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
      // Set filter to .js and .json files only
      mockPlugin.settings.fileExtensions = ['.js', '.json'];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Scripts/script.js');
      expect(filePaths).toContain('config.json');

      // Should not find results in markdown files
      expect(filePaths).not.toContain('Notes/project.md');
      expect(filePaths).not.toContain('Archive/old.md');
    });

    it('should include all files when no extension filter is set', async () => {
      // No file extension filter
      mockPlugin.settings.fileExtensions = [];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

      // Should find results in all file types
      expect(results.length).toBeGreaterThan(5);
      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Scripts/script.js');
      expect(filePaths).toContain('config.json');
    });
  });

  describe('Folder Filtering', () => {
    it('should include only specified folders when searching', async () => {
      // Set folder filter to only Notes and Docs
      mockPlugin.settings.searchInFolders = ['Notes/', 'Docs/'];
      // Clear file extension filter to search all file types
      mockPlugin.settings.fileExtensions = [];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

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
      // Exclude Archive and Templates folders
      mockPlugin.settings.excludeFolders = ['Archive/', 'Templates/'];
      // Clear file extension filter to search all file types
      mockPlugin.settings.fileExtensions = [];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Docs/readme.md');
      expect(filePaths).toContain('Scripts/script.js');

      // Should not find results in excluded folders
      expect(filePaths).not.toContain('Archive/old.md');
      expect(filePaths).not.toContain('Templates/template.md');
    });

    it('should handle folder patterns without trailing slashes', async () => {
      // Test folder names without trailing slashes
      mockPlugin.settings.searchInFolders = ['Notes', 'Docs'];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Docs/readme.md');
    });
  });

  describe('Pattern-Based Filtering', () => {
    it('should exclude files matching exclude patterns', async () => {
      // Exclude temporary and backup files
      mockPlugin.settings.excludePatterns = ['*.tmp', '*.bak'];
      // Clear file extension filter to search all file types
      mockPlugin.settings.fileExtensions = [];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');
      expect(filePaths).toContain('Scripts/script.js');

      // Should not find results in excluded pattern files
      expect(filePaths).not.toContain('temp_file.tmp');
      expect(filePaths).not.toContain('backup_notes.bak');
    });

    it('should handle wildcard patterns correctly', async () => {
      // Exclude files with 'backup' in the name
      mockPlugin.settings.excludePatterns = ['*backup*', 'temp*'];
      // Clear file extension filter to search all file types
      mockPlugin.settings.fileExtensions = [];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

      const filePaths = results.map((r) => r.file.path);
      expect(filePaths).toContain('Notes/project.md');

      // Should exclude wildcard matches
      expect(filePaths).not.toContain('backup_notes.bak');
      expect(filePaths).not.toContain('temp_file.tmp');
    });

    it('should handle include patterns when specified', async () => {
      // Include only markdown files using pattern
      mockPlugin.settings.includePatterns = ['*.md'];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

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
      // Combine extension filter with folder exclusion
      mockPlugin.settings.fileExtensions = ['.md', '.txt'];
      mockPlugin.settings.excludeFolders = ['Archive/', 'Templates/'];
      mockPlugin.settings.excludePatterns = ['*backup*'];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

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
      // Complex scenario: include markdown, exclude templates, only in specific folders
      mockPlugin.settings.fileExtensions = ['.md'];
      mockPlugin.settings.searchInFolders = ['Notes/', 'Archive/', 'Docs/'];
      mockPlugin.settings.excludeFolders = ['Templates/'];
      mockPlugin.settings.excludePatterns = ['*old*'];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

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
      // All filters empty/default
      mockPlugin.settings.fileExtensions = [];
      mockPlugin.settings.searchInFolders = [];
      mockPlugin.settings.excludeFolders = [];
      mockPlugin.settings.includePatterns = [];
      mockPlugin.settings.excludePatterns = [];

      const results = await searchEngine.performSearch('FINDME', searchOptions);

      // Should search all files when no filters applied
      expect(results.length).toBeGreaterThan(5);
    });

    it('should handle invalid pattern syntax gracefully', async () => {
      // Invalid glob patterns should not crash the search
      mockPlugin.settings.excludePatterns = ['[invalid regex'];

      expect(async () => {
        await searchEngine.performSearch('FINDME', searchOptions);
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