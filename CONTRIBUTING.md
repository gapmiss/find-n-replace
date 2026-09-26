# Contributing to Find-n-Replace

Thanks for helping out. Bug reports, fixes, and ideas are all welcome.

## Before you start

For anything bigger than a small fix, please [open an issue](https://github.com/gapmiss/find-n-replace/issues) first so we can agree on the approach before you spend time on it.

## Setup

1. Fork the repository and clone your fork.
2. Run `npm install`.
3. Create a branch: `git checkout -b fix/short-description`.
4. Run `npm run dev` to rebuild on every change. To try the plugin in Obsidian, symlink or copy `main.js`, `manifest.json`, and `styles.css` into a test vault's `.obsidian/plugins/find-n-replace/` folder.

## Checks

All three must pass before you open a pull request:

```bash
npm run lint     # ESLint, including eslint-plugin-obsidianmd
npm run build    # type-check and production build
npx vitest run   # full test suite
```

See [TESTING.md](TESTING.md) for how the tests are organized and how to write new ones.

## Code guidelines

- Follow the style of the surrounding code.
- Use strict types. Avoid `any` outside tests.
- Catch and report errors in async code so a failure shows the user a notice instead of breaking the view silently.
- Use Obsidian's APIs and CSS variables, and follow the [Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines). In particular: no regex lookbehind (unsupported on older iOS), no `innerHTML`, and sentence case in UI text.
- Add a regression test when you fix a bug.
- Try your change in a large vault if it touches search or replacement.

## Pull requests

- Keep each pull request to one change.
- Explain what changed and why, and how you tested it.
- Update the README or `docs/USER_GUIDE.md` if you change anything a user would notice.
