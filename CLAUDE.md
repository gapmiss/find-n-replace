# Find-n-Replace - Obsidian Plugin

## Project Overview

**Plugin Name:** Find-n-Replace
**Type:** Obsidian.md Plugin
**Purpose:** VSCode-style vault-wide find and replace functionality with advanced search options
**Architecture:** TypeScript-based modular architecture with clean separation of concerns

## Core Functionality

- **Vault-wide search** across all markdown files with comprehensive file filtering
- **Advanced replace operations** (individual, file-level, vault-wide, selected)
- **Search options:** Match case, whole word, regex support with multiline patterns and capture group expansion
- **VSCode-style UI** with sidebar view, expandable filter panel, and result navigation
- **File filtering system** with extensions, folders, and glob patterns for large vault performance
- **Multi-selection** for targeted replacements with visual feedback
- **Real-time preview** of replacement results with regex capture group support
- **Complete keyboard accessibility** with sequential tab order and command palette integration
- **Clear-input buttons** for all text inputs with contextual visibility
- **Comprehensive error handling** and user feedback with professional logging system

## Architecture Overview

### Directory Structure
```
src/
├── core/               # Business logic layer
│   ├── searchEngine.ts     # Search operations and regex handling
│   ├── replacementEngine.ts # File modification and replacement logic
│   └── fileOperations.ts   # File system operations and navigation
├── ui/                 # User interface layer
│   ├── views/
│   │   └── findReplaceView.ts # Main plugin coordinator (~800 lines)
│   └── components/
│       ├── searchToolbar.ts   # UI creation and layout (358 lines)
│       ├── actionHandler.ts   # Event handling and replace operations (300+ lines)
│       ├── searchController.ts # Search logic and state management (285 lines)
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
- **VSCode-style expandable filter panel** with "files to include" / "files to exclude" inputs
- **Session-only filter management** - filters don't modify settings; settings provide defaults
- Complete keyboard navigation and accessibility support including filter panel

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

### Architecture Improvements
12. **Component Extraction** - Refactored monolithic view into focused components
13. **VSCode-Style Settings Migration** - Unified "files to include" / "files to exclude" pattern with automatic migration from old 4-setting structure
14. **SessionFilters Interface** - Clean separation between session-only filters and persistent settings
15. **Multiline Search Engine** - Complete multiline regex implementation with content-aware replacement
16. **Comprehensive Testing** - 105 total tests (44 new multiline + existing suite) preventing regressions
17. **Professional Logging** - 6-level system (SILENT to TRACE) with clean console by default
18. **Scoped CSS** - All styling prefixed with view selector to prevent global conflicts

## Development Guidelines

### Code Quality Standards
- **TypeScript:** Strict typing, no `any` usage
- **Error Handling:** Every async operation must have error boundaries
- **Resource Management:** All components must implement dispose() methods
- **Performance:** File operations in batches, UI responsiveness maintained
- **Security:** Regex timeout protection, input validation

### Testing Strategy
- **Test Framework:** Vitest 2025 with comprehensive isolated unit testing
- **Test Coverage:** 203 tests across 15 test suites targeting core functionality
- **Bug Prevention:** Specific regression tests for known issues
- **Property-Based Testing:** Fast-check integration for edge case discovery

### Build Commands
- **Development:** `npm run dev` - Continuous development build with watching
- **Production:** `npm run build` - TypeScript compilation + production bundle
- **Testing:** `npm test` - Complete test suite (203 tests)
- **Coverage:** `npm run test:coverage` - Generate coverage reports

## Plugin Integration

### Obsidian API Usage
- **View System:** Extends ItemView for sidebar integration
- **File System:** Uses app.vault.read/modify for file operations
- **Commands:** 13 comprehensive commands for all plugin actions including multiline toggle
- **Settings:** Standard Obsidian settings architecture with migration support

### Key Features for Users
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
- **Logger:** 6-level logging system (Silent to Trace) for granular debugging
- **Console Output:** Clean by default, comprehensive when debugging enabled
- **Test Suite:** Run `npm test` to verify functionality

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

Full backup available in `CLAUDE_FULL_BACKUP.md`.