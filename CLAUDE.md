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