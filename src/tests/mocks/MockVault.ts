import { TFile, TFolder, Vault } from 'obsidian';

/**
 * Mock Vault implementation for testing
 * Simulates Obsidian's file system with predictable test data
 */
export class MockVault {
    private files: Map<string, string> = new Map();
    private mockFiles: Map<string, TFile> = new Map();

    constructor() {
        // Initialize with edge case test data designed to catch bugs
        this.initializeTestData();
    }

    private initializeTestData(): void {
        // Test case for the second match replacement bug
        this.addFile('second-match-bug.md',
            '- [x] css rule search needs to be lowercase `pinto` does not match `Pinto`\n' +
            'Another line with pinto and Pinto for testing\n' +
            'Final line: pinto, pinto, PINTO - three matches'
        );

        // Multiple matches per line variations
        this.addFile('multiple-matches.md',
            'test test test TEST\n' +
            'overlapping: aaaa should find aa matches\n' +
            'case variations: Test TEST test TeSt\n' +
            'Special chars: test(test) test[test] test{test}'
        );

        // Unicode and special character testing
        this.addFile('unicode-test.md',
            'Unicode: café naïve résumé\n' +
            'Emoji: 🔍 search 🔄 replace 🎯 target\n' +
            'Accents: À la carte, piñata, señor\n' +
            'Mixed: test-тест-テスト-测试'
        );

        // Regex edge cases
        this.addFile('regex-edge-cases.md',
            'Parentheses: (test) [test] {test}\n' +
            'Anchors: ^start middle end$\n' +
            'Quantifiers: a+ a* a? a{2,4}\n' +
            'Lookaheads: test(?=ing) test(?!ing)\n' +
            'Word boundaries: \\bword\\b in words and sword'
        );

        // Large content for performance testing
        this.addFile('large-file.md', this.generateLargeContent());

        // Empty and whitespace scenarios
        this.addFile('empty.md', '');
        this.addFile('whitespace.md', '   \n\t\n   \n');

        // Complex replacement scenarios
        this.addFile('replacement-test.md',
            'Replace with groups: "hello world" and "goodbye world"\n' +
            'Date format: 2025-01-15 and 2025-12-31\n' +
            'Capture groups: [link](url) and [another](path)'
        );

        // Add diverse file types for file filtering tests - CRUCIAL for test success
        // These files are required by fileFiltering.test.ts
        this.addFile('Notes/project.md', 'Project content with FINDME_NOTES');
        this.addFile('Notes/meeting.txt', 'Meeting notes with FINDME_NOTES');
        this.addFile('Archive/old.md', 'Archived content with FINDME_ARCHIVE');
        this.addFile('Templates/template.md', 'Template content with FINDME_TEMPLATES');
        this.addFile('Scripts/script.js', 'JavaScript code with FINDME_SCRIPTS');
        this.addFile('Docs/readme.md', 'Documentation with FINDME_DOCS');
        this.addFile('temp_file.tmp', 'Temporary file with FINDME_TEMP');
        this.addFile('backup_notes.bak', 'Backup content with FINDME_BACKUP');
        this.addFile('config.json', 'Configuration with FINDME_CONFIG');
        this.addFile('styles.css', 'CSS content with FINDME_CSS');
    }

    private generateLargeContent(): string {
        const lines: string[] = [];
        for (let i = 0; i < 1000; i++) {
            lines.push(`Line ${i}: This is test content with search terms like test, example, and sample.`);
        }
        return lines.join('\n');
    }

    private addFile(path: string, content: string): void {
        this.files.set(path, content);

        // Create mock TFile
        const mockFile = createMockFile(path, content);
        if (mockFile instanceof TFile) {
            this.mockFiles.set(path, mockFile);
        }
    }

    // Vault API simulation
    async read(file: TFile): Promise<string> {
        const content = this.files.get(file.path);
        if (content === undefined) {
            throw new Error(`File not found: ${file.path}`);
        }
        return content;
    }

    async modify(file: TFile, data: string): Promise<void> {
        if (!this.files.has(file.path)) {
            throw new Error(`File not found: ${file.path}`);
        }
        this.files.set(file.path, data);
    }

    getMarkdownFiles(): TFile[] {
        return Array.from(this.mockFiles.values())
            .filter(file => file.path.endsWith('.md'));
    }

    getAllLoadedFiles(): TFile[] {
        return Array.from(this.mockFiles.values());
    }

    getAbstractFileByPath(path: string): TFile | null {
        return this.mockFiles.get(path) || null;
    }

    // Test utilities
    getContent(path: string): string | undefined {
        return this.files.get(path);
    }

    getAllFiles(): Map<string, string> {
        return new Map(this.files);
    }

    reset(): void {
        this.files.clear();
        this.mockFiles.clear();
        this.initializeTestData();
    }

    // Add custom test files during tests
    addTestFile(path: string, content: string): TFile {
        this.addFile(path, content);
        return this.mockFiles.get(path)!;
    }

    setContent(path: string, content: string): void {
        if (this.files.has(path)) {
            this.files.set(path, content);
        } else {
            this.addFile(path, content);
        }
    }
}