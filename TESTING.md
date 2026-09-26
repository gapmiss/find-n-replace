# Testing

The test suite uses [Vitest](https://vitest.dev/) with a jsdom environment and a hand-written mock of the Obsidian API. Tests run in Node, so you don't need Obsidian open to run them.

## Running tests

```bash
npm test                      # watch mode in a terminal, single run in CI
npx vitest run                # single run
npm run test:ui               # browser UI
npm run test:coverage         # coverage report (text, JSON, and HTML in coverage/)

npx vitest run src/tests/core                 # one folder
npx vitest run replacementEngine              # files matching a name
npx vitest run -t "second occurrence"         # tests matching a name
```

## Layout

All tests live in `src/tests/`.

| Folder | What's in it |
|--------|--------------|
| `core/` | Search engine, replacement engine, file filtering, multiline search and replace, history manager |
| `ui/` | View components, help modal, history navigation, multiline toggle |
| `unit/` | Regex helpers, match positions, performance limits, and regression tests for fixed bugs |
| `integration/` | Search, replace, and verify workflows across components |
| `fuzzing/` | Property-based tests with [fast-check](https://fast-check.dev/) |
| `utils/` | Logger |
| `mocks/` | `MockApp`, `MockVault`, `MockWorkspace`, `MockPlugin` |
| `__mocks__/obsidian.ts` | Stand-in for the `obsidian` module (aliased in `vitest.config.ts`) |
| `setup.ts` | Global setup loaded before every test file |

`tests/test-vault-generator.html` at the repo root is a separate browser tool for generating a sample vault to test by hand in Obsidian. Vitest doesn't use it.

## Writing a test

Create a mock app and plugin, then build the class under test. `createMockApp()` comes with a set of sample files, and `addTestFile()` adds more.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '../../core/searchEngine';
import { ReplacementEngine } from '../../core/replacementEngine';
import { createMockApp, createMockPlugin } from '../mocks';

describe('ReplacementEngine', () => {
    let mockApp: any; // MockApp's vault has test helpers that Obsidian's Vault type lacks
    let searchEngine: SearchEngine;
    let replacementEngine: ReplacementEngine;

    beforeEach(() => {
        mockApp = createMockApp();
        const mockPlugin = createMockPlugin(mockApp);
        searchEngine = new SearchEngine(mockApp, mockPlugin);
        replacementEngine = new ReplacementEngine(mockApp, mockPlugin, searchEngine);
    });

    it('replaces every match in the vault', async () => {
        mockApp.vault.addTestFile('example.md', 'foo bar foo');
        const options = { matchCase: false, wholeWord: false, useRegex: false };

        const results = await searchEngine.performSearch('foo', options, { includePatterns: ['example.md'] });
        await replacementEngine.dispatchReplace('vault', results, new Set(), 'baz', options);

        expect(mockApp.vault.getContent('example.md')).toBe('baz bar baz');
    });
});
```

`dispatchReplace` takes a mode (`'one'`, `'selected'`, `'file'`, or `'vault'`), the search results, the selected indices, the replacement text, and the search options.

Each call to `createMockApp()` and `createMockPlugin()` returns fresh objects, so tests don't share state.

## Guidelines

- Add a regression test in `src/tests/unit/bugRegression.test.ts` for every bug you fix, reproducing the exact case that failed.
- Test through the public API (`performSearch`, `dispatchReplace`, and so on) rather than private methods.
- When you change search or replacement behavior, cover both line-by-line mode and multiline mode.
- Run `npm run lint` and `npm run build` as well as the tests before opening a pull request.

## Continuous integration

Nothing runs the tests automatically yet. The only GitHub workflow, `.github/workflows/release.yml`, builds and publishes a release when a version tag is pushed. Run the suite yourself before releasing.
