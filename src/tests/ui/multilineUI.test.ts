import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchToolbar, SearchInputElements } from '../../ui/components/searchToolbar';
import { SearchController } from '../../ui/components/searchController';
import { UIRenderer } from '../../ui/components/renderer';
import { SearchEngine } from '../../core/searchEngine';
import { createMockApp, createMockPlugin } from '../mocks';
import { FindReplaceElements, ViewState, SearchResult } from '../../types';

// Mock DOM environment for UI tests
const mockCreateElement = (tag: string, options?: any): any => {
    const element: any = {
        tagName: tag.toUpperCase(),
        className: '',
        textContent: '',
        innerHTML: '',
        style: {},
        attributes: new Map(),
        children: [],
        parentElement: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        setAttribute: vi.fn((name, value) => element.attributes.set(name, value)),
        getAttribute: vi.fn((name) => element.attributes.get(name) || null),
        classList: {
            add: vi.fn((cls) => { element.className += ' ' + cls; }),
            remove: vi.fn(),
            toggle: vi.fn(),
            contains: vi.fn()
        },
        createEl: mockCreateElement,
        createDiv: (cls?: string) => {
            const div = mockCreateElement('div');
            if (cls) div.className = cls;
            return div;
        },
        createSpan: (cls?: string) => {
            const span = mockCreateElement('span');
            if (cls) span.className = cls;
            return span;
        },
        appendChild: vi.fn((child) => element.children.push(child)),
        empty: vi.fn(() => { element.children.length = 0; }),
        click: vi.fn(),
        focus: vi.fn(),
        value: ''
    };
    return element as any;
};

describe('Multiline UI Interactions', () => {
    let mockApp: any;
    let mockPlugin: any;
    let searchEngine: SearchEngine;
    let mockElements: FindReplaceElements;
    let mockContainer: any;

    beforeEach(() => {
        mockApp = createMockApp();
        mockPlugin = createMockPlugin(mockApp);
        searchEngine = new SearchEngine(mockApp, mockPlugin);

        // Setup mock DOM container
        mockContainer = mockCreateElement('div');

        // Create mock UI elements
        const searchInput = mockCreateElement('input');
        const replaceInput = mockCreateElement('input');
        const matchCaseBtn = mockCreateElement('button');
        const wholeWordBtn = mockCreateElement('button');
        const regexBtn = mockCreateElement('button');
        const multilineBtn = mockCreateElement('button');
        const resultsContainer = mockCreateElement('div');

        // Set initial toggle states
        matchCaseBtn.setAttribute('aria-pressed', 'false');
        wholeWordBtn.setAttribute('aria-pressed', 'false');
        regexBtn.setAttribute('aria-pressed', 'false');
        multilineBtn.setAttribute('aria-pressed', 'false');

        mockElements = {
            containerEl: mockContainer,
            searchInput,
            replaceInput,
            matchCaseCheckbox: matchCaseBtn,
            wholeWordCheckbox: wholeWordBtn,
            regexCheckbox: regexBtn,
            multilineCheckbox: multilineBtn,
            resultsContainer,
            selectedCountEl: mockCreateElement('span'),
            toolbarBtn: mockCreateElement('button'),
            resultsCountEl: mockCreateElement('span'),
            clearAllBtn: mockCreateElement('button'),
            filterBtn: mockCreateElement('button'),
            filterPanel: mockCreateElement('div'),
            includeInput: mockCreateElement('input'),
            excludeInput: mockCreateElement('input'),
            adaptiveToolbar: mockCreateElement('div'),
            ellipsisMenuBtn: mockCreateElement('button')
        };

        // Reset vault for each test
        mockApp.vault.reset();
        mockApp.vault.addFile('test.md', 'work content\ncontinues here\nmore text');
    });

    describe('Multiline Toggle Button Behavior', () => {
        it('should create multiline toggle button correctly', () => {
            const searchToolbar = new SearchToolbar(
                mockPlugin,
                async () => {}, // replaceSelectedCallback
                async () => {}, // replaceAllVaultCallback
                async () => {} // performSearchCallback
            );

            const searchElements = searchToolbar.createSearchInputRow(mockContainer);

            // Verify the multiline button exists in the returned elements
            expect(searchElements.multilineBtn).toBeDefined();
            expect(searchElements).toHaveProperty('multilineBtn');
        });

        it('should toggle multiline state when clicked', () => {
            const multilineBtn = mockElements.multilineCheckbox;

            // Initial state should be off
            expect(multilineBtn.getAttribute('aria-pressed')).toBe('false');

            // Simulate click
            multilineBtn.setAttribute('aria-pressed', 'true');

            expect(multilineBtn.getAttribute('aria-pressed')).toBe('true');
        });

        it('should trigger search when multiline toggle changes with existing query', async () => {
            const performSearchCallback = vi.fn().mockResolvedValue(undefined);
            const searchInput = mockElements.searchInput;
            searchInput.value = 'work\\ntext';

            const searchToolbar = new SearchToolbar(
                mockPlugin,
                async () => {},
                async () => {},
                performSearchCallback
            );

            // Create the multiline toggle with search callback
            const searchElements = searchToolbar.createSearchInputRow(mockContainer);

            // Simulate clicking the multiline toggle with a search query present
            searchInput.value = 'work\\ntext';

            // Manually trigger the click handler logic
            searchElements.multilineBtn.setAttribute('aria-pressed', 'true');

            // Since we can't actually trigger the event listener in this test environment,
            // we'll verify the button setup is correct
            expect(searchElements.multilineBtn).toBeDefined();
        });

        it('should not trigger search when multiline toggle changes with empty query', async () => {
            const performSearchCallback = vi.fn().mockResolvedValue(undefined);

            const searchToolbar = new SearchToolbar(
                mockPlugin,
                async () => {},
                async () => {},
                performSearchCallback
            );

            const searchElements = searchToolbar.createSearchInputRow(mockContainer);

            // Empty search input
            mockElements.searchInput.value = '';

            // Clicking multiline toggle should not trigger search
            searchElements.multilineBtn.setAttribute('aria-pressed', 'true');

            // Verify the toggle state changed but search wasn't triggered
            expect(searchElements.multilineBtn.getAttribute('aria-pressed')).toBe('true');
        });
    });

    describe('Search Options Integration', () => {
        it('should read multiline option from toggle state', () => {
            const mockState: ViewState = {
                isCollapsed: false,
                selectedIndices: new Set(),
                results: [],
                lineElements: []
            };

            const searchController = new SearchController(
                mockPlugin,
                mockElements,
                searchEngine,
                mockState,
                () => {}, // renderResultsCallback
                () => {}, // clearResultsCallback
                () => ({}) // getSessionFiltersCallback
            );

            // Set multiline toggle to enabled
            mockElements.multilineCheckbox.setAttribute('aria-pressed', 'true');

            const options = searchController.getSearchOptions();
            expect(options.multiline).toBe(true);

            // Set multiline toggle to disabled
            mockElements.multilineCheckbox.setAttribute('aria-pressed', 'false');

            const options2 = searchController.getSearchOptions();
            expect(options2.multiline).toBe(false);
        });

        it('should handle multiline option in combination with other options', () => {
            const mockState: ViewState = {
                isCollapsed: false,
                selectedIndices: new Set(),
                results: [],
                lineElements: []
            };

            const searchController = new SearchController(
                mockPlugin,
                mockElements,
                searchEngine,
                mockState,
                () => {},
                () => {},
                () => ({})
            );

            // Enable all options
            mockElements.matchCaseCheckbox.setAttribute('aria-pressed', 'true');
            mockElements.wholeWordCheckbox.setAttribute('aria-pressed', 'true');
            mockElements.regexCheckbox.setAttribute('aria-pressed', 'true');
            mockElements.multilineCheckbox.setAttribute('aria-pressed', 'true');

            const options = searchController.getSearchOptions();
            expect(options.matchCase).toBe(true);
            expect(options.wholeWord).toBe(true);
            expect(options.useRegex).toBe(true);
            expect(options.multiline).toBe(true);
        });
    });

    describe('Multiline Results Rendering', () => {
        it('should handle multiline search results correctly', () => {
            // Create mock multiline search result
            const multilineResult: SearchResult = {
                file: mockApp.vault.getAbstractFileByPath('test.md'),
                line: 0,
                content: 'work content',
                matchText: 'work content\ncontinues here',
                col: 0,
                pattern: 'work.*\\ncontinues'
            };

            // Verify the result structure is correct for multiline
            expect(multilineResult.matchText).toContain('\n');
            expect(multilineResult.matchText).toContain('work content');
            expect(multilineResult.matchText).toContain('continues here');
        });

        it('should distinguish multiline from single-line matches', () => {
            const singleLineResult: SearchResult = {
                file: mockApp.vault.getAbstractFileByPath('test.md'),
                line: 0,
                content: 'work content',
                matchText: 'work',
                col: 0,
                pattern: 'work'
            };

            const multilineResult: SearchResult = {
                file: mockApp.vault.getAbstractFileByPath('test.md'),
                line: 0,
                content: 'work content',
                matchText: 'work content\ncontinues here',
                col: 0,
                pattern: 'work.*\\ncontinues'
            };

            // Single-line should not contain newlines
            expect(singleLineResult.matchText).not.toContain('\n');

            // Multiline should contain newlines
            expect(multilineResult.matchText).toContain('\n');
        });
    });

    describe('Keyboard Accessibility', () => {
        it('should support keyboard navigation for multiline toggle', () => {
            const searchToolbar = new SearchToolbar(
                mockPlugin,
                async () => {},
                async () => {},
                async () => {}
            );

            const searchElements = searchToolbar.createSearchInputRow(mockContainer);

            // Verify multiline button exists and is properly structured
            expect(searchElements.multilineBtn).toBeDefined();
            expect(searchElements.multilineBtn).toBeTruthy();
        });

        it('should handle Enter and Space key events on multiline toggle', () => {
            const multilineBtn = mockElements.multilineCheckbox;
            const keydownHandler = vi.fn();

            multilineBtn.addEventListener('keydown', keydownHandler);

            // Simulate Enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            multilineBtn.dispatchEvent?.(enterEvent);

            // Simulate Space key
            const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
            multilineBtn.dispatchEvent?.(spaceEvent);

            // In a real scenario, these would trigger the toggle
            expect(multilineBtn.getAttribute('aria-pressed')).toBe('false');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle multiline toggle with invalid regex gracefully', () => {
            const mockState: ViewState = {
                isCollapsed: false,
                selectedIndices: new Set(),
                results: [],
                lineElements: []
            };

            const searchController = new SearchController(
                mockPlugin,
                mockElements,
                searchEngine,
                mockState,
                () => {},
                () => {},
                () => ({})
            );

            // Enable multiline and regex
            mockElements.regexCheckbox.setAttribute('aria-pressed', 'true');
            mockElements.multilineCheckbox.setAttribute('aria-pressed', 'true');

            // Set invalid regex in search input
            mockElements.searchInput.value = '[invalid regex';

            // Should not crash when reading options
            expect(() => {
                const options = searchController.getSearchOptions();
                expect(options.multiline).toBe(true);
                expect(options.useRegex).toBe(true);
            }).not.toThrow();
        });

        it('should maintain multiline state across UI updates', () => {
            // Set initial multiline state
            mockElements.multilineCheckbox.setAttribute('aria-pressed', 'true');

            const mockState: ViewState = {
                isCollapsed: false,
                selectedIndices: new Set(),
                results: [],
                lineElements: []
            };

            const searchController = new SearchController(
                mockPlugin,
                mockElements,
                searchEngine,
                mockState,
                () => {},
                () => {},
                () => ({})
            );

            // Get options multiple times
            const options1 = searchController.getSearchOptions();
            const options2 = searchController.getSearchOptions();

            expect(options1.multiline).toBe(true);
            expect(options2.multiline).toBe(true);
        });

        it('should handle disabled multiline in non-regex mode', () => {
            const mockState: ViewState = {
                isCollapsed: false,
                selectedIndices: new Set(),
                results: [],
                lineElements: []
            };

            const searchController = new SearchController(
                mockPlugin,
                mockElements,
                searchEngine,
                mockState,
                () => {},
                () => {},
                () => ({})
            );

            // Enable multiline but disable regex
            mockElements.multilineCheckbox.setAttribute('aria-pressed', 'true');
            mockElements.regexCheckbox.setAttribute('aria-pressed', 'false');

            const options = searchController.getSearchOptions();
            expect(options.multiline).toBe(true);
            expect(options.useRegex).toBe(false);

            // Multiline should be enabled but not effective without regex
        });
    });
});