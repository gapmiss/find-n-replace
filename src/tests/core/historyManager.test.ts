import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from '../../core/historyManager';
import { createMockPlugin } from '../mocks/MockPlugin';

describe('HistoryManager', () => {
    let historyManager: HistoryManager;
    let mockPlugin: ReturnType<typeof createMockPlugin>;

    beforeEach(() => {
        mockPlugin = createMockPlugin();
        historyManager = new HistoryManager(mockPlugin as any);
    });

    describe('Search History', () => {
        it('should add search patterns to history', () => {
            historyManager.addSearch('test query');

            const history = historyManager.getSearchHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toBe('test query');
        });

        it('should trim whitespace from search patterns', () => {
            historyManager.addSearch('  test query  ');

            const history = historyManager.getSearchHistory();
            expect(history[0]).toBe('test query');
        });

        it('should skip empty search patterns', () => {
            historyManager.addSearch('');
            historyManager.addSearch('   ');

            const history = historyManager.getSearchHistory();
            expect(history).toHaveLength(0);
        });

        it('should not add duplicate consecutive entries', () => {
            historyManager.addSearch('test');
            historyManager.addSearch('test');

            const history = historyManager.getSearchHistory();
            expect(history).toHaveLength(1);
        });

        it('should implement LRU - move existing entry to front', () => {
            historyManager.addSearch('first');
            historyManager.addSearch('second');
            historyManager.addSearch('third');
            historyManager.addSearch('first'); // Move to front

            const history = historyManager.getSearchHistory();
            expect(history).toEqual(['first', 'third', 'second']);
        });

        it('should enforce max history size', () => {
            mockPlugin.settings.maxHistorySize = 3;

            historyManager.addSearch('first');
            historyManager.addSearch('second');
            historyManager.addSearch('third');
            historyManager.addSearch('fourth'); // Should remove 'first'

            const history = historyManager.getSearchHistory();
            expect(history).toHaveLength(3);
            expect(history).toEqual(['fourth', 'third', 'second']);
        });

        it('should clear search history', () => {
            historyManager.addSearch('test1');
            historyManager.addSearch('test2');

            historyManager.clearSearchHistory();

            const history = historyManager.getSearchHistory();
            expect(history).toHaveLength(0);
        });

        it('should remove specific entry from search history', () => {
            historyManager.addSearch('test1');
            historyManager.addSearch('test2');
            historyManager.addSearch('test3');

            historyManager.removeSearchEntry('test2');

            const history = historyManager.getSearchHistory();
            expect(history).toEqual(['test3', 'test1']);
        });
    });

    describe('Replace History', () => {
        it('should add replace patterns to history', () => {
            historyManager.addReplace('replacement text');

            const history = historyManager.getReplaceHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toBe('replacement text');
        });

        it('should allow empty replace patterns', () => {
            historyManager.addReplace('');

            const history = historyManager.getReplaceHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toBe('');
        });

        it('should skip null/undefined replace patterns', () => {
            historyManager.addReplace(null as any);
            historyManager.addReplace(undefined as any);

            const history = historyManager.getReplaceHistory();
            expect(history).toHaveLength(0);
        });

        it('should not add duplicate consecutive entries', () => {
            historyManager.addReplace('test');
            historyManager.addReplace('test');

            const history = historyManager.getReplaceHistory();
            expect(history).toHaveLength(1);
        });

        it('should implement LRU - move existing entry to front', () => {
            historyManager.addReplace('first');
            historyManager.addReplace('second');
            historyManager.addReplace('third');
            historyManager.addReplace('first'); // Move to front

            const history = historyManager.getReplaceHistory();
            expect(history).toEqual(['first', 'third', 'second']);
        });

        it('should enforce max history size', () => {
            mockPlugin.settings.maxHistorySize = 3;

            historyManager.addReplace('first');
            historyManager.addReplace('second');
            historyManager.addReplace('third');
            historyManager.addReplace('fourth'); // Should remove 'first'

            const history = historyManager.getReplaceHistory();
            expect(history).toHaveLength(3);
            expect(history).toEqual(['fourth', 'third', 'second']);
        });

        it('should clear replace history', () => {
            historyManager.addReplace('test1');
            historyManager.addReplace('test2');

            historyManager.clearReplaceHistory();

            const history = historyManager.getReplaceHistory();
            expect(history).toHaveLength(0);
        });

        it('should remove specific entry from replace history', () => {
            historyManager.addReplace('test1');
            historyManager.addReplace('test2');
            historyManager.addReplace('test3');

            historyManager.removeReplaceEntry('test2');

            const history = historyManager.getReplaceHistory();
            expect(history).toEqual(['test3', 'test1']);
        });
    });

    describe('Combined Operations', () => {
        it('should manage search and replace histories independently', () => {
            historyManager.addSearch('search1');
            historyManager.addReplace('replace1');
            historyManager.addSearch('search2');
            historyManager.addReplace('replace2');

            const searchHistory = historyManager.getSearchHistory();
            const replaceHistory = historyManager.getReplaceHistory();

            expect(searchHistory).toEqual(['search2', 'search1']);
            expect(replaceHistory).toEqual(['replace2', 'replace1']);
        });

        it('should clear all history', () => {
            historyManager.addSearch('search1');
            historyManager.addReplace('replace1');

            historyManager.clearAllHistory();

            expect(historyManager.getSearchHistory()).toHaveLength(0);
            expect(historyManager.getReplaceHistory()).toHaveLength(0);
        });
    });

    describe('Max Size Management', () => {
        it('should get current max size from settings', () => {
            expect(mockPlugin.settings.maxHistorySize).toBe(50); // Default
        });

        it('should update max size via settings', () => {
            mockPlugin.settings.maxHistorySize = 25;
            expect(mockPlugin.settings.maxHistorySize).toBe(25);
        });

        it('should trim existing history when max size is reduced', () => {
            // Add 5 entries
            for (let i = 1; i <= 5; i++) {
                historyManager.addSearch(`search${i}`);
            }

            // Reduce max size to 3
            mockPlugin.settings.maxHistorySize = 3;
            historyManager.updateMaxSize();

            const history = historyManager.getSearchHistory();
            expect(history).toHaveLength(3);
            expect(history).toEqual(['search5', 'search4', 'search3']);
        });
    });

    describe('History Return Values', () => {
        it('should return copies of history arrays', () => {
            historyManager.addSearch('test');

            const history1 = historyManager.getSearchHistory();
            const history2 = historyManager.getSearchHistory();

            expect(history1).not.toBe(history2); // Different array instances
            expect(history1).toEqual(history2); // Same contents
        });

        it('should not allow external modification of history', () => {
            historyManager.addSearch('test1');
            historyManager.addSearch('test2');

            const history = historyManager.getSearchHistory();
            history.push('test3'); // Try to modify

            const actualHistory = historyManager.getSearchHistory();
            expect(actualHistory).toHaveLength(2); // Unchanged
        });
    });
});