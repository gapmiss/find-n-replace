import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from '../../core/historyManager';
import { createMockPlugin } from '../mocks/MockPlugin';

describe('HistoryManager', () => {
    let historyManager: HistoryManager;
    let mockPlugin: ReturnType<typeof createMockPlugin>;

    beforeEach(() => {
        mockPlugin = createMockPlugin();
        historyManager = new HistoryManager(mockPlugin);
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
            historyManager.addReplace(null as unknown as string);
            historyManager.addReplace(undefined as unknown as string);

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

    describe('Include History', () => {
        it('should add include patterns to history', () => {
            historyManager.addInclude('.md, Notes/');

            const history = historyManager.getIncludeHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toBe('.md, Notes/');
        });

        it('should trim whitespace from include patterns', () => {
            historyManager.addInclude('  *.js  ');

            expect(historyManager.getIncludeHistory()[0]).toBe('*.js');
        });

        it('should skip empty include patterns', () => {
            historyManager.addInclude('');
            historyManager.addInclude('   ');

            expect(historyManager.getIncludeHistory()).toHaveLength(0);
        });

        it('should not save include patterns when history is disabled', () => {
            mockPlugin.settings.enableSearchHistory = false;

            historyManager.addInclude('.md');

            expect(historyManager.getIncludeHistory()).toHaveLength(0);
        });

        it('should not add duplicate consecutive entries', () => {
            historyManager.addInclude('.md');
            historyManager.addInclude('.md');

            expect(historyManager.getIncludeHistory()).toHaveLength(1);
        });

        it('should implement LRU - move existing entry to front', () => {
            historyManager.addInclude('first');
            historyManager.addInclude('second');
            historyManager.addInclude('third');
            historyManager.addInclude('first'); // Move to front

            expect(historyManager.getIncludeHistory()).toEqual(['first', 'third', 'second']);
        });

        it('should enforce max history size', () => {
            mockPlugin.settings.maxHistorySize = 3;

            historyManager.addInclude('first');
            historyManager.addInclude('second');
            historyManager.addInclude('third');
            historyManager.addInclude('fourth'); // Should remove 'first'

            expect(historyManager.getIncludeHistory()).toEqual(['fourth', 'third', 'second']);
        });

        it('should clear include history', () => {
            historyManager.addInclude('.md');
            historyManager.addInclude('.txt');

            historyManager.clearIncludeHistory();

            expect(historyManager.getIncludeHistory()).toHaveLength(0);
        });
    });

    describe('Exclude History', () => {
        it('should add exclude patterns to history', () => {
            historyManager.addExclude('*.tmp, Archive/');

            const history = historyManager.getExcludeHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toBe('*.tmp, Archive/');
        });

        it('should trim whitespace from exclude patterns', () => {
            historyManager.addExclude('  *backup*  ');

            expect(historyManager.getExcludeHistory()[0]).toBe('*backup*');
        });

        it('should skip empty exclude patterns', () => {
            historyManager.addExclude('');
            historyManager.addExclude('   ');

            expect(historyManager.getExcludeHistory()).toHaveLength(0);
        });

        it('should not add duplicate consecutive entries', () => {
            historyManager.addExclude('*.tmp');
            historyManager.addExclude('*.tmp');

            expect(historyManager.getExcludeHistory()).toHaveLength(1);
        });

        it('should implement LRU - move existing entry to front', () => {
            historyManager.addExclude('first');
            historyManager.addExclude('second');
            historyManager.addExclude('third');
            historyManager.addExclude('first'); // Move to front

            expect(historyManager.getExcludeHistory()).toEqual(['first', 'third', 'second']);
        });

        it('should enforce max history size', () => {
            mockPlugin.settings.maxHistorySize = 3;

            historyManager.addExclude('first');
            historyManager.addExclude('second');
            historyManager.addExclude('third');
            historyManager.addExclude('fourth'); // Should remove 'first'

            expect(historyManager.getExcludeHistory()).toEqual(['fourth', 'third', 'second']);
        });

        it('should clear exclude history', () => {
            historyManager.addExclude('*.tmp');
            historyManager.addExclude('Archive/');

            historyManager.clearExcludeHistory();

            expect(historyManager.getExcludeHistory()).toHaveLength(0);
        });
    });

    describe('Combined Operations', () => {
        it('should manage all histories independently', () => {
            historyManager.addSearch('search1');
            historyManager.addReplace('replace1');
            historyManager.addInclude('include1');
            historyManager.addExclude('exclude1');
            historyManager.addSearch('search2');
            historyManager.addReplace('replace2');
            historyManager.addInclude('include2');
            historyManager.addExclude('exclude2');

            expect(historyManager.getSearchHistory()).toEqual(['search2', 'search1']);
            expect(historyManager.getReplaceHistory()).toEqual(['replace2', 'replace1']);
            expect(historyManager.getIncludeHistory()).toEqual(['include2', 'include1']);
            expect(historyManager.getExcludeHistory()).toEqual(['exclude2', 'exclude1']);
        });

        it('should clear all history', () => {
            historyManager.addSearch('search1');
            historyManager.addReplace('replace1');
            historyManager.addInclude('include1');
            historyManager.addExclude('exclude1');

            historyManager.clearAllHistory();

            expect(historyManager.getSearchHistory()).toHaveLength(0);
            expect(historyManager.getReplaceHistory()).toHaveLength(0);
            expect(historyManager.getIncludeHistory()).toHaveLength(0);
            expect(historyManager.getExcludeHistory()).toHaveLength(0);
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

        it('should trim all history types when max size is reduced', () => {
            for (let i = 1; i <= 5; i++) {
                historyManager.addSearch(`search${i}`);
                historyManager.addReplace(`replace${i}`);
                historyManager.addInclude(`include${i}`);
                historyManager.addExclude(`exclude${i}`);
            }

            mockPlugin.settings.maxHistorySize = 3;
            historyManager.updateMaxSize();

            expect(historyManager.getSearchHistory()).toHaveLength(3);
            expect(historyManager.getReplaceHistory()).toHaveLength(3);
            expect(historyManager.getIncludeHistory()).toHaveLength(3);
            expect(historyManager.getExcludeHistory()).toHaveLength(3);
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