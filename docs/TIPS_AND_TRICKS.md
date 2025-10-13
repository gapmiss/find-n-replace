# Find-n-Replace Tips & Tricks

Power user techniques, performance optimization, and workflow acceleration.

## Table of Contents

- [Performance Optimization](#performance-optimization)
- [Keyboard Shortcuts Mastery](#keyboard-shortcuts-mastery)
- [Advanced Regex Techniques](#advanced-regex-techniques)
- [Selection Management](#selection-management)
- [Search History Power User](#search-history-power-user)
- [File Filtering Strategies](#file-filtering-strategies)
- [Clear Input Button Efficiency](#clear-input-button-efficiency)
- [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)

---

## Performance Optimization

### Optimize for Large Vaults (>5000 files)

**Problem:** Searches slow down or UI freezes in large vaults

**Solutions:**

#### 1. Strategic File Filtering

**Always** use file filtering when possible:

```
files to include: .md              → Only markdown files
files to include: .js, .ts         → Only JavaScript/TypeScript files
files to include: Daily/, Projects/ → Only specific folders
files to exclude: Archive/, Attachments/ → Skip large folders
```

**Performance Impact:**
- No filtering: 10,000 files scanned (8-10 seconds)
- With filtering: 2,000 files scanned (1-2 seconds)
- **5-10x faster** with proper filters

**Pro Tip:** Create filter presets in settings for common use cases:
- Daily notes only: `Daily/`
- Current work: `Projects/, Work/`
- No archives: Exclude `Archive/, Old/, Backup/`

**📸 Screenshot Placeholder:** `tips-01-performance-filtering.png`
- Show: Side-by-side comparison of search times with/without filtering
- Annotation: Performance metrics showing time difference
- Highlight: Filter panel with optimized patterns

#### 2. Reduce Max Results

Settings → Core settings → Max Results

**Recommended Values:**
- Small vaults (<1000 files): 1000-2000 (default)
- Medium vaults (1000-5000 files): 500-1000
- Large vaults (>5000 files): 200-500

**Why it matters:**
- Fewer results = faster rendering
- UI remains responsive
- Memory usage reduced

**Trade-off:** May truncate results, but notification shows when limit reached

#### 3. Increase Debounce Delay

Settings → Core settings → Search Debounce Delay

**Recommended Values:**
- Fast typer: 500ms
- Default: 300ms
- Heavy vault: 700-1000ms

**Effect:**
- Longer delay = fewer searches triggered while typing
- Reduces unnecessary searches on partial input
- Balances responsiveness with performance

#### 4. Disable Auto-Search for Complex Patterns

Settings → Core settings → Enable Auto Search: OFF

**When to disable:**
- Working with complex regex patterns
- Very large vaults
- Want full control over when search executes

**Workflow:**
- Type complete pattern
- Press Enter to execute search manually
- Prevents intermediate searches on partial patterns

#### 5. Use Specific Regex Patterns

**Slow:**
```
.*                    → Matches everything (greedy)
[\s\S]*              → Matches all characters including newlines
(.+)+                → Catastrophic backtracking
```

**Fast:**
```
\bspecific\b         → Exact word match
\.md$                → Specific file extension
#[a-z0-9-]+          → Constrained character class
```

**Performance Tips:**
- Avoid greedy quantifiers (`.*`, `.+`) when possible
- Use specific character classes instead of `.`
- Anchor patterns with `^` or `\b` for faster matching
- Test patterns on single file first

**📸 Screenshot Placeholder:** `tips-02-performance-regex.png`
- Show: Comparison of slow vs. fast regex patterns with timing
- Annotation: Explanation of why fast patterns are optimized
- Highlight: Timing differences visually

---

## Keyboard Shortcuts Mastery

### Essential Hotkey Setup

Configure these hotkeys in Obsidian Settings → Hotkeys → Find-n-Replace:

**Recommended Configuration:**

| Command | Recommended Hotkey | Why |
|---------|-------------------|-----|
| Open Find-n-Replace | `Ctrl/Cmd+Shift+F` | Matches VSCode convention |
| Focus Search Input | `Ctrl/Cmd+Shift+H` | Quick access to search |
| Focus Replace Input | `Ctrl/Cmd+Shift+R` | Jump to replace field |
| Toggle Match Case | `Alt+C` | Quick toggle while searching |
| Toggle Whole Word | `Alt+W` | Quick toggle while searching |
| Toggle Regex | `Alt+R` | Enable/disable regex quickly |
| Select All Results | `Ctrl/Cmd+Shift+A` | Select all for bulk operations |
| Replace Selected | `Ctrl/Cmd+Shift+E` | Execute selected replacements |

**Pro Tip:** Use consistent modifiers:
- `Ctrl/Cmd+Shift` for main actions
- `Alt` for toggles
- Avoids conflicts with Obsidian core hotkeys

**📸 Screenshot Placeholder:** `tips-03-keyboard-hotkeys.png`
- Show: Hotkey settings panel with recommended configuration
- Annotation: Purpose of each hotkey assignment
- Highlight: Conflict-free modifier combinations

### Rapid Workflow Shortcuts

**Speed Workflow for Repetitive Tasks:**

1. **Open plugin:** `Ctrl/Cmd+Shift+F`
2. **Type search:** (auto-search starts)
3. **Press Enter:** Save to history
4. **Tab to replace:** Moves focus to replace input
5. **Type replacement:** Preview updates automatically
6. **Select all:** `Ctrl/Cmd+A` (or `Ctrl/Cmd+Shift+A` with hotkey)
7. **Replace:** Click "Replace Selected" or use hotkey
8. **Clear and restart:** `Escape` in search field → type new search

**Total time:** ~10-15 seconds per search-replace cycle

### Navigation Shortcuts

**Sequential Tab Navigation:**

```
Tab → Search input
Tab → Replace input
Tab → Match Case toggle
Tab → Whole Word toggle
Tab → Regex toggle
Tab → Multiline toggle
Tab → Filter button
Tab → Toolbar actions
Tab → Results container
Tab → First file header
Tab → First result
Tab → Replace button
(continues through all results)
```

**Pro Tips:**
- `Shift+Tab` to navigate backward
- `Enter`/`Space` to activate focused element
- `Escape` to clear selections or inputs
- Tab order optimized for efficient keyboard-only usage

### History Navigation Power User

**Building a Pattern Library:**

1. **Save patterns as you create them:** Press Enter after typing
2. **Navigate history:** `↑`/`↓` arrows in input field
3. **Increase history capacity:** Settings → Max History Entries: 200
4. **Organize patterns:** Keep most-used patterns at top (most recent)

**Advanced History Technique:**

"Refresh" important patterns by re-saving them:
1. Navigate to old pattern with `↑`
2. Make tiny edit (add/remove space)
3. Edit back to original
4. Press Enter
5. Pattern moves to top of history (most recent)

**Use Case:** Keep frequently-used regex patterns accessible without scrolling through history

---

## Advanced Regex Techniques

### Lookaheads and Lookbehinds

**Positive Lookahead** `(?=...)`
- Matches position where pattern follows

**Example: Find "test" only when followed by "file"**
```
Search: test(?=file)
Matches: "test" in "testfile"
Does not match: "test" in "testing"
```

**Negative Lookahead** `(?!...)`
- Matches position where pattern does NOT follow

**Example: Find "log" not followed by "in"**
```
Search: log(?!in)
Matches: "log" in "logger", "logging"
Does not match: "log" in "login"
```

**Positive Lookbehind** `(?<=...)`
- Matches position where pattern precedes

**Example: Find "log" only after "event"**
```
Search: (?<=event)log
Matches: "log" in "eventlog"
Does not match: "log" in "changelog"
```

**Negative Lookbehind** `(?<!...)`
- Matches position where pattern does NOT precede

**Example: Find "#tag" not in URL (avoid #anchor)**
```
Search: (?<!http)(?<!https)#([a-z0-9-]+)
Matches: "#projectname" (inline tag)
Does not match: "https://example.com#section"
```

**📸 Screenshot Placeholder:** `tips-04-advanced-regex-lookaround.png`
- Show: Examples of lookahead/lookbehind with matches/non-matches
- Annotation: Explanation of each lookaround type
- Highlight: Patterns with positive/negative lookaround differences

### Non-Capturing Groups

**Syntax:** `(?:...)`

**Use Case:** Grouping without creating capture reference

**Example: Match variations without capture overhead**
```
Search: (?:TODO|FIXME|HACK):\s*(.+)
Replace: - [ ] $1

Only one capture group ($1), but matches all three keywords
```

**Why use non-capturing groups?**
- Improves performance (fewer captures to track)
- Simplifies replacement numbering
- Still provides grouping for quantifiers

**Example: Repeating patterns**
```
Search: (?:ha)+
Matches: "ha", "haha", "hahaha"
No capture groups created
```

### Greedy vs. Lazy Quantifiers

**Greedy** (default): Matches as much as possible
- `.*` → Matches everything to end of line
- `.+` → Matches one or more (maximum)

**Lazy** (add `?`): Matches as little as possible
- `.*?` → Matches minimum until next pattern
- `.+?` → Matches one or more (minimum)

**Example: Extract text between brackets**

**Greedy:**
```
Search: \[(.+)\]
Text: "[first] and [second]"
Matches: "first] and [second" (everything between first [ and last ])
```

**Lazy:**
```
Search: \[(.+?)\]
Text: "[first] and [second]"
Matches: "first" (stops at first ]), then "second" (separate matches)
```

**Use lazy when:** You want minimal matching, especially with multiple instances

### Character Class Shortcuts

**Built-in Classes:**
- `\d` → Digit [0-9]
- `\D` → Non-digit [^0-9]
- `\w` → Word character [a-zA-Z0-9_]
- `\W` → Non-word character [^a-zA-Z0-9_]
- `\s` → Whitespace [ \t\n\r]
- `\S` → Non-whitespace [^ \t\n\r]

**Custom Classes:**
- `[a-z]` → Lowercase letters
- `[A-Z]` → Uppercase letters
- `[a-zA-Z]` → All letters
- `[0-9]` → Digits
- `[a-z0-9-]` → Lowercase, digits, hyphens

**Negated Classes:**
- `[^abc]` → Anything except a, b, or c
- `[^\]]` → Anything except closing bracket

**Pro Tip:** Use `\w` instead of `[a-zA-Z0-9_]` for readability

---

## Selection Management

### Strategic Multi-Selection

**Keyboard Selection:**
- `Ctrl/Cmd+A` → Select all visible results
- `Ctrl/Cmd+Click` → Toggle individual result
- `Escape` → Clear all selections

**Mouse Selection:**
- Click checkbox icon (if visible)
- Ctrl/Cmd+Click on result snippet
- Purple gradient indicates selection

### Selection Patterns

**Pattern 1: Select All, Deselect Exceptions**

Best for: Bulk operations with few exceptions

1. `Ctrl/Cmd+A` to select all
2. `Ctrl/Cmd+Click` to deselect specific unwanted matches
3. Execute "Replace Selected"

**Pattern 2: Select Specific, Build Up**

Best for: Careful, surgical replacements

1. Start with no selection
2. `Ctrl/Cmd+Click` to select each valid match
3. Selection count updates in toolbar
4. Execute "Replace Selected"

**Pattern 3: File-by-File Selection**

Best for: File-specific decisions

1. Expand first file group
2. Review all matches in context
3. Select matches to replace in that file
4. Use file header menu → "Replace All in File"
5. Move to next file

**📸 Screenshot Placeholder:** `tips-05-selection-patterns.png`
- Show: Visual workflow for each selection pattern
- Annotation: When to use each pattern
- Highlight: Selection states and counts

### Selection Persistence

**Key Feature:** Selections maintain state when editing replacement text

**Workflow:**
1. Select specific matches: `Ctrl/Cmd+Click` (e.g., 15 selected)
2. Type replacement text → Preview updates
3. Edit replacement → Selections persist (still 15 selected)
4. Refine until perfect → Execute "Replace Selected"

**Why it matters:**
- No need to re-select after editing
- Iterate on replacement pattern without losing selections
- Build confidence before executing

**Pro Tip:** Use selection persistence to experiment with different replacement patterns on same set of matches

---

## Search History Power User

### Building a Pattern Library

**Strategy 1: Curate Your History**

- **Save only refined patterns:** Don't save typos or experimental patterns
- **Re-save important patterns:** Moves them to top of history (most recent)
- **Clear periodically:** Settings → Clear All History when cluttered

**Strategy 2: Document Complex Patterns**

Create vault note: `Templates/Regex Patterns.md`

```markdown
# Reusable Regex Patterns

## Date Formats
- ISO to US: `(\d{4})-(\d{2})-(\d{2})` → `$2/$3/$1`
- European to US: `(\d{2})/(\d{2})/(\d{4})` → `$2/$1/$3`

## Links
- External links: `\[([^\]]+)\]\((https?://[^)]+)\)`
- Wikilinks with aliases: `\[\[([^\]|]+)\|([^\]]+)\]\]`

## Tags
- Inline hashtags: `#([a-z0-9-]+)`
- Convert to wikilinks: Replace with `[[tags/$1]]`

## Tasks
- Standardize format: `^[-*]\s*\[\s*\]\s*(.+)$` → `- [ ] $1`
```

**Benefits:**
- Searchable pattern library
- Team can share patterns
- Patterns versioned with vault (Git)

**📸 Screenshot Placeholder:** `tips-06-pattern-library.png`
- Show: Example pattern library note with organized regex patterns
- Annotation: Categories and reusable patterns
- Highlight: Copy-paste ready patterns with explanations

### History Navigation Shortcuts

**Quick History Access:**

1. **Focus input:** Click or use hotkey
2. **Instantly navigate:** Press `↑` (no need to clear input first)
3. **Cycle through:** `↑`/`↓` to browse
4. **Select pattern:** Press `Enter` to search and re-save
5. **Exit history:** Press `Escape` to restore typed input

**Pro Tips:**
- **Don't type full pattern first:** Navigate history immediately
- **Edit historical patterns:** Modify after navigating, press Enter to save variant
- **History is per-input:** Search history and replace history are separate

---

## File Filtering Strategies

### Filter Presets via Settings

**Strategy:** Configure default filters in settings for common scenarios

**Scenario 1: Daily Notes Only**
```
Settings → Default files to include: Daily/
Settings → Default files to exclude: (empty)
```

**Scenario 2: Current Work (No Archives)**
```
Settings → Default files to include: Projects/, Work/
Settings → Default files to exclude: Archive/, Old/, Completed/
```

**Scenario 3: Markdown Only (No Code)**
```
Settings → Default files to include: .md
Settings → Default files to exclude: *.js, *.ts, *.json
```

**Scenario 4: Code Files Only (No Markdown)**
```
Settings → Default files to include: .js, .ts, .css, .json
Settings → Default files to exclude: .md, .txt
```

**Workflow:**
- Configure defaults in settings
- Open plugin → Filters auto-populated
- Make session-only adjustments as needed
- Close/reopen to reload defaults

### Glob Pattern Mastery

**Basic Patterns:**
- `*.md` → All markdown files (any directory)
- `.md` → Files ending with .md (equivalent to *.md)
- `folder/` → All files in folder directory

**Advanced Patterns:**
- `**/*.md` → All markdown files in all subdirectories recursively
- `Projects/**/*.txt` → Text files in Projects and all subfolders
- `*backup*` → Any file with "backup" anywhere in name
- `temp/*` → All files directly in temp folder (not subdirectories)

**Combining Patterns:**
```
files to include: .md, .txt, Notes/
(Matches markdown OR text files OR anything in Notes/)

files to exclude: Archive/, *.tmp, *backup*
(Excludes Archive folder OR temp files OR backup files)
```

**📸 Screenshot Placeholder:** `tips-07-glob-patterns.png`
- Show: Filter panel with complex glob patterns and visual explanation
- Annotation: Pattern syntax breakdown with match examples
- Highlight: Differences between *.ext, folder/, and **/ patterns

### Dynamic Filtering Workflow

**Use Case:** Need different filters for different searches in same session

**Workflow:**
1. Open plugin with default filters
2. Perform first search with defaults
3. Modify filters for specific search (session-only)
4. Perform second search with new filters
5. Adjust filters again for third search
6. Close plugin when done (resets to defaults)

**Example Session:**
- Search 1: Find TODOs in project notes (filter: `Projects/`)
- Search 2: Find broken links in all notes (clear filters)
- Search 3: Update dates in daily notes only (filter: `Daily/`)

**Pro Tip:** Filters are session-only, so experiment freely without changing settings

---

## Clear Input Button Efficiency

### One-Click Input Clearing

**Feature:** All text inputs have contextual X buttons

**Inputs with Clear Buttons:**
- Search input
- Replace input
- Files to include input
- Files to exclude input

**Behavior:**
- Appears when content present
- Disappears when empty
- Click X or press Escape to clear
- Focus remains in input after clearing

### Clear Button Workflows

**Workflow 1: Quick Iteration**

1. Enter search pattern → Results appear
2. Review results
3. Click X to clear search
4. Type new pattern immediately (focus preserved)
5. Repeat for multiple searches

**Workflow 2: Filter Experimentation**

1. Set include filter → Search
2. Results too limited
3. Click X on include filter
4. Try exclude filter instead
5. Click X to clear if needed
6. Iterate until optimal results

**Workflow 3: History + Clear**

1. Navigate history with `↑`/`↓`
2. Historical pattern appears
3. Not what you wanted
4. Press Escape to clear and restore your typed input
5. (Or press Escape again to clear entirely)

**Pro Tip:** Combine clear buttons with search history for rapid pattern testing

**📸 Screenshot Placeholder:** `tips-08-clear-buttons.png`
- Show: Close-up of clear buttons on various inputs with visible/hidden states
- Annotation: Workflow showing rapid clearing and re-entering
- Highlight: Focus retention after clear action

---

## Common Pitfalls to Avoid

### Pitfall 1: Forgetting Escape Characters

**Problem:**
```
Search: .md
Intended: Find ".md" file extension
Actual: Matches "cmd", "amd", "zmd" (. matches any character)
```

**Solution:**
```
Search: \.md
(Escape the period with backslash)
```

**Common Characters to Escape:**
```
. * + ? [ ] ( ) { } | ^ $ \
Use: \. \* \+ \? \[ etc.
```

### Pitfall 2: Greedy Quantifier Overreach

**Problem:**
```
Search: \[(.+)\]
Text: "[first] and [second]"
Matches: "first] and [second" (everything between first [ and last ])
```

**Solution:**
```
Search: \[(.+?)\]
(Use lazy quantifier .+?)
Matches: "first" and "second" separately
```

### Pitfall 3: Missing Multiline Mode

**Problem:**
```
Search: ^## Heading
Text has headings, but returns 0 results
```

**Solution:**
Enable Multiline toggle (⤓) for `^` and `$` anchors to work

**Rule:** If using `^`, `$`, or `\n` in pattern, enable Multiline mode

### Pitfall 4: Replace All Without Preview

**Problem:**
Execute "Replace All in Vault" without reviewing preview

**Solution:**
1. **Always review preview** before replacing (red strikethrough → green)
2. **Test on single match** first (hover → "Replace This")
3. **Enable confirmation modal:** Settings → Confirm Destructive Actions: ON
4. **Use file-by-file** for unfamiliar patterns

### Pitfall 5: Ignoring Filter Active State

**Problem:**
Search returns unexpectedly few results because filters are still active from previous search

**Solution:**
- **Check filter button** for active indicator (badge/border)
- **Clear filters** when switching to different search scope
- **Be aware:** Filters persist during session
- Click filter button to review/clear active filters

### Pitfall 6: Forgetting Capture Group Numbering

**Problem:**
```
Search: (\d{4})-(\d{2})-(\d{2})
Replace: $0/$1/$2
Expects: Year/Month/Day
Actual: ERROR or unexpected result ($0 is not a valid capture reference)
```

**Solution:**
Capture groups are 1-indexed: `$1`, `$2`, `$3`, etc.
```
Replace: $1/$2/$3
```

**Note:** `$0` is not standard (use `$&` for entire match instead)

### Pitfall 7: Not Testing Regex Before Bulk Replace

**Problem:**
Run "Replace All in Vault" with untested regex pattern, causing widespread incorrect replacements

**Solution: Always Test First**

1. **Test on regex101.com** with sample text
2. **Search in single file** first (use file filtering)
3. **Review all preview results** thoroughly
4. **Replace single match** to verify behavior
5. **Scale gradually:** Single file → Folder → Vault

**Rule:** Never skip testing phase for complex patterns

---

## Pro Tips Summary

### Top 10 Efficiency Boosters

1. **Configure hotkeys** for instant access (`Ctrl/Cmd+Shift+F`)
2. **Use file filtering** to limit scope and improve performance
3. **Build pattern library** in vault note for reusable regex
4. **Leverage search history** with increased max entries (200)
5. **Master multi-selection** for surgical replacements
6. **Test regex patterns** on single files before scaling
7. **Enable confirmation modals** for destructive operations
8. **Clear inputs with Escape** for rapid workflow iterations
9. **Navigate with Tab** for keyboard-only efficiency
10. **Review preview thoroughly** before executing replacements

### Performance Checklist

- [ ] File filtering configured for common use cases
- [ ] Max results reduced for large vaults (500-1000)
- [ ] Debounce delay increased if needed (500ms)
- [ ] Auto-search disabled for complex regex work
- [ ] Regex patterns optimized (avoid greedy quantifiers)

### Safety Checklist

- [ ] Confirmation modal enabled for Replace All operations
- [ ] Git commits or backups before major changes
- [ ] Test patterns on single file first
- [ ] Review preview red→green carefully
- [ ] File-by-file approach for unfamiliar patterns
- [ ] Verification searches after bulk replacements

---

**Next Steps:**
- Practice these techniques on test vault
- Implement recommended hotkey configuration
- Build your personal regex pattern library
- Explore [Workflows](WORKFLOWS.md) for real-world applications

---

*Tips & Tricks Version 1.0.0 - Last updated: 2025-10-13*
