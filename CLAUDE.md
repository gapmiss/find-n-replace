# Vault Find & Replace - Obsidian Plugin

## Project Overview

**Plugin Name:** Vault Find & Replace
**Type:** Obsidian.md Plugin
**Purpose:** VSCode-style vault-wide find and replace functionality with advanced search options
**Architecture:** TypeScript-based modular architecture with clean separation of concerns

## Core Functionality

- **Vault-wide search** across all markdown files
- **Advanced replace operations** (individual, file-level, vault-wide, selected)
- **Search options:** Match case, whole word, regex support
- **VSCode-style UI** with sidebar view and result navigation
- **Multi-selection** for targeted replacements
- **Real-time preview** of replacement results
- **Comprehensive error handling** and user feedback

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
│   │   └── findReplaceView.ts # Main plugin view (732 lines)
│   └── components/
│       ├── renderer.ts      # UI rendering and DOM manipulation
│       ├── selectionManager.ts # Multi-selection functionality
│       └── navigationHandler.ts # Keyboard navigation
├── types/              # TypeScript type definitions
│   ├── search.ts           # SearchResult, SearchOptions interfaces
│   ├── ui.ts              # UI-related types
│   ├── replacement.ts      # Replacement operation types
│   └── settings.ts        # Plugin settings interface
├── utils/              # Shared utilities
│   ├── logger.ts          # Logging with user notifications
│   └── helpers.ts         # Utility functions
├── settings/           # Configuration management
│   └── settingsTab.ts     # Plugin settings UI
├── modals/            # User interaction dialogs
│   └── confirmModal.ts    # Confirmation dialogs
└── main.ts            # Plugin entry point
```

### Key Components

#### 1. **SearchEngine** (`src/core/searchEngine.ts`)
- **Purpose:** Performs vault-wide search operations
- **Features:**
  - Regex compilation and caching for performance
  - Batch processing to maintain UI responsiveness
  - Support for case-sensitive, whole-word, and regex searches
  - Graceful error handling for file read failures
- **Performance:** Processes files in batches of 10 with yield delays
- **Error Handling:** Skips problematic files, continues with accessible ones

#### 2. **ReplacementEngine** (`src/core/replacementEngine.ts`)
- **Purpose:** Handles all file modification operations
- **Features:**
  - Replacement dispatch for different modes (one, file, vault, selected)
  - Regex replacement expansion with capture groups ($1, $&, etc.)
  - Atomic file operations with error recovery
  - **CRITICAL:** Contains infinite loop protection for zero-length regex matches
- **Security:** Timeout protection against ReDoS attacks (5-second limit)

#### 3. **FindReplaceView** (`src/ui/views/findReplaceView.ts`)
- **Purpose:** Main plugin interface extending Obsidian's ItemView
- **Features:**
  - VSCode-style search and replace UI
  - Real-time result rendering and selection management
  - Search cancellation with AbortController
  - Debounced auto-search functionality
  - Comprehensive error boundaries for all async operations
- **State Management:** Maintains search results, selection state, UI elements
- **Performance:** Unique timer IDs prevent timing conflicts

#### 4. **FileOperations** (`src/core/fileOperations.ts`)
- **Purpose:** File system operations and editor navigation
- **Features:**
  - File opening at specific line/column positions
  - CodeMirror integration for viewport centering
  - File existence checking and path operations
  - Proper resource cleanup with dispose() method

### Recent Major Improvements

#### 1. **Infinite Loop Protection** (Critical Security Fix)
- **Location:** `replacementEngine.ts:148-175`
- **Issue:** Zero-length regex matches could cause infinite loops
- **Solution:**
  - Timeout protection (5-second limit)
  - Zero-length match detection with lastIndex advancement
  - Comprehensive safety checks and error handling
- **Impact:** Prevents browser freezing and ReDoS attacks

#### 2. **Resource Management & Memory Leak Prevention**
- **Implementation:** dispose() methods on all components
- **Cleanup Strategy:**
  - View-level cleanup in onClose() for component instances
  - Cache clearing in SearchEngine
  - Reference nullification for garbage collection
  - Search cancellation in view lifecycle
- **Benefit:** Prevents memory leaks during plugin lifecycle

#### 3. **Search Timing Conflict Resolution**
- **Issue:** Space bar on checkboxes triggered multiple simultaneous searches
- **Solution:**
  - AbortController-based search cancellation
  - isSearching guard to prevent duplicate operations
  - Unique timer IDs to eliminate "Timer already exists" errors
  - 100ms debounce on checkbox changes
- **Result:** Smooth UI interactions without timing conflicts

#### 4. **Comprehensive Error Boundaries**
- **Coverage:** ALL async operations now protected with try-catch
- **Strategy:**
  - File operations: Graceful degradation, skip problematic files
  - UI operations: User-friendly error messages via logger
  - Settings: Automatic fallback to defaults
  - Event handlers: Complete async operation protection
- **Impact:** Production-ready stability, no crashes from edge cases

#### 5. **Incremental UI Updates** (Performance Enhancement)
- **Problem:** Every replacement triggered full vault re-search and UI rebuild
- **Solution:** Smart incremental updates that preserve user state
- **Implementation:**
  - Track replacement metadata (affected files, lines, indices)
  - Remove only replaced results from state
  - Re-validate affected results against current search
  - Preserve scroll position and expand/collapse states
- **Impact:** Instant replacements without jarring UI rebuilds

#### 6. **Persistent Collapse/Expand States** (UX Enhancement)
- **Feature:** Individual file group expand/collapse preferences persist across sessions
- **Implementation:**
  - State stored in plugin settings per file path
  - Default to collapsed for better visual management
  - Automatic cleanup of states for deleted files
  - Smart toolbar button reflects overall state
- **Benefits:** Cleaner initial view, preserved user preferences, zero configuration

#### 7. **VSCode-Style UI Modernization** (Major UX Overhaul)
- **Goal:** Transform interface to match VSCode's search functionality
- **Key Changes:**
  - **Inline Search Options:** Match Case, Whole Word, Regex as toggle buttons
  - **Input Icons:** Search and replace inputs with inline icons
  - **Global Clear:** Single button clears all inputs and resets options
  - **Modern Toolbar:** Contextual actions appear when relevant
  - **Bottom Action Bar:** Restored with modern styling for bulk operations
  - **Responsive Design:** Mobile-friendly layout with touch optimization
- **Technical Implementation:**
  - 359 new lines of modern CSS using Obsidian design tokens
  - VSCode-inspired button styling and interactions
  - Accessibility improvements with proper ARIA labels
  - Smooth transitions and hover effects
- **User Benefits:** Familiar UX for VSCode users, cleaner interface, better mobile support

#### 8. **Regex Replacement Preview with Capture Group Expansion** (Critical Bug Fix)
- **Problem:** Regex replacement previews were non-functional - capture groups like `$1`, `$2` were not being expanded
- **Root Cause:** Hard-coded `false` values were passed to `buildSearchRegex` instead of actual search options
- **Solution Implementation:**
  - **New Method:** `expandReplacementString()` handles all capture group substitution
  - **Capture Group Support:** `$1`, `$2`, etc. for numbered groups; `$&` for full match; `$$` for literal `$`
  - **Method Signature Updates:** `highlightMatchText()`, `renderResults()`, `createResultLine()` now receive search options
  - **Call Chain Fix:** All callers now pass current search options via `getSearchOptions()`
- **Technical Details:**
  - Fixed TypeScript compilation errors around variable scoping
  - Resolved "used before declaration" issue in `updateResultsAfterReplacement`
  - Maintains backward compatibility for non-regex replacements
  - Enhanced error handling for invalid regex patterns
- **User Impact:** Regex replacements now show accurate previews (e.g., `(typescript)` → `🚧🚧$1🚧🚧` correctly previews as `🚧🚧typescript🚧🚧`)
- **File Changes:** `src/ui/components/renderer.ts` (86 line changes), `src/ui/views/findReplaceView.ts` (16 line changes)

#### 9. **Adaptive Icon-Based Results Toolbar** (UI/UX Enhancement)
- **Problem:** Bottom toolbar felt disconnected and "ugly" with large text buttons that cluttered the interface
- **Solution:** Replaced with elegant adaptive toolbar integrated into main search area
- **Design Approach:**
  - **Contextual Visibility:** Toolbar only appears when search results exist
  - **Icon-Based Actions:** Replaced text buttons with intuitive icons (✓ check-circle, 🏛️ vault, ⚏ expand/collapse)
  - **Smart Layout:** Results summary on left, compact actions on right
  - **Progressive Disclosure:** "Replace selected" only shows when items are selected
- **Technical Implementation:**
  - Moved all result actions into `find-replace-adaptive-toolbar` within main search toolbar
  - Icon buttons use `clickable-icon` class with 24x24px dimensions
  - Adaptive visibility logic in `renderer.ts` and `selectionManager.ts`
  - Responsive design maintains icon clarity on mobile (32x32px)
- **User Benefits:**
  - **Cleaner Interface:** No more disconnected bottom bars floating in UI
  - **VSCode-Like Feel:** Actions appear contextually where and when needed
  - **Better Information Hierarchy:** Clear separation between search config and result actions
  - **Mobile Friendly:** Touch-optimized icon buttons with proper spacing
- **File Changes:**
  - `src/ui/views/findReplaceView.ts` (replaced bottom toolbar with adaptive section)
  - `src/ui/components/renderer.ts` (updated visibility logic)
  - `src/ui/components/selectionManager.ts` (adaptive selection display)
  - `styles.css` (removed bottom-bar CSS, added adaptive-toolbar styling)
  - `src/types/ui.ts` (updated interface for adaptiveToolbar reference)

#### 10. **Comprehensive Keyboard Navigation and Selection State Fixes** (Accessibility & UX)
- **Problems Addressed:**
  - **Tab Order Issues:** Tab navigation broke at regex button, skipped adaptive toolbar, went to other Obsidian panes
  - **Selection State Desync:** Individual replacements caused selection count/visual state inconsistencies
  - **Focus Loss:** Replacing individual results lost tab focus context, forcing restart of navigation
- **Keyboard Navigation Solutions:**
  - **Complete Tab Chain:** Added explicit `tabindex` attributes (1-9) ensuring proper flow within plugin boundary
  - **Custom Tab Handlers:** Clear search button → First adaptive toolbar button → Results area
  - **Smart Focus Restoration:** Individual replacements return focus to previous result in tab order
  - **Adaptive Button Integration:** Replace Selected/Replace All/Expand-Collapse properly included in tab sequence
- **Selection Management Solutions:**
  - **Index Synchronization:** New `adjustSelectionForRemovedIndices()` method maintains valid selection indices when results are removed
  - **Visual State Preservation:** Enhanced `setupSelection()` with `preserveSelection` flag to maintain highlights during UI updates
  - **Selection State Tracking:** Individual replacements properly remove replaced items from selection and update count
- **Technical Implementation:**
  - Smart tab order: Find → Replace → Match Case → Whole Word → Regex → Clear → Adaptive Toolbar → Results
  - Focus management with DOM validation and fallback strategies
  - Selection index adjustment algorithm handling array modifications
  - Event handler preservation during DOM re-rendering
- **User Benefits:**
  - **Seamless Keyboard Navigation:** Tab flows logically through entire interface without escaping to other panes
  - **Accessible Design:** Full keyboard-only operation with visible focus indicators
  - **Consistent Selection State:** Visual highlights and counts always match after any operation
  - **Context Preservation:** Focus returns to logical previous element, maintaining navigation flow
- **File Changes:**
  - `src/ui/views/findReplaceView.ts` (tab order, focus handlers, selection preservation)
  - `src/ui/components/selectionManager.ts` (index adjustment, visual state preservation)
  - `styles.css` (focus visibility styles)
  - Comprehensive debugging and error handling throughout

#### 11. **Complete Search Concurrency Rewrite** (Critical Race Condition Fix)
- **Problem Identified:** Multiple simultaneous searches causing inconsistent results
  - **Root Cause:** Same query `"(typescript)"` producing 0, 76, and 25 results randomly
  - **Technical Issue:** Broken search cancellation allowing concurrent search executions
  - **Symptoms:** Race conditions from search options being read during active searches
- **Comprehensive Solution Implementation:**
  - **Search Serialization:** Force sequential execution with completion waits (up to 1000ms timeout)
  - **Option State Freezing:** Read search options ONCE at start, pass frozen state through entire pipeline
  - **Cache Management:** Clear SearchEngine regex cache before each search to prevent stale state
  - **Robust Cleanup:** Enhanced finally blocks ensuring `isSearching` flag always resets
  - **Search Controller:** Proper AbortController cancellation with null reference cleanup
- **Code Architecture Changes:**
  - **New Method:** `readSearchOptionsOnce()` for conflict-free option reading during search execution
  - **Enhanced Method:** `renderResultsWithOptions()` eliminates mid-search option reading
  - **Cache Control:** `SearchEngine.clearCache()` prevents regex compilation state corruption
  - **Concurrency Guards:** Wait loops and force resets for hung search operations
  - **Comprehensive Logging:** Search lifecycle tracking with unique IDs for debugging
- **Technical Details:**
  - Search operations now fully serialized with proper async/await chains
  - Option reading consolidated to single point with frozen snapshots
  - SearchEngine regex cache cleared on every option change to prevent inconsistency
  - Enhanced error handling for search cancellation and state corruption
  - Deprecation warnings for old methods that could cause race conditions
- **User Impact:**
  - **Consistent Results:** Identical queries now always produce identical result counts
  - **Eliminated Race Conditions:** No more concurrent searches stepping on each other
  - **Reliable Operation:** Search state corruption and timing conflicts completely resolved
  - **Debug Visibility:** Clear logging shows search lifecycle and detects any remaining issues
- **File Changes:**
  - `src/ui/views/findReplaceView.ts` (major search execution rewrite, option state management)
  - `src/core/searchEngine.ts` (cache management, enhanced error handling)
  - Comprehensive race condition detection and prevention throughout

#### 12. **Professional README Documentation** (Project Documentation)
- **Challenge:** Original README was generic marketing copy with emoji clutter and no technical depth
- **Solution:** Complete rewrite with comprehensive technical documentation
- **Content Structure:**
  - **Clear Problem Statement:** What the plugin does and why it's needed vs Obsidian's built-in search
  - **Detailed Feature Explanation:** Technical depth on search capabilities, regex support, UI components
  - **Practical Usage Guide:** Step-by-step workflows for real-world use cases
  - **Configuration Reference:** Complete settings documentation with defaults and performance tuning
  - **Real Examples:** Actual regex patterns for common tasks (date conversion, link formatting, etc.)
  - **Architecture Overview:** Technical details for developers including performance and concurrency
  - **Comprehensive Troubleshooting:** Common issues with specific solutions and debug strategies
- **Technical Writing Approach:**
  - **User-Focused:** Explains features in terms of user benefits and workflows
  - **Developer-Friendly:** Architecture section provides implementation details for contributors
  - **Practical Examples:** Copy-paste regex patterns for immediate utility
  - **No Fluff:** Every section provides actionable information without marketing language
- **Documentation Quality:**
  - **Professional Tone:** Technical accuracy without condescending explanations
  - **Complete Coverage:** Installation, configuration, usage, troubleshooting, development
  - **Accessibility Focus:** Keyboard shortcuts and navigation documented
  - **Performance Guidance:** Settings optimization for large vaults and complex searches
- **User Benefits:**
  - **Faster Onboarding:** Clear installation and usage instructions
  - **Advanced Usage:** Regex examples enable power-user workflows
  - **Self-Service Support:** Comprehensive troubleshooting reduces support burden
  - **Contributor Enablement:** Architecture documentation facilitates community contributions

#### 13. **Test Vault Generator** (Development Tool)
- **Purpose:** Comprehensive testing infrastructure for Find & Replace functionality
- **Implementation:** Standalone HTML file generating 5000 diverse markdown files
- **Features:**
  - **Content Diversity:** 3x expanded template arrays with realistic technical content
  - **Cross-File Links:** Wikilinks `[[filename]]` referencing actual generated files
  - **External URLs:** Real documentation links to MDN, React, AWS, Node.js, etc.
  - **Multiple Patterns:** TODO items, regex patterns, code snippets, dates, emails
  - **Programming Languages:** JavaScript, TypeScript, Python, Rust, Go, SQL examples
- **Usage:** Open `tests/test-vault-generator.html` in browser, click generate, get ZIP file
- **Benefits:** Realistic test environment with interconnected files for comprehensive plugin testing

#### 14. **AbortController Null Reference Fix** (Critical Bug Fix)
- **Problem:** `TypeError: Cannot read properties of null (reading 'signal')` during rapid typing
- **Root Cause:** Search cancellation set `currentSearchController = null` but code still accessed `.signal`
- **Solution:** Create new AbortController immediately after cancelling instead of nullification
- **Technical Fix:**
  ```typescript
  // Before (buggy):
  this.currentSearchController.abort();
  this.currentSearchController = null;  // ❌ Caused null reference

  // After (fixed):
  this.currentSearchController.abort();
  this.currentSearchController = new AbortController();  // ✅ Always valid
  ```
- **Impact:** Eliminates JavaScript errors while preserving all search concurrency controls
- **File Changed:** `src/ui/views/findReplaceView.ts` (lines 435-439)

#### 15. **Comprehensive Logging System Overhaul** (Console Spam Fix & Developer Experience)
- **Problem:** Excessive console logging even with debug setting disabled
  - **Root Cause:** Hardcoded `console.log`, `console.warn`, `console.error` calls bypassing user settings
  - **User Impact:** Console spam interfering with development and normal usage
  - **Specific Issues:** `FileOperations.openFileAtLine called with:` appearing with every result click
- **Solution Implementation:**
  - **Log Level System:** Replaced boolean debug flag with 6-level enum (SILENT=0, ERROR=1, WARN=2, INFO=3, DEBUG=4, TRACE=5)
  - **Centralized Logging:** All console output now routed through Logger class with level gating
  - **Settings Migration:** Automatic migration from `enableDebugLogging` boolean to `logLevel` enum
  - **Performance Gating:** Early returns in logger methods prevent expensive operations when level insufficient
- **Technical Implementation:**
  - **Logger Enhancement:** All logging methods (`trace`, `debug`, `info`, `warn`, `error`) now check log level before output
  - **Settings Update:** Dropdown UI replaces debug toggle with granular level selection
  - **Console Cleanup:** Fixed hardcoded console calls in `fileOperations.ts` and `findReplaceView.ts`
  - **Migration Logic:** Backward compatibility with automatic settings conversion on plugin load
- **User Experience:**
  - **Clean Console (Default):** ERROR level provides clean experience for end users
  - **Developer Control:** DEBUG/TRACE levels enable comprehensive troubleshooting when needed
  - **Progressive Disclosure:** INFO → WARN → DEBUG → TRACE levels allow precise control over verbosity
  - **Production Ready:** SILENT level for completely clean console in production environments
- **File Changes:**
  - `src/types/settings.ts` (LogLevel enum, updated interface)
  - `src/utils/logger.ts` (enhanced level gating)
  - `src/settings/settingsTab.ts` (dropdown UI, commented out unimplemented features)
  - `src/main.ts` (migration logic)
  - `src/core/fileOperations.ts` (console cleanup)
  - `src/ui/views/findReplaceView.ts` (debug level adjustments)
  - `ROADMAP.md` (new file documenting planned features)
- **Developer Benefits:**
  - **Debugging Control:** Granular visibility into plugin operations without code changes
  - **Performance Monitoring:** TRACE level includes timing information
  - **Clean Development:** No more console spam during normal development work
  - **User-Friendly Defaults:** Plugin ships with clean console experience

## Development Guidelines

### Code Quality Standards
- **TypeScript:** Strict typing, no `any` usage (replaced with proper interfaces)
- **Error Handling:** Every async operation must have error boundaries
- **Resource Management:** All components must implement dispose() methods
- **Performance:** File operations in batches, UI responsiveness maintained
- **Security:** Regex timeout protection, input validation

### Testing Strategy
- **Current State:** No formal test suite (identified improvement opportunity)
- **Recommended:** Unit tests for SearchEngine, ReplacementEngine, regex patterns
- **Edge Cases:** Zero-length matches, large files, permission errors
- **Performance:** Batch processing efficiency, memory usage

### Performance Considerations
- **Search Batching:** 10 files per batch with yield delays
- **Result Limiting:** 500 results max for auto-search
- **Memory Management:** Proper cleanup of large result arrays
- **UI Responsiveness:** Virtual scrolling recommended for >1000 results

### Security Considerations
- **ReDoS Protection:** 5-second timeout on regex execution
- **Input Validation:** Regex pattern validation and sanitization
- **File Size Limits:** Consider implementing max file size checks
- **Permission Handling:** Graceful degradation for inaccessible files

## Plugin Integration

### Obsidian API Usage
- **View System:** Extends ItemView for sidebar integration
- **File System:** Uses app.vault.read/modify for file operations
- **Workspace:** Integrates with workspace.getLeavesOfType
- **Events:** registerDomEvent for proper event lifecycle
- **Settings:** Standard Obsidian settings architecture

### Key Dependencies
- **Obsidian API:** Core platform integration
- **TypeScript:** Type safety and development experience
- **No External Dependencies:** Self-contained plugin architecture

## Troubleshooting Guide

### Common Issues
1. **"Timer already exists" errors:** Fixed with unique timer IDs
2. **Infinite loops with regex:** Fixed with timeout protection
3. **Memory leaks:** Fixed with comprehensive dispose() methods
4. **Search timing conflicts:** Fixed with AbortController and guards

### Debug Tools
- **Logger:** Comprehensive logging with user notifications
- **Console Output:** Error details and stack traces preserved
- **Performance Timing:** Search operation timing measurements

## Future Enhancement Opportunities

### High Priority
1. **Virtual Scrolling:** For large result sets (>1000 results)
2. **Result Streaming:** Progressive result display
3. **Bundle Size Optimization:** Code splitting for advanced features
4. **Comprehensive Test Suite:** Unit and integration tests

### Medium Priority
1. **Advanced Search Filters:** File type, date range, content filters
2. **Search History:** Recent searches and patterns
3. **Batch Operations:** Multiple find/replace operations
4. **Export/Import:** Search configurations and results

### Low Priority
1. **Accessibility Improvements:** Enhanced screen reader support
2. **Internationalization:** Multi-language support
3. **Theme Integration:** Better integration with Obsidian themes
4. **Advanced Regex Tools:** Pattern builder, regex testing

## Maintainer Notes

### Code Modification Guidelines
- **Always add error boundaries** to new async operations
- **Test regex patterns** for potential infinite loops
- **Implement dispose() methods** for new components
- **Use unique timer IDs** for performance measurements
- **Follow existing logging patterns** for consistency

### Release Checklist
- [ ] TypeScript compilation passes
- [ ] All async operations have error boundaries
- [ ] Resource cleanup implemented
- [ ] Performance timing verified
- [ ] Edge case testing completed
- [ ] Documentation updated

This plugin represents a mature, production-ready implementation with enterprise-grade error handling, performance optimization, and security considerations. The modular architecture supports easy maintenance and feature enhancement while maintaining stability and user experience quality.