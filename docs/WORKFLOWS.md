# Find-n-Replace Workflows

Real-world usage scenarios with step-by-step instructions and visual examples.

## Table of Contents

- [Workflow 1: Refactoring Links Across Vault](#workflow-1-refactoring-links-across-vault)
- [Workflow 2: Bulk Date Format Update](#workflow-2-bulk-date-format-update)
- [Workflow 3: Cleaning Up Task Formatting](#workflow-3-cleaning-up-task-formatting)
- [Workflow 4: Finding Broken Links](#workflow-4-finding-broken-links)
- [Workflow 5: Content Organization with Tags](#workflow-5-content-organization-with-tags)

---

## Workflow 1: Refactoring Links Across Vault

**Scenario:** You renamed a note from "Old Project" to "New Project" and need to update all references throughout your vault.

**Challenge:** Obsidian doesn't automatically update links in all files when you rename a note. You need to find and replace all instances of `[[Old Project]]` with `[[New Project]]`.

### Step 1: Open Find-n-Replace

1. Open Command Palette: `Ctrl/Cmd+P`
2. Type "Find-n-Replace: Open"
3. Plugin opens in sidebar

**📸 Screenshot Placeholder:** `workflow-01-refactor-01-opening.png`
- Show: Command Palette with Find-n-Replace command
- Annotation: Arrow pointing to command

### Step 2: Search for Old Links

1. Click in search input field
2. Type: `[[Old Project]]`
3. Results appear automatically showing all files with this link
4. Press `Enter` to save to search history

**What you'll see:**
- Results organized by file
- Match count per file (e.g., "3 results")
- Yellow highlighting on `[[Old Project]]` in snippets
- Total results count in toolbar (e.g., "23 results in 8 files")

**📸 Screenshot Placeholder:** `workflow-01-refactor-02-search-results.png`
- Show: Search results showing multiple files with "[[Old Project]]"
- Annotation: Labels for file groups, match counts, total count
- Highlight: Yellow highlighting on matches

### Step 3: Preview Replacement

1. Click in replace input field
2. Type: `[[New Project]]`
3. Replacement preview appears on all results

**What you'll see:**
- Original text: Red strikethrough on `[[Old Project]]`
- Replacement text: Green highlight on `[[New Project]]`
- Live preview updates as you type

**📸 Screenshot Placeholder:** `workflow-01-refactor-03-preview.png`
- Show: Results with red strikethrough and green replacement preview
- Annotation: Close-up of single result showing preview
- Highlight: Color coding (red → green)

### Step 4: Review Results

1. Browse through file groups to review context
2. Click any result to navigate to that location in vault
3. Verify the replacement makes sense in context
4. Return to Find-n-Replace view

**Pro Tip:** Click different results to check context before replacing. The plugin remembers your place in the results.

**📸 Screenshot Placeholder:** `workflow-01-refactor-04-context-review.png`
- Show: Clicking a result, file opening in editor showing context
- Annotation: Arrow showing navigation action
- Highlight: Result highlighted in actual file

### Step 5: Execute Replacement

**Option A: Replace All (Recommended for this scenario)**
1. Click ellipsis menu (⋯) in toolbar
2. Select "Replace All in Vault"
3. Confirmation modal appears
4. Review summary (23 matches in 8 files)
5. Click "Replace All" button
6. Success notification appears

**Option B: File-by-File (For more control)**
1. Click ellipsis menu (⋯) on each file header
2. Select "Replace All in File"
3. Repeat for each file you want to update

**📸 Screenshot Placeholder:** `workflow-01-refactor-05-confirmation.png`
- Show: Confirmation modal with replacement summary
- Annotation: Details shown in modal (match count, file count)
- Highlight: Replace All button

### Step 6: Verify Results

After replacement:
- Results update to show "0 results" for old link
- Success notification confirms replacement count
- Files are saved automatically

**Verification:**
1. Search for `[[New Project]]` to verify new links exist
2. Search for `[[Old Project]]` to ensure no old links remain
3. Spot-check a few files to verify changes

**📸 Screenshot Placeholder:** `workflow-01-refactor-06-verification.png`
- Show: New search showing "0 results" for old link, many results for new link
- Annotation: Before/after comparison
- Highlight: Success message, updated result counts

### Workflow Summary

**Time Required:** 2-3 minutes for 23 replacements across 8 files
**Manual Alternative:** 15-20 minutes opening each file individually

**Key Takeaways:**
- Vault-wide search finds all instances instantly
- Preview prevents mistakes before execution
- Confirmation modal adds safety for bulk operations
- Verification searches confirm completeness

---

## Workflow 2: Bulk Date Format Update

**Scenario:** You've been using European date format (DD/MM/YYYY) and want to convert to US format (MM/DD/YYYY) throughout your daily notes.

**Challenge:** Manual conversion is error-prone and time-consuming with hundreds of dates.

### Step 1: Configure File Filtering

1. Click filter button (🔍) to open filter panel
2. In "files to include": Type `Daily/` (or your daily notes folder)
3. Filter button shows active indicator (badge or border)
4. This limits search to daily notes only (performance optimization)

**Why filter?**
- Faster search (fewer files to scan)
- Prevents false matches in other content
- Focused results relevant to task

**📸 Screenshot Placeholder:** `workflow-02-dates-01-filtering.png`
- Show: Filter panel expanded with "Daily/" in include field
- Annotation: Explanation of why filtering matters
- Highlight: Active filter indicator on button

### Step 2: Create Regex Pattern for European Dates

1. Enable **Use Regex** toggle (.*) - button shows accent color
2. In search input, type: `(\d{2})/(\d{2})/(\d{4})`
3. Press Enter to save pattern to history

**Pattern Explanation:**
- `\d{2}` → Exactly 2 digits (day/month)
- `/` → Literal forward slash
- `\d{4}` → Exactly 4 digits (year)
- `(` `)` → Capture groups for reordering

**Matches:** `15/01/2024`, `31/12/2023`, `07/06/2024`
**Does NOT match:** `2024-01-15`, `Jan 15, 2024`, `1/5/24` (invalid formats)

**📸 Screenshot Placeholder:** `workflow-02-dates-02-regex-search.png`
- Show: Regex toggle enabled, pattern entered, results showing dates
- Annotation: Pattern breakdown explanation
- Highlight: Captured dates in yellow

### Step 3: Define Replacement Pattern

1. In replace input, type: `$2/$1/$3`
2. Replacement preview appears on all results

**Replacement Explanation:**
- `$1` → First capture group (day: "15")
- `$2` → Second capture group (month: "01")
- `$3` → Third capture group (year: "2024")
- Reordering: `$2/$1/$3` = month/day/year

**Preview Shows:**
- Red strikethrough: `15/01/2024`
- Green replacement: `01/15/2024`
- Actual captured values displayed

**📸 Screenshot Placeholder:** `workflow-02-dates-03-replacement-preview.png`
- Show: Results with detailed preview showing capture group reordering
- Annotation: Label showing $1, $2, $3 mapping to actual values
- Highlight: Before/after for multiple date examples

### Step 4: Verify Pattern Accuracy

**Important:** Check edge cases before bulk replacement!

**Review results for:**
- Valid date conversions (15/01 → 01/15 ✓)
- No false positives (other number patterns ✗)
- All dates in expected range

**Click individual results to check context:**
- Verify dates make sense semantically
- Ensure not matching version numbers (3.2.1024 should not match)
- Check dates are in text, not code blocks

**If issues found:**
- Refine regex pattern to be more specific
- Add context to pattern (e.g., `Date: (\d{2})/(\d{2})/(\d{4})`)
- Use multi-selection to skip problematic matches

**📸 Screenshot Placeholder:** `workflow-02-dates-04-verification.png`
- Show: Clicking results to verify context in actual files
- Annotation: Examples of valid vs. edge cases
- Highlight: Context showing dates in daily note format

### Step 5: Execute Selective Replacement

**Recommended: File-by-File Approach**

For date conversions, file-by-file is safer than vault-wide:

1. Expand first file group
2. Review all matches in that file
3. Click ellipsis (⋯) on file header
4. Select "Replace All in File"
5. File updates, group shows "0 results"
6. Repeat for each file

**Why file-by-file?**
- Allows quick review of each file's context
- Easy to skip files with issues
- Can undo individual file changes if needed (Obsidian history)

**Alternative: Multi-Selection**

If some matches need skipping:
1. `Ctrl/Cmd+Click` to select specific valid dates
2. Click "Replace Selected" in toolbar
3. Only selected matches are replaced

**📸 Screenshot Placeholder:** `workflow-02-dates-05-file-by-file.png`
- Show: File header ellipsis menu with "Replace All in File" option
- Annotation: Workflow showing file-by-file progression
- Highlight: Files being marked as completed (0 results)

### Step 6: Post-Replacement Verification

**Verify conversion accuracy:**

1. Search for new format: `(\d{2})/(\d{2})/(\d{4})`
   - Should show converted dates (month first)
2. Review a sample of converted files
3. Check that original European format is gone from daily notes

**If issues found:**
- Obsidian file history: Right-click file → Show file history
- Undo individual files if needed
- Note problematic patterns for future refinement

**Success Indicators:**
- All daily note dates now in US format
- No European format dates remain in daily notes
- Dates semantically correct (no 15/01 which would be invalid MM/DD)

**📸 Screenshot Placeholder:** `workflow-02-dates-06-success.png`
- Show: Verification search showing consistent date format
- Annotation: Before/after file content comparison
- Highlight: Success metrics (files updated, dates converted)

### Workflow Summary

**Time Required:** 5-10 minutes for 200+ dates across 50 files
**Manual Alternative:** 2-3 hours of manual editing

**Key Takeaways:**
- File filtering improves performance and focus
- Regex capture groups enable complex transformations
- File-by-file replacement provides control and safety
- Preview prevents bulk errors before execution
- Pattern testing critical for date conversions

---

## Workflow 3: Cleaning Up Task Formatting

**Scenario:** Your vault has inconsistent task formatting. Some tasks use `- [ ]`, others use `* [ ]`, and some have extra spaces. You want to standardize to GitHub-style `- [ ]` format.

**Challenge:** Tasks are scattered across hundreds of notes with various formatting styles.

### Step 1: Find All Task Variations

First, find all existing task formats using regex:

1. Enable **Use Regex** toggle
2. Search for: `^[-*]\s*\[\s*\]\s*`
3. Results show all task checkboxes regardless of format

**Pattern Explanation:**
- `^` → Start of line
- `[-*]` → Dash or asterisk
- `\s*` → Zero or more spaces
- `\[` → Literal left bracket
- `\s*` → Zero or more spaces (inside brackets)
- `\]` → Literal right bracket
- `\s*` → Zero or more spaces after bracket

**Matches:**
- `- [ ]` ✓ (already correct)
- `* [ ]` ✓ (needs fixing)
- `-  [ ]` ✓ (extra space before bracket)
- `-[ ]` ✓ (missing space)
- `- []` ✓ (missing spaces inside)

**📸 Screenshot Placeholder:** `workflow-03-tasks-01-search-variations.png`
- Show: Results showing various task formatting styles
- Annotation: Examples of different formats being matched
- Highlight: Pattern matching inconsistent spacing

### Step 2: Design Standardized Format

**Goal:** Convert all variations to standard GitHub format: `- [ ] `
(Note: space after closing bracket)

**Regex Pattern with Capture:**
- Search: `^[-*]\s*\[\s*\]\s*(.+)$`
- Replace: `- [ ] $1`

**Why capture the task text?**
- `(.+)` → Captures everything after checkbox
- `$1` → Preserves task text in replacement
- Prevents losing task content

**Result:**
```
Before:  * [ ]Buy groceries
After:   - [ ] Buy groceries

Before:  -  [ ]  Call dentist
After:   - [ ] Call dentist

Before:  -[ ]Write documentation
After:   - [ ] Write documentation
```

**📸 Screenshot Placeholder:** `workflow-03-tasks-02-standardization-pattern.png`
- Show: Regex pattern with capture group and replacement preview
- Annotation: Explanation of $1 capture preservation
- Highlight: Before/after for multiple format variations

### Step 3: Review Task Context

**Important:** Verify tasks are actual checklist items, not:
- Code examples showing checkbox syntax
- Quotes or references to tasks
- Table cells containing checkboxes

**Review Process:**
1. Browse through file groups
2. Click results to check context
3. Look for:
   - Tasks in actual task lists ✓
   - Code blocks with task examples ✗
   - Documentation about tasks ✗

**Handling False Positives:**
1. Use multi-selection to deselect problematic matches
2. Or exclude files with code examples using filters:
   - "files to exclude": `Templates/, Documentation/`

**📸 Screenshot Placeholder:** `workflow-03-tasks-03-context-review.png`
- Show: Examples of valid tasks vs. code block false positives
- Annotation: Identifying actual tasks vs. examples
- Highlight: Context helping distinguish real tasks

### Step 4: Multi-Select Strategy

If you have many false positives, use multi-selection:

1. Review all results
2. `Ctrl/Cmd+Click` to select only valid task format fixes
3. Deselect any code examples or documentation
4. Selection count shows "X selected" in toolbar
5. Click "Replace Selected"

**Multi-Selection Benefits:**
- Precise control over which matches to replace
- Skip problematic files without excluding them entirely
- Visual feedback with purple selection highlighting
- Selections persist while editing replace pattern

**📸 Screenshot Placeholder:** `workflow-03-tasks-04-multi-selection.png`
- Show: Multiple results selected (purple background), others unselected
- Annotation: Selection count in toolbar, Ctrl/Cmd+Click indicator
- Highlight: Valid tasks selected, code examples deselected

### Step 5: Execute Replacement

**Recommended: Replace Selected**
(After multi-selection strategy)

1. Verify selection count matches expected valid tasks
2. Double-check replace preview on selected items
3. Click "Replace Selected" button
4. Success notification shows count

**Alternative: Replace All in Vault**
(If confident no false positives)

1. Click ellipsis menu (⋯) → "Replace All in Vault"
2. Confirmation modal shows count
3. Review summary
4. Click "Replace All"

**📸 Screenshot Placeholder:** `workflow-03-tasks-05-execution.png`
- Show: Replace Selected button with selection count
- Annotation: Preview verification before clicking
- Highlight: Success notification after replacement

### Step 6: Verify Standardization

**Verification Searches:**

1. **Check new format exists:**
   - Search: `^- \[ \] `
   - Should show all standardized tasks

2. **Check old formats are gone:**
   - Search: `^\* \[ \]`
   - Should show 0 results
   - Search: `^- {2,}\[ \]` (multiple spaces)
   - Should show 0 results

3. **Spot-check files:**
   - Open a few files and verify task formatting
   - Ensure tasks still function as checkboxes

**Success Indicators:**
- Consistent `- [ ]` format across vault
- Tasks still functional (checkable in preview mode)
- No broken formatting or lost content

**📸 Screenshot Placeholder:** `workflow-03-tasks-06-verification.png`
- Show: Verification searches showing 0 results for old formats
- Annotation: Before/after file content comparison
- Highlight: Standardized task format consistency

### Workflow Summary

**Time Required:** 10-15 minutes for 500+ tasks across 100 files
**Manual Alternative:** Several hours of manual reformatting

**Key Takeaways:**
- Regex patterns match format variations comprehensively
- Capture groups preserve task content during replacement
- Multi-selection provides surgical precision
- Context review prevents false positives in code/documentation
- Multiple verification searches ensure complete standardization

---

## Workflow 4: Finding Broken Links

**Scenario:** You want to audit all external links in your vault to verify they're still valid and not broken.

**Challenge:** Manually finding and checking every URL in hundreds of notes is impractical.

### Step 1: Search for All External Links

Find all markdown links with external URLs:

1. Enable **Use Regex** toggle
2. Search: `\[([^\]]+)\]\((https?://[^)]+)\)`
3. Results show all external links with display text and URL

**Pattern Explanation:**
- `\[` → Literal left bracket
- `([^\]]+)` → Capture display text (anything except ])
- `\]` → Literal right bracket
- `\(` → Literal opening paren
- `(https?://[^)]+)` → Capture URL (http:// or https:// + anything except ))
- `\)` → Literal closing paren

**Matches:**
- `[Google](https://google.com)` ✓
- `[Documentation](http://example.com/docs)` ✓
- `[GitHub Repo](https://github.com/user/repo)` ✓

**Does NOT match:**
- `[[Internal Link]]` (wikilinks)
- `[Local](file:///path)` (file:// URLs)
- `https://example.com` (bare URLs without markdown)

**📸 Screenshot Placeholder:** `workflow-04-links-01-search.png`
- Show: Results showing various external links captured
- Annotation: Pattern explanation with capture groups highlighted
- Highlight: Display text and URLs identified separately

### Step 2: Export Links for Review

**Goal:** Create a list of all URLs to check externally

**Manual Export Method:**
1. Browse through results
2. Click each result to navigate to that location
3. Copy URL from file
4. Test in browser

**Better Approach:** Use capture groups for extraction:

1. Leave search pattern as-is (captures URL)
2. In replace field, type: `- [ ] $1 - $2`
   - `$1` = Display text
   - `$2` = URL
3. Preview shows formatted checklist

**Result Preview:**
```
Before:  [Google](https://google.com)
Preview: - [ ] Google - https://google.com

Before:  [Docs](https://example.com/docs)
Preview: - [ ] Docs - https://example.com/docs
```

**📸 Screenshot Placeholder:** `workflow-04-links-02-extraction-preview.png`
- Show: Replacement preview showing checklist format with extracted URLs
- Annotation: Explanation of capture group reuse
- Highlight: Formatted checklist making URLs visible

### Step 3: Create Audit Note

**Creating a Link Audit Checklist:**

1. Create new note: "Link Audit - [Date]"
2. Return to Find-n-Replace view
3. Perform "Replace All in Vault" or file-by-file
4. Copy resulting checklist format from files
5. Paste into audit note
6. Undo replacements in actual files (you just wanted extraction)

**Alternative: Use Multi-Selection for Subset:**
1. Select specific files or matches you want to audit
2. "Replace Selected" to create checklist format in those files only
3. Copy formatted lists to audit note
4. Undo changes in original files

**Result:** Centralized checklist of all external links for validation

**📸 Screenshot Placeholder:** `workflow-04-links-03-audit-note.png`
- Show: New note with formatted checklist of links
- Annotation: Workflow showing extraction to centralized note
- Highlight: Checklist format ready for validation

### Step 4: Identify Link Patterns

**Analyzing Results for Patterns:**

Browse results to identify:
- **Domain-based grouping:** All links to specific websites
- **Broken pattern suspects:** Links with unusual formats
- **Outdated domains:** Old company names, defunct services
- **Redirect candidates:** Short URLs, bit.ly links

**Using File Filtering for Pattern Analysis:**

1. Search for specific domain: `\[([^\]]+)\]\((https://github\.com[^)]+)\)`
2. Results show only GitHub links
3. Repeat for other domains

**Common Patterns to Check:**
- `github.com` → Verify repos still exist
- `medium.com` → Check for paywalls
- `bit.ly` → Short URLs may be expired
- Company domains → Verify company still exists

**📸 Screenshot Placeholder:** `workflow-04-links-04-pattern-analysis.png`
- Show: Results filtered by domain showing pattern clustering
- Annotation: Examples of different domain patterns found
- Highlight: Potential problem links (bit.ly, old domains)

### Step 5: Update or Fix Broken Links

**For Broken Links Found:**

**Strategy A: Remove Link (Keep Text)**
1. Search: `\[([^\]]+)\]\(https://broken-site\.com[^)]+\)`
2. Replace: `$1`
3. Result: Keeps display text, removes broken link

**Strategy B: Update URL**
1. Search: `\[([^\]]+)\]\(https://old-domain\.com([^)]+)\)`
2. Replace: `[$1](https://new-domain.com$2)`
3. Result: Updates domain, preserves path and display text

**Strategy C: Add Warning**
1. Search: `\[([^\]]+)\]\((https://broken-site\.com[^)]+)\)`
2. Replace: `[⚠ $1]($2) (link may be broken)`
3. Result: Adds warning indicator for review

**📸 Screenshot Placeholder:** `workflow-04-links-05-fixing.png`
- Show: Example of each strategy with before/after
- Annotation: Different approaches for different scenarios
- Highlight: Pattern flexibility for various fixes

### Step 6: Document Audit Results

**Creating Audit Summary:**

After auditing, document findings:
- Total external links found: (count from results)
- Broken links identified: (count)
- Links updated: (count)
- Links removed: (count)
- Domains flagged for monitoring: (list)

**Maintenance Strategy:**
- Run quarterly link audits
- Save successful search patterns to history
- Document regex patterns in vault for reuse
- Create note template for audit process

**📸 Screenshot Placeholder:** `workflow-04-links-06-summary.png`
- Show: Audit summary note with statistics and findings
- Annotation: Reusable audit process documented
- Highlight: Patterns saved to history for future audits

### Workflow Summary

**Time Required:** 30-45 minutes for comprehensive audit of 200+ links
**Manual Alternative:** Several hours of manual searching and checking

**Key Takeaways:**
- Regex patterns extract both display text and URLs
- Capture groups enable data extraction and transformation
- Pattern-based analysis reveals systematic issues
- Multiple replacement strategies for different scenarios
- Documented process enables repeatable audits

---

## Workflow 5: Content Organization with Tags

**Scenario:** You want to reorganize tags from inline format (`#tag`) to a structured format using tag properties or wikilinks (`[[tags/tag]]`).

**Challenge:** Hundreds of notes use inline hashtags that you want to convert to a more structured format for better organization and querying.

### Step 1: Audit Current Tag Usage

First, find all inline tags to understand scope:

1. Enable **Use Regex** toggle
2. Search: `#([a-z0-9-]+)`
3. Results show all hashtags with tag name captured

**Pattern Explanation:**
- `#` → Literal hashtag
- `([a-z0-9-]+)` → Capture group: letters, numbers, hyphens
- Captures: `#project`, `#in-progress`, `#todo`
- Ignores: `#CamelCase`, `#With Spaces` (if you want those, adjust pattern)

**What You'll See:**
- All inline tags across vault
- Tag names in context
- Frequency by file

**📸 Screenshot Placeholder:** `workflow-05-tags-01-audit.png`
- Show: Search results showing various inline tags
- Annotation: Different tag patterns being matched
- Highlight: Captured tag names (without #)

### Step 2: Define Tag Structure

**Decision: Choose Your Tag Format**

**Option A: Wikilink Format**
- Original: `#projectname`
- New: `[[tags/projectname]]`
- Benefits: Clickable links, centralized tag pages

**Option B: Dataview/Properties Format**
- Original: `#projectname`
- New: Frontmatter property or inline field
- Benefits: Queryable with Dataview plugin

**Option C: Hierarchical Tags**
- Original: `#projectname`
- New: `#projects/projectname`
- Benefits: Nested organization

**This workflow demonstrates Option A (wikilinks):**

**📸 Screenshot Placeholder:** `workflow-05-tags-02-format-decision.png`
- Show: Side-by-side comparison of three tag format options
- Annotation: Benefits of each approach
- Highlight: Wikilink format selected for this workflow

### Step 3: Convert Tags to Wikilinks

**Regex Replacement:**

1. Search: `#([a-z0-9-]+)`
2. Replace: `[[tags/$1]]`
3. Preview shows conversion

**Examples:**
```
Before:  #projectname
Preview: [[tags/projectname]]

Before:  #in-progress
Preview: [[tags/in-progress]]

Before:  #todo
Preview: [[tags/todo]]
```

**Why `tags/` prefix?**
- Organizes all tag pages in single folder
- Separates tags from regular content notes
- Enables consistent linking structure

**📸 Screenshot Placeholder:** `workflow-05-tags-03-conversion-preview.png`
- Show: Results with conversion preview (red strikethrough → green wikilink)
- Annotation: Capture group $1 preserving tag name
- Highlight: Structured tag format in preview

### Step 4: Handle Edge Cases

**Common Edge Cases:**

**Issue 1: Tags in Code Blocks**
- Code examples showing `#tag` syntax
- Should NOT be converted

**Solution:** Exclude code-heavy files
```
files to exclude: Templates/, Documentation/, Development/
```

**Issue 2: Tags in URLs**
- URLs containing `#anchor` or `#section`
- Should NOT be converted

**Solution:** Refine pattern to avoid URLs
```
Search: (?<!http)(?<!https)#([a-z0-9-]+)
(negative lookbehind to exclude URLs)
```

**Issue 3: Multi-word Tags**
- Current pattern only matches `#multi-word-with-hyphens`
- Doesn't match `#multi word` (spaces not in character class)

**Solution:** If you use spaced tags, expand pattern:
```
Search: #([a-z0-9-\s]+)
(adds \s for spaces)
```

**📸 Screenshot Placeholder:** `workflow-05-tags-04-edge-cases.png`
- Show: Examples of edge cases (code blocks, URLs)
- Annotation: Identifying what should/shouldn't be converted
- Highlight: Refined pattern excluding false positives

### Step 5: Selective Conversion

**Strategy: File-by-File with Review**

Recommended approach for tag conversion:

1. Start with single file group
2. Expand to review all matches in context
3. Click ellipsis on file header → "Replace All in File"
4. Verify file still renders correctly
5. Move to next file

**Why file-by-file?**
- Catch edge cases before they propagate
- Verify wikilinks work as expected
- Easy to undo single file if issues
- Build confidence before scaling

**Alternative: Phase-based Approach**

1. **Phase 1:** Convert in project notes (`Projects/` folder)
2. **Phase 2:** Convert in daily notes (`Daily/` folder)
3. **Phase 3:** Convert in remaining files

Use file filtering to process each phase:
```
files to include: Projects/
(Process this folder, then move to next)
```

**📸 Screenshot Placeholder:** `workflow-05-tags-05-selective-conversion.png`
- Show: File-by-file replacement workflow with phase-based filtering
- Annotation: Progress through file groups
- Highlight: Filter settings showing phased approach

### Step 6: Create Tag Index

**Building Tag Navigation Structure:**

After conversion, create tag index note:

1. Create note: `tags/index.md`
2. Search converted tags: `\[\[tags/([^\]]+)\]\]`
3. Create list of all unique tags

**Enhanced: Automated Tag Index**

Use Find-n-Replace to extract unique tags:

1. Search: `\[\[tags/([^\]]+)\]\]`
2. Results show all tag wikilinks
3. Manually compile unique tag names
4. Create bullet list in index note

**Result:**
```markdown
# Tag Index

- [[tags/projectname]]
- [[tags/in-progress]]
- [[tags/todo]]
- [[tags/completed]]
```

**Pro Tip:** Each tag becomes a clickable note. Create those notes with:
- Description of tag purpose
- Dataview query showing all notes with this tag
- Related tags

**📸 Screenshot Placeholder:** `workflow-05-tags-06-index.png`
- Show: Created tag index note with organized tag structure
- Annotation: Tag pages with backlinks visible
- Highlight: Hierarchical tag folder organization

### Workflow Summary

**Time Required:** 20-30 minutes for 300+ tags across 100 files
**Manual Alternative:** 4-5 hours of manual find-and-replace per file

**Key Takeaways:**
- Tag reorganization enables better content structure
- Capture groups preserve tag names during conversion
- Edge case handling prevents false conversions
- Phase-based approach manages risk and complexity
- Wikilink format creates navigable tag system
- Tag index provides centralized tag management

---

## General Workflow Tips

### Planning Your Workflow

Before starting any bulk operation:

1. **Understand scope:** How many files will be affected?
2. **Test pattern:** Verify regex on single file first
3. **Create backup:** Git commit or vault backup before major changes
4. **Plan verification:** How will you confirm success?
5. **Document process:** Save patterns to history for reuse

### Safety Best Practices

- **Start small:** Test on single file or folder first
- **Use preview:** Always review red→green preview before replacing
- **Enable confirmations:** Keep "Confirm Destructive Actions" on
- **Incremental changes:** File-by-file instead of vault-wide when uncertain
- **Verify immediately:** Check results right after replacement
- **Keep history:** Use Git or backup plugin for undo capability

### Performance Optimization

For large vaults:
- **Use file filtering:** Limit scope to relevant folders/types
- **Reduce max results:** Settings → Max Results: 500-1000
- **Increase debounce:** Settings → Debounce Delay: 500ms
- **Batch operations:** Process folders sequentially instead of all at once

### Reusable Patterns

Save time by reusing successful patterns:
- **Search history:** Press Enter to save patterns (accessible with ↑↓)
- **Document patterns:** Create note with frequently used regex
- **Share patterns:** Export successful patterns for team/community
- **Iterate patterns:** Refine saved patterns based on experience

---

**Next Steps:**
- Master [Tips & Tricks](TIPS_AND_TRICKS.md) for power user features
- Review [User Guide](USER_GUIDE.md) for detailed feature documentation
- Join discussions to share your workflows with the community

---

*Workflows Version 1.0.0 - Last updated: 2025-10-13*
