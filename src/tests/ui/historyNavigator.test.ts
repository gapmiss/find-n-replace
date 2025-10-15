import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryNavigator } from '../../ui/components/historyNavigator';
import { createMockPlugin } from '../mocks/MockPlugin';

describe('HistoryNavigator', () => {
    let navigator: HistoryNavigator;
    let mockPlugin: ReturnType<typeof createMockPlugin>;
    let input: HTMLInputElement;
    let history: string[];

    beforeEach(() => {
        mockPlugin = createMockPlugin();
        navigator = new HistoryNavigator(mockPlugin);

        // Create a real input element for testing
        input = document.createElement('input');
        input.type = 'text';

        // Initialize test history
        history = ['third', 'second', 'first']; // Newest first
    });

    describe('Attachment', () => {
        it('should attach to an input element', () => {
            expect(() => {
                navigator.attachTo(input, () => history);
            }).not.toThrow();
        });

        it('should start in non-history mode', () => {
            navigator.attachTo(input, () => history);
            expect(navigator.isInHistoryMode()).toBe(false);
            expect(navigator.getCurrentIndex()).toBe(-1);
        });
    });

    describe('Arrow Up Navigation', () => {
        beforeEach(() => {
            navigator.attachTo(input, () => history);
        });

        it('should show first history entry on first up arrow', () => {
            input.value = 'current input';

            const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
            input.dispatchEvent(event);

            expect(input.value).toBe('third');
            expect(navigator.getCurrentIndex()).toBe(0);
        });

        it('should save draft when entering history mode', () => {
            input.value = 'my draft';

            const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
            input.dispatchEvent(upEvent);

            expect(input.value).toBe('third'); // Switched to history

            // Go back down to verify draft
            const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
            input.dispatchEvent(downEvent);

            expect(input.value).toBe('my draft'); // Draft restored
        });

        it('should navigate through history with multiple up arrows', () => {
            const upEvent1 = new KeyboardEvent('keydown', { key: 'ArrowUp' });
            input.dispatchEvent(upEvent1);
            expect(input.value).toBe('third');

            const upEvent2 = new KeyboardEvent('keydown', { key: 'ArrowUp' });
            input.dispatchEvent(upEvent2);
            expect(input.value).toBe('second');

            const upEvent3 = new KeyboardEvent('keydown', { key: 'ArrowUp' });
            input.dispatchEvent(upEvent3);
            expect(input.value).toBe('first');
        });

        it('should stop at oldest entry', () => {
            // Navigate to end
            for (let i = 0; i < history.length; i++) {
                const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
                input.dispatchEvent(event);
            }

            expect(input.value).toBe('first'); // Oldest

            // Try to go beyond
            const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
            input.dispatchEvent(event);

            expect(input.value).toBe('first'); // Still at oldest
        });

        it('should do nothing when history is empty', () => {
            history.length = 0; // Clear history
            input.value = 'test';

            const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
            input.dispatchEvent(event);

            expect(input.value).toBe('test'); // Unchanged
            expect(navigator.isInHistoryMode()).toBe(false);
        });
    });

    describe('Arrow Down Navigation', () => {
        beforeEach(() => {
            navigator.attachTo(input, () => history);
        });

        it('should do nothing when not in history mode', () => {
            input.value = 'test';

            const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
            input.dispatchEvent(event);

            expect(input.value).toBe('test'); // Unchanged
        });

        it('should navigate to newer entries', () => {
            // Go up twice
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(input.value).toBe('second');

            // Go down once
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(input.value).toBe('third'); // Newer
        });

        it('should restore draft when going past newest entry', () => {
            input.value = 'my draft';

            // Enter history mode
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(input.value).toBe('third');

            // Go back to draft
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(input.value).toBe('my draft');
            expect(navigator.isInHistoryMode()).toBe(false);
        });
    });

    describe('Escape Key', () => {
        beforeEach(() => {
            navigator.attachTo(input, () => history);
        });

        it('should exit history mode and restore draft', () => {
            input.value = 'draft text';

            // Enter history
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(input.value).toBe('second');

            // Press escape
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(input.value).toBe('draft text');
            expect(navigator.isInHistoryMode()).toBe(false);
        });

        it('should do nothing when not in history mode', () => {
            input.value = 'test';

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(input.value).toBe('test'); // Unchanged
        });
    });

    describe('Manual Input Handling', () => {
        beforeEach(() => {
            navigator.attachTo(input, () => history);
        });

        it('should reset history position on manual input', () => {
            // Enter history mode
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(navigator.isInHistoryMode()).toBe(true);

            // Manually type
            input.value = 'new text';
            input.dispatchEvent(new Event('input'));

            expect(navigator.isInHistoryMode()).toBe(false);
            expect(navigator.getCurrentIndex()).toBe(-1);
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            navigator.attachTo(input, () => history);
        });

        it('should handle single-entry history', () => {
            history.length = 1;
            history[0] = 'only one';

            input.value = 'draft';

            // Up to entry
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(input.value).toBe('only one');

            // Try to go further
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(input.value).toBe('only one'); // Still at same entry

            // Down to draft
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(input.value).toBe('draft');
        });

        it('should handle empty draft', () => {
            input.value = '';

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(input.value).toBe('third');

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(input.value).toBe(''); // Empty draft restored
        });

        it('should handle history updates between navigations', () => {
            // Navigate to first entry
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(input.value).toBe('third');

            // Update history (simulate new entry added)
            history.unshift('newest');

            // Continue navigating with updated history
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(input.value).toBe('third'); // Still second item (index 1)
        });
    });

    describe('Detachment', () => {
        beforeEach(() => {
            navigator.attachTo(input, () => history);
        });

        it('should detach from input', () => {
            expect(() => {
                navigator.detach();
            }).not.toThrow();

            expect(navigator.isInHistoryMode()).toBe(false);
        });

        it('should reset state on detach', () => {
            // Enter history mode
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(navigator.isInHistoryMode()).toBe(true);

            navigator.detach();

            expect(navigator.isInHistoryMode()).toBe(false);
            expect(navigator.getCurrentIndex()).toBe(-1);
        });
    });
});