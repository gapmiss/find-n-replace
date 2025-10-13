# Find-n-Replace - Obsidian Plugin

## Project Overview

**Plugin Name:** Find-n-Replace
**Type:** Obsidian.md Plugin
**Purpose:** VSCode-style vault-wide find and replace functionality with advanced search options
**Architecture:** TypeScript-based modular architecture with clean separation of concerns

## Branding and Terminology

**Design Decision:** This plugin intentionally uses dual terminology - "Find" in the name and "Search" in the operations.

**Rationale:**
- **Plugin Name:** "Find-n-Replace" follows established industry patterns from tools like VSCode ("Find in Files"), Sublime Text ("Find & Replace"), and other professional editors
- **Operation Names:** The UI and internal operations use "search" terminology (search input, search options, search engine)
- **Semantic Distinction:** "Find" represents the feature/discovery capability, while "search" describes the specific operation being performed
- **User Understanding:** This mirrors how users think about the feature: "I want to **find** content" (goal) → "I'll **search** for a pattern" (action)

**Industry Pattern:**
- **VSCode:** Feature is "Find in Files" but uses "Search Editors" and "Search Results"
- **Sublime Text:** Feature is "Find & Replace" but operations are "searching"
- **IntelliJ IDEA:** Feature is "Find in Path" but shows "Search Results"

**Documentation Approach:**
This duality is intentionally preserved and clarified in user-facing documentation (README, Help Modal) to bridge both perspectives without forcing artificial consistency that would contradict established software patterns.

## Core Functionality

- **Vault-wide search** across all text files (markdown, txt, js, css, json, and any text-based format) with comprehensive file filtering
- **Universal file type support** - searches all file types by default, not limited to markdown
- **Advanced replace operations** (individual, file-level, vault-wide, selected)
- **Search options:** Match case, whole word, regex support with multiline patterns and capture group expansion
- **VSCode-style UI** with sidebar view, expandable filter panel, and result navigation
- **File filtering system** with extensions, folders, and glob patterns for large vault performance
- **Multi-selection** for targeted replacements with visual feedback
- **Real-time preview** of replacement results with regex capture group support
- **Complete keyboard accessibility** with sequential tab order and command palette integration
- **Search history** with ↑↓ arrow key navigation (VSCode-style)
- **Clear-input buttons** for all text inputs with contextual visibility
- **Comprehensive error handling** and user feedback with professional logging system

## Architecture Overview

### Directory Structure
```
src/
├── core/               # Business logic layer
│   ├── searchEngine.ts     # Search operations and regex handling
│   ├── replacementEngine.ts # File modification and replacement logic
│   ├── fileOperations.ts   # File system operations and navigation
│   └── historyManager.ts   # Search/replace history with LRU cache
├── ui/                 # User interface layer
│   ├── views/
│   │   └── findReplaceView.ts # Main plugin coordinator (~800 lines)
│   └── components/
│       ├── searchToolbar.ts   # UI creation and layout (358 lines)
│       ├── actionHandler.ts   # Event handling and replace operations (300+ lines)
│       ├── searchController.ts # Search logic and state management (285 lines)
│       ├── historyNavigator.ts # ↑↓ arrow key history navigation
│       ├── renderer.ts        # UI rendering and DOM manipulation
│       ├── selectionManager.ts # Multi-selection functionality
│       └── navigationHandler.ts # Keyboard navigation
├── types/              # TypeScript type definitions
├── utils/              # Shared utilities (logger.ts, helpers.ts)
├── settings/           # Configuration management
├── modals/            # User interaction dialogs (helpModal.ts, confirmModal.ts)
└── main.ts            # Plugin entry point
```

### Key Components

#### 1. **SearchEngine** (`src/core/searchEngine.ts`)
- Performs vault-wide search operations with regex compilation and caching
- Batch processing (10 files) to maintain UI responsiveness
- File filtering with extensions, folders, and glob patterns
- Graceful error handling for file read failures

#### 2. **ReplacementEngine** (`src/core/replacementEngine.ts`)
- Handles all file modification operations with atomic file operations
- **CRITICAL:** Contains infinite loop protection for zero-length regex matches
- Regex replacement expansion with capture groups ($1, $&, etc.)
- Security: Timeout protection against ReDoS attacks (5-second limit)

#### 3. **FindReplaceView** (`src/ui/views/findReplaceView.ts`)
- Main plugin interface extending Obsidian's ItemView
- VSCode-style search and replace UI with real-time result rendering
- Search cancellation with AbortController and debounced auto-search
- Comprehensive error boundaries for all async operations

#### 4. **SearchToolbar** (`src/ui/components/searchToolbar.ts`)
- Creates all UI elements (search input, replace input, toggle buttons, adaptive toolbar)
- **Clear-input buttons** for all text inputs with contextual visibility
- **History navigation** - ↑↓ arrow keys attached to search/replace inputs
- **VSCode-style expandable filter panel** with "files to include" / "files to exclude" inputs
- **Session-only filter management** - filters don't modify settings; settings provide defaults
- Complete keyboard navigation and accessibility support including filter panel

#### 5. **HistoryManager** (`src/core/historyManager.ts`)
- LRU cache for search and replace patterns (default: 50 entries each)
- Persistent storage in plugin settings across sessions
- Deduplication prevents consecutive identical entries
- Respects user preferences (enabled/disabled, max size)
- History saved on Enter key press (not auto-search)

## Major Recent Improvements (Condensed)

### Critical Security & Bug Fixes
1. **Infinite Loop Protection** - Zero-length regex matches with timeout protection
2. **Resource Management** - Memory leak prevention with dispose() methods
3. **Search Concurrency** - Fixed race conditions with serialized search execution
4. **Second Match Replacement Bug** - Fixed individual replacement of matches beyond first on same line

### UI/UX Enhancements
5. **Clear-Input Buttons** - Contextual X buttons for all text inputs with professional styling
6. **VSCode-Style File Filtering** - Complete redesign matching VSCode's "files to include" / "files to exclude" interface
7. **Session-Only Filters** - Filter inputs don't modify settings; settings provide defaults when opening view
8. **Complete Help Modal** - In-plugin documentation with individual `<kbd>` tags and comprehensive filtering guide
9. **Keyboard Navigation** - Sequential tab order throughout entire interface including filter panel
10. **Native Obsidian Menu Integration** - Professional dropdown menus using Obsidian's Menu class
11. **Multiline Search Support** - Cross-line regex patterns with `\n`, anchors, and full replacement preview
12. **Persistent Selections** - Match selections preserved when replace text changes, improving UX workflow
13. **Search History** - VSCode-style ↑↓ navigation with LRU cache, Enter-to-save, and settings UI

### Architecture Improvements
13. **Component Extraction** - Refactored monolithic view into focused components
14. **VSCode-Style Settings Migration** - Unified "files to include" / "files to exclude" pattern with automatic migration from old 4-setting structure
15. **SessionFilters Interface** - Clean separation between session-only filters and persistent settings
16. **Multiline Search Engine** - Complete multiline regex implementation with content-aware replacement
17. **Comprehensive Testing** - 105 total tests (44 new multiline + existing suite) preventing regressions
18. **Professional Logging** - 6-level system (SILENT to TRACE) with clean console by default
19. **Scoped CSS** - All styling prefixed with view selector to prevent global conflicts
20. **History Management** - Configurable max size (10-200), enable/disable toggle, clear all button in settings

## Code Audit & Quality Improvements (Latest)

### Enterprise-Grade Reliability Achieved ✅
**MILESTONE:** Complete code audit conducted with all critical issues resolved, achieving **100% test pass rate** and enterprise-grade reliability standards.

### Critical Fixes Implemented
20. **Test Suite Reliability** - Fixed all 34 failing tests, achieving 100% pass rate (296/296 tests)
21. **Enhanced Error UX** - Added comprehensive user notifications for search timeouts and partial failures
22. **Smart Failure Reporting** - Users now receive detailed feedback when files are inaccessible during search
23. **Regex Timeout Notifications** - Clear user alerts when regex patterns are too complex or cause timeouts
24. **Improved Mock Infrastructure** - Enhanced test reliability with comprehensive file type coverage and proper DOM API mocking
25. **Logger Defensive Programming** - Null-safe settings access with fallback to ERROR level
26. **Test Isolation** - MockPlugin creates fresh instances to prevent state leakage between tests

### User Experience Enhancements
25. **Partial Search Failure Alerts** - Intelligent notifications showing which files couldn't be accessed, with different messaging for small vs. large failure counts
26. **Timeout Protection UX** - User-friendly messages when regex execution times out, suggesting pattern simplification
27. **Universal File Type Support** - Default search includes ALL text-based file types (.md, .txt, .js, .ts, .css, .json, .yaml, .xml, etc.) when no filters specified, making the plugin useful beyond just markdown workflows
28. **Session Filter Reliability** - Updated filter system ensures consistent behavior across all file types and search scenarios

### Testing Infrastructure Improvements
27. **Complete Mock Data Coverage** - Added comprehensive test files covering all supported file types (.txt, .js, .json, .css, .tmp, .bak)
28. **Enhanced DOM API Mocking** - Fixed help modal and UI component tests with proper `insertAdjacentText` and related DOM methods
29. **Robust Test File Management** - Improved `addTestFile` functionality and resolved circular call issues in test infrastructure
30. **Unified Session Filters** - Migrated all file filtering tests to use modern session filter system instead of deprecated settings structure
31. **Fresh Mock Instances** - MockPlugin deep copies arrays/objects to prevent shared state across tests
32. **HistoryManager Integration** - MockPlugin automatically initializes HistoryManager for component tests

## Development Guidelines

### Code Quality Standards
- **TypeScript:** Strict typing, no `any` usage
- **Error Handling:** Every async operation must have error boundaries
- **Resource Management:** All components must implement dispose() methods
- **Performance:** File operations in batches, UI responsiveness maintained
- **Security:** Regex timeout protection, input validation

### Testing Strategy
- **Test Framework:** Vitest 2025 with comprehensive isolated unit testing
- **Test Coverage:** 296 tests across 20 test suites targeting core functionality (100% pass rate)
- **Bug Prevention:** Specific regression tests for known issues with complete audit verification
- **Property-Based Testing:** Fast-check integration for edge case discovery
- **Quality Assurance:** Enterprise-grade test reliability with comprehensive mock infrastructure and proper test isolation

### Build Commands
- **Development:** `npm run dev` - Continuous development build with watching
- **Production:** `npm run build` - TypeScript compilation + production bundle
- **Testing:** `npm test` - Complete test suite (296 tests, 100% pass rate)
- **Coverage:** `npm run test:coverage` - Generate coverage reports

### Release Process

The project includes an automated release script (`release.mjs`) that handles version bumping, building, tagging, and GitHub release creation.

**Prerequisites:**
- Clean git working tree (no uncommitted changes)
- GitHub CLI (`gh`) installed for automatic GitHub release creation (optional): https://cli.github.com/
- Push access to the GitHub repository

**Release Commands:**
```bash
# Patch release (0.1.0 → 0.1.1) - Bug fixes, minor changes
node release.mjs patch

# Minor release (0.1.0 → 0.2.0) - New features, backward compatible
node release.mjs minor

# Major release (0.1.0 → 1.0.0) - Breaking changes
node release.mjs major
```

**What the Release Script Does:**

1. **Pre-flight Checks:**
   - Verifies git working tree is clean (fails if uncommitted changes exist)
   - Validates version type argument (patch/minor/major)

2. **Version Updates:**
   - Updates version in `package.json`
   - Synchronizes version in `manifest.json`
   - Adds new version entry to `versions.json` with minimum Obsidian version (0.15.0)

3. **Build:**
   - Runs `npm run build` to compile production bundle
   - Generates `main.js`, `manifest.json`, `styles.css` in root directory

4. **Git Operations:**
   - Stages changed files: `package.json`, `manifest.json`, `versions.json`, `main.js`, `styles.css`
   - Creates commit: `chore: release X.Y.Z`
   - Creates git tag: `X.Y.Z`
   - Pushes commit and tag to GitHub

5. **GitHub Release (if GitHub CLI installed):**
   - Creates GitHub Release with tag
   - Attaches release assets: `main.js`, `manifest.json`, `styles.css`
   - Generates changelog link comparing to previous tag
   - Adds release notes with version and full changelog URL

**Rollback on Failure:**
- If any step fails, version changes in `package.json`, `manifest.json`, and `versions.json` are automatically rolled back
- Git operations are atomic - if commit/tag/push fails, no changes are persisted

**Example Workflow:**
```bash
# 1. Ensure all changes are committed
git status  # Should show clean working tree

# 2. Run tests to verify everything works
npm test

# 3. Create a patch release
node release.mjs patch

# Output:
# 📦 Updated package.json version: 1.0.0 → 1.0.1
# 📋 Updated manifest.json version: 1.0.0 → 1.0.1
# 📋 Updated versions.json version: 1.0.0 → 1.0.1
# 🔨 Starting project build...
# ✅ Build completed
# ✅ Commit created: chore: release 1.0.1
# 🏷️ Tag created: 1.0.1
# 🚀 Changes pushed to GitHub
# 📦 Creating GitHub Release...
# ✅ GitHub Release created: 1.0.1
# 🎉 Release 1.0.1 completed successfully!
```

**Manual Release (without script):**

If you need to create a release manually:

1. Update versions in `package.json`, `manifest.json`, and `versions.json`
2. Run `npm run build`
3. Commit changes: `git commit -am "chore: release X.Y.Z"`
4. Create tag: `git tag X.Y.Z`
5. Push: `git push && git push --tags`
6. Create GitHub Release manually and attach `main.js`, `manifest.json`, `styles.css`

**Troubleshooting:**

- **"Cannot proceed with release: You have uncommitted changes"**
  - Commit or stash your changes before running release script

- **"Build process failed"**
  - Fix build errors and re-run release script
  - Versions will be rolled back automatically

- **"Failed to create GitHub Release"**
  - Install GitHub CLI: https://cli.github.com/
  - Or create release manually on GitHub
  - Commit and tag are still created successfully

- **Need to undo a release:**
  - Delete local tag: `git tag -d X.Y.Z`
  - Delete remote tag: `git push origin :refs/tags/X.Y.Z`
  - Delete GitHub release from repository releases page
  - Reset to previous commit: `git reset --hard HEAD~1`
  - Force push: `git push --force`

## Plugin Integration

### Obsidian API Usage
- **View System:** Extends ItemView for sidebar integration
- **File System:** Uses app.vault.read/modify for file operations
- **Commands:** 13 comprehensive commands for all plugin actions including multiline toggle
- **Settings:** Standard Obsidian settings architecture with migration support

### Key Features for Users
- **Universal File Type Support:** Searches all text-based files by default (.md, .txt, .js, .css, .json, .ts, .yaml, .xml, etc.) - not limited to markdown
- **VSCode-Style File Filtering:** "files to include" / "files to exclude" inputs with familiar pattern syntax and session-only behavior
- **Settings as Defaults:** Plugin settings populate filter inputs when opening view; changes are temporary
- **Multi-Selection:** Targeted replacements with visual feedback and individual `<kbd>` tag styling
- **Regex Support:** Full capture group support with live preview including multiline patterns
- **Multiline Search:** Cross-line regex patterns with `\n`, `^$` anchors, and multiline replacement preview
- **Keyboard Shortcuts:** Complete command palette integration with visual help documentation
- **Help System:** Built-in documentation with hotkey detection and individual key styling for professional appearance

## Troubleshooting

### Common Issues
1. **Search returns no results** - Check file extension filters and folder settings
2. **Performance problems** - Use file filtering to limit search scope
3. **Regex patterns not working** - Validate syntax and escape special characters
4. **Individual replacement issues** - All modes now work reliably after bug fixes

### Debug Tools
- **Logger:** 6-level logging system (Silent to Trace) for granular debugging with null-safe settings access
- **Console Output:** Clean by default, comprehensive when debugging enabled
- **Test Suite:** Run `npm test` to verify functionality (296 tests, 100% reliable)
- **Error Notifications:** Built-in user alerts for timeouts and file access issues
- **Failure Tracking:** Detailed reporting of partial search failures with actionable feedback

## Future Enhancement Opportunities

### High Priority
1. **Virtual Scrolling** for large result sets (>1000 results)
2. **Result Streaming** for progressive display
3. **Bundle Size Optimization** with code splitting

### Medium Priority
1. **Advanced Search Filters** (date range, content filters)
2. **Search History** and pattern management
3. **Export/Import** of search configurations

## Multiline Search Implementation

### Technical Architecture
- **SearchEngine Enhancement:** Added multiline flag detection and content-aware processing
- **Dual Processing Paths:** Line-by-line for performance vs. full-content for multiline patterns
- **Regex Flag Management:** Automatic `'m'` flag addition when multiline mode enabled
- **Position Calculation:** Character-to-line/column conversion for accurate result positioning

### Replacement Engine Updates
- **Content-Aware Replacement:** Detects multiline mode and processes entire file content vs. line-by-line
- **Character Position Mapping:** Helper methods for converting between line/col and character positions
- **Multiline Preview Generation:** Full matchText processing for accurate replacement preview
- **Capture Group Support:** Complete `$1`, `$&`, `$'` expansion for multiline patterns

### UI Integration
- **Toggle Button:** VSCode-style multiline toggle with wrap-text icon and accessibility
- **Auto-Search Triggers:** Automatic search refresh when multiline state changes
- **Preview Rendering:** Truncated multiline preview display with hover tooltips for full content
- **Visual Indicators:** Clear indication of multiline matches in results list

### Testing Coverage
- **44 Multiline Tests:** Comprehensive test suite covering search, replacement, and UI scenarios
- **Edge Case Coverage:** Anchors, capture groups, complex patterns, performance limits
- **100% Pass Rate:** All multiline functionality thoroughly validated

This plugin represents a mature, production-ready implementation with enterprise-grade error handling, performance optimization, and security considerations. The modular architecture supports easy maintenance and feature enhancement while maintaining stability and user experience quality.

**QUALITY ASSURANCE:** Following a comprehensive code audit, this plugin has achieved 100% test reliability (296/296 tests passing) with enhanced error handling, user notifications, bulletproof search functionality, and robust test isolation. The codebase meets enterprise standards for production deployment.

Full backup available in `CLAUDE_FULL_BACKUP.md`.