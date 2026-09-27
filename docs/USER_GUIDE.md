# Find-n-Replace user guide

This guide covers everything the plugin does. For installation, see the [README](../README.md).

- [Opening the view](#opening-the-view)
- [The search panel](#the-search-panel)
- [Search options](#search-options)
- [Reading the results](#reading-the-results)
- [Replacing](#replacing)
- [Selecting matches](#selecting-matches)
- [The result limit](#the-result-limit)
- [File filters](#file-filters)
- [Regular expressions](#regular-expressions)
- [Multiline search](#multiline-search)
- [History](#history)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [Troubleshooting](#troubleshooting)

## Opening the view

Run **Find-n-Replace: Open** from the command palette. The view opens in a sidebar, and you can drag it anywhere in your workspace like any other Obsidian view.

The plugin has no default hotkeys. To add some, open **Settings → Hotkeys** and search for "Find-n-Replace".

## The search panel

From top to bottom:

- **Search box.** What to find.
- **Toggles** next to the search box: match case, whole word, use regex, and multiline.
- **Replace box.** What to replace it with. Leave it empty to delete the matches.
- **Clear button** (magnifier with an X). Empties both boxes and turns all four toggles off.
- **Filter button.** Shows or hides the "files to include" and "files to exclude" boxes. It's highlighted while a filter is active.
- **Results bar.** The match count, how many matches are selected, the **⋯** menu (**Replace selected**, **Replace all in vault**, **Help**), and an expand/collapse all button.

Every text box has a small X button that appears when the box has text in it.

With **Enable auto-search** on (the default), results update shortly after you stop typing. With it off, press Enter to search.

## Search options

**Match case.** Off by default, so `todo` finds `TODO`, `Todo`, and `todo`. Turn it on to match exact case.

**Whole word.** Only matches whole words, so `test` finds "test" but not "testing" or "latest".

**Use regex.** Treats the search as a JavaScript regular expression and turns on `$1`-style tokens in the replacement. See [Regular expressions](#regular-expressions).

**Multiline.** Lets a regex match across line breaks. Only takes effect when **Use regex** is also on. See [Multiline search](#multiline-search).

Toggles reset to off each time you open the view. Turn on **Remember search options** in settings to keep them.

## Reading the results

Results are grouped by file, and files are sorted by path. Each file header shows the file name, a colored badge for files that aren't Markdown, and the number of matches.

- Click a file header to collapse or expand it. The plugin remembers which files you collapsed.
- Click a result to open the file with the match selected.
- When the replace box has text, each result shows a preview: the matched text crossed out, followed by the replacement.
- Long lines are cut off by default. Run **Toggle word-wrap in results** to wrap them.

## Replacing

There are four ways to replace, from narrowest to widest.

| Action | Where | What it replaces |
|--------|-------|------------------|
| Replace this match | Button on a result row | That one match |
| Replace selected | **⋯** menu, or Alt+Enter | The matches you selected |
| Replace all in this file | Button on a file header | Every match in that file, including ones hidden by the result limit |
| Replace all in vault | **⋯** menu, or Ctrl/Cmd+Enter | Every match in the vault, including ones hidden by the result limit |

Replacing in a whole file or the whole vault asks for confirmation first. You can turn this off with **Confirm destructive actions**. Replacing a single match or your selection with an empty replace box always asks first, since it deletes text.

Replacements write straight to your files. The plugin has no undo, so keep a backup or use git. A safe way to work:

1. Search, then read through the preview.
2. Replace one match and check the file.
3. Replace the rest.
4. Search again to confirm nothing was missed.

## Selecting matches

- **Ctrl/Cmd+click** a result to select or deselect it.
- **Ctrl/Cmd+click** a file header to select or deselect every match in that file.
- Run the **Select all results** command to select every match in the list.

Selected results are highlighted, and the results bar shows how many are selected. Editing the replace text keeps your selection, so you can adjust the replacement while you look at the previews. A new search or the clear button empties the selection.

On mobile there is no Ctrl/Cmd+click, so use **Select all results** or the per-result and per-file buttons.

## The result limit

The list shows at most 1,000 matches by default. When a search finds more, the count reads `1000 of 507370 results in 5 files (limited)`. The limit counts matches, not files, and the file count covers only the matches shown.

The limit exists so a very broad search (a single letter, say) doesn't freeze Obsidian drawing half a million rows.

What the limit affects:

- **Replace all in vault** ignores it. After you confirm, it searches again with no limit and replaces every match. The confirmation dialog shows the total match count. Its file count only covers the files in the list, so it says "at least".
- **Replace all in this file** ignores it too. If the file was cut off partway through, it searches that file again and replaces every match.
- **Replace selected** and **Select all results** only see the matches in the list.

To see more matches, raise **Maximum results** in settings (large values make the list slower), or narrow the search with a more specific query or file filters.

## File filters

Click the filter button to show the two filter boxes. Enter one or more patterns separated by commas.

With both boxes empty, the plugin searches files with common text extensions, including Markdown, plain text, HTML, CSS, JavaScript and TypeScript, JSON, YAML, XML, CSV, SVG, and many source code and config formats. Images, PDFs, and other binary files are skipped. So are text formats not on that list, such as `.canvas` and `.base`. To search one of those, add its extension to "files to include".

### Pattern types

| Pattern | Example | Matches |
|---------|---------|---------|
| Extension (starts with a dot) | `.md` | Files with that extension |
| Folder (ends with `/`, or a plain name) | `Notes/` or `Notes` | Files inside that folder, including subfolders |
| Wildcard (contains `*` or `?`) | `*.tmp`, `*backup*` | Full paths matching the pattern |
| File name (has an extension) | `todo.md` | That exact path |

Details that trip people up:

- **Paths start at the vault root.** `Daily/` matches `Daily/2024-01-15.md` but not `Journal/Daily/2024-01-15.md`. Use `Journal/Daily/` or `*Daily/*` for that.
- **Extensions need the dot.** `md` without a dot is read as a folder named "md".
- **`*` matches across folders.** `Notes/*.md` matches `Notes/a.md` and `Notes/sub/b.md`. `**` behaves the same as `*`.
- **Wildcard matching ignores case.** Folder matching does not.

### How include patterns combine

Patterns of the same type are combined with OR. Patterns of different types are combined with AND.

- `.md, .txt` → Markdown or text files.
- `Notes/, Daily/` → files in Notes or Daily.
- `.md, Projects/` → Markdown files that are in Projects.

A file is skipped if it matches any exclude pattern.

### Filters are per session

Changes in the filter boxes last until you close the view. They don't change your settings. To start every session with the same filters, set **Default files to include** and **Default files to exclude** in settings, then close and reopen the view.

Filters are applied before any file is read, so narrowing them is the easiest way to speed up searches in a large vault.

## Regular expressions

Turn on **Use regex** to search with JavaScript regular expressions.

### Replacement tokens

These only work when **Use regex** is on. With it off, the replacement is inserted exactly as typed.

| Token | Inserts |
|-------|---------|
| `$1` to `$99` | A capture group |
| `$&` or `$0` | The whole match |
| `` $` `` | The text before the match (on the same line, or in the whole file with multiline on) |
| `$'` | The text after the match (same rule) |
| `$$` | A literal `$` |
| `\n`, `\t` | A newline, a tab |

Named groups (`$<name>`) are not supported.

### Examples

| Search | Replace | Result |
|--------|---------|--------|
| `(\d{4})-(\d{2})-(\d{2})` | `$2/$3/$1` | `2024-01-15` → `01/15/2024` |
| `\[([^\]]+)\]\(([^)]+)\)` | `[[$2\|$1]]` | `[Label](Note)` → `[[Note\|Label]]` |
| `\[\[([^\]\|]+)\]\]` | `$1` | `[[Note]]` → `Note` (skips aliased links) |
| `^#{3,} ` | `## ` | Turns deeper headings into H2 |
| `^- \[ \] ` | `- [x] ` | Marks open tasks as done |
| `(?:TODO\|FIXME):\s*(.+)` | `- [ ] $1` | `TODO: call Sam` → `- [ ] call Sam` |
| `\[(.+?)\]` | `($1)` | Lazy match: `[a] and [b]` → `(a) and (b)` |

### Notes

- Without multiline mode, each line is searched on its own, so `^` and `$` already mean the start and end of a line.
- Escape special characters to match them literally: `\.` `\*` `\+` `\?` `\(` `\)` `\[` `\]` `\{` `\}` `\|` `\^` `\$` `\\`.
- Patterns like `.*` followed by more text, or nested repeats like `(a+)+`, can be very slow on long lines. The plugin warns you about these unless you turn off **Warn about slow regex patterns**. Lazy quantifiers (`.*?`) and specific character classes (`[^\]]+`) are faster.
- Lookbehind (`(?<=...)`, `(?<!...)`) doesn't work on iOS and iPadOS older than 16.4.
- An invalid pattern shows an error and doesn't run.

## Multiline search

With **Use regex** and **Multiline** both on, the whole file is searched at once, so a pattern can span lines using `\n`.

| Search | Replace | Effect |
|--------|---------|--------|
| `(^#+ .+)\n\n+` | `$1\n` | Removes blank lines after headings |
| `^- (.+)\n- (.+)$` | `- $1; $2` | Joins pairs of list items |
| ```` ```(\w+)\n([\s\S]*?)\n``` ```` | | Finds fenced code blocks and their language |

`^` and `$` still mean the start and end of each line. A multiline match is listed under the line where it starts.

Multiline search is slower than the normal mode, so use file filters to narrow it in large vaults.

## History

Press Enter in any of the four text boxes (search, replace, files to include, files to exclude) to save what's in it to that box's history. Then:

- **↑** shows older entries.
- **↓** shows newer entries.
- **Escape** returns to what you were typing.

Each box keeps its own history, up to 50 entries by default. Using an old entry again moves it to the top. Turn history off, change its size, or clear it in settings.

## Keyboard shortcuts

These work while focus is inside the view:

| Keys | Action |
|------|--------|
| Enter (in search or replace box) | Search now and save to history |
| Enter (in a filter box) | Apply the filter now and save to history |
| ↑ / ↓ (in any text box) | Browse history |
| Escape (in any text box) | Leave history and restore your text |
| Ctrl/Cmd+Enter | Replace all in vault |
| Alt+Enter | Replace selected |
| Tab / Shift+Tab | Move between controls |
| Enter or Space | Activate the focused button, toggle, file header, or result |

The 15 commands in the command palette can all take hotkeys. **Help** in the **⋯** menu lists them with your current hotkeys.

## Settings

**Search settings**

| Setting | Default | Notes |
|---------|---------|-------|
| Maximum results | 1000 | Most matches shown in the list. See [The result limit](#the-result-limit). |
| Enable auto-search | On | Search as you type. When off, press Enter. |
| Search debounce delay | 300 ms | How long to wait after typing stops before searching. |

**Search history**

| Setting | Default | Notes |
|---------|---------|-------|
| Enable search history | On | |
| Maximum history entries | 50 | Per box, from 10 to 200. |
| Clear search history | | Clears all four histories after you confirm. |

**File filtering defaults**

| Setting | Default | Notes |
|---------|---------|-------|
| Default files to include | Empty | Filled into "files to include" when the view opens. |
| Default files to exclude | Empty | Filled into "files to exclude" when the view opens. |

**User experience**

| Setting | Default | Notes |
|---------|---------|-------|
| Confirm destructive actions | On | Ask before replacing in a whole file or the whole vault. |
| Remember search options | Off | Keep toggle states between sessions. |
| Remember file group states across restarts | On | Keep collapsed files collapsed after restarting Obsidian. |
| Warn about slow regex patterns | On | Show a notice for patterns likely to be slow. |

**Troubleshooting**

| Setting | Default | Notes |
|---------|---------|-------|
| Console logging level | Errors only | Raise to Debug when reporting a bug. |

## Troubleshooting

**No results, but the text is there.**
- Check the filter button. A filter from earlier in the session may still be active.
- Check the file's extension. `.canvas`, `.base`, and other unlisted formats are skipped unless you include them.
- Turn off match case and whole word.
- If regex is on, make sure special characters like `.`, `(` or `[` are escaped.
- If your pattern contains `\n`, turn on both regex and multiline.

**Search is slow.**
- Narrow the scope with "files to include", or exclude big folders like `Archive/`.
- Rewrite slow regex (see [Notes](#notes)).
- Turn off multiline if you don't need it.
- Raise **Search debounce delay**, or turn off auto-search and press Enter instead.

**A replacement didn't do what the preview showed.**
- If the file changed after the search, search again before replacing.
- Remember that the result limit applies to **Replace selected**.

**Reporting a bug.** Set **Console logging level** to Debug, open the developer console (Ctrl+Shift+I on Windows and Linux, Cmd+Option+I on macOS), reproduce the problem, and include the console output, your Obsidian and plugin versions, and the steps in a [GitHub issue](https://github.com/gapmiss/find-n-replace/issues).
