# Find-n-Replace - Feature Roadmap

## Implemented ✅

### Core Functionality
- **Vault-wide search and replace** with regex support and capture groups
- **Multi-selection operations** for targeted replacements
- **VSCode-style UI** with modern interface and keyboard navigation
- **Search concurrency control** with proper race condition handling
- **Real-time replacement preview** with regex expansion
- **Adaptive results toolbar** with contextual actions
- **Persistent file group states** with expand/collapse preferences
- **File filtering & search scope** with VSCode-style expandable UI

### Settings & Configuration
- **Maximum results limiting** (`maxResults`) - Controls performance for large searches
- **Search debounce delay** (`searchDebounceDelay`) - Configurable auto-search timing
- **File group state persistence** (`fileGroupStates`) - Remember expand/collapse preferences
- **Enhanced logging system** (`logLevel`) - 6-level logging control (SILENT → TRACE)

### Performance & Reliabilityvaul
- **Batch file processing** to maintain UI responsiveness
- **Search result limiting** to prevent UI freezing
- **AbortController search cancellation** for rapid user input
- **Comprehensive error boundaries** for production stability
- **Memory leak prevention** with proper resource cleanup

### Quality Assurance & Testing
- **Comprehensive test suite** - 61 automated tests across 6 test suites
- **Regression prevention** - Specific tests for the second match replacement bug
- **Edge case coverage** - Unicode, overlapping patterns, performance limits
- **Property-based testing** - Random input generation for unknown edge cases
- **Fast execution** - Complete test suite runs in under 1 second
- **Independent testing** - No Obsidian API dependencies required

### Development Commands
- **Keyboard-first workflow** - 12 Obsidian commands for all plugin actions
- **Command palette integration** - All functionality accessible via Ctrl/Cmd+P
- **Custom hotkey support** - Users can assign shortcuts to any command
- **Accessibility enhancement** - Full plugin operation without mouse dependency

## In Progress 🚧

### Settings UI Cleanup
- **Comment out unimplemented features** to avoid user confusion
- **Streamline settings interface** to show only working features
- **Clear documentation** of planned vs. implemented functionality

## Planned - High Priority 📋

### ✅ File Filtering & Search Scope (COMPLETED)
- **File extension filtering** (`fileExtensions`) - Limit search to specific file types
  - ✅ *Implemented in SearchEngine.performSearch() with full filtering logic*
  - ✅ *VSCode-style UI with expandable filter panel*
  - ✅ *Smart pattern parsing (.md, Notes/, *.js) in main interface*

- **Folder inclusion/exclusion** (`searchInFolders`, `excludeFolders`) - Control search scope
  - ✅ *Implemented with path matching logic*
  - ✅ *Both granular settings and main UI quick filters*
  - ✅ *Essential for large vaults - production ready*

- **File pattern exclusion** (`excludePatterns`) - Skip files matching patterns
  - ✅ *Implemented with glob pattern matching (* and ? wildcards)*
  - ✅ *Useful for excluding temp files, backups, etc.*
  - ✅ *Real-time filtering with debounced input sync*

### Search Result Enhancement
- **Search result highlighting** (`highlightDuration`, `persistentHighlight`) - Visual feedback
  - *UI exists but no highlighting implementation*
  - *Priority: High - important UX feature*
  - *Implementation: Add CSS highlighting to result text and scroll-to-view*

- **Line number display** (`showLineNumbers`) - Better result context
  - *UI exists but not displayed in results*
  - *Priority: Medium - nice-to-have for navigation*
  - *Implementation: Update result rendering to include line numbers*

- **File extension display** (`showFileExtensions`) - File type visibility
  - *UI exists but not shown in file headers*
  - *Priority: Low - minor UX improvement*
  - *Implementation: Update file group header rendering*

### Performance Optimizations
- **Virtual scrolling** for large result sets (>1000 results)
- **Result streaming** with progressive display
- **Search index caching** for repeated searches
- **Background search** with worker threads

## Planned - Medium Priority 📝

### Search History & Patterns
- **Search history** with recently used patterns
- **Saved search patterns** for complex regex operations
- **Search pattern validation** with real-time feedback
- **Regex pattern builder** with visual assistance

### Batch Operations
- **Multiple find/replace operations** in sequence
- **Search configuration presets** for different use cases
- **Bulk file operations** with progress tracking
- **Undo/redo support** for large replacement operations

### Import/Export Functionality
- **Export search results** to CSV/JSON
- **Export/import search configurations** for sharing
- **Search report generation** with statistics
- **Integration with external tools** (VSCode, regex testers)

## Planned - Low Priority 💭

### Advanced Features
- **Advanced regex tools** with pattern testing
- **Search result annotations** with user notes
- **Custom search operators** beyond basic regex
- **Search result grouping** by custom criteria

### UI/UX Enhancements
- **Theme integration** with custom Obsidian themes
- **Accessibility improvements** for screen readers
- **Internationalization** for multiple languages
- **Mobile optimization** for tablet usage

### Developer Tools
- **Plugin API** for third-party integrations
- **Search hooks** for other plugins to use
- **Performance profiling** tools

## Technical Debt & Improvements

### Code Quality
- **Bundle size optimization** with code splitting
- **TypeScript strict mode** compliance
- **Documentation generation** from code comments

### Architecture
- **Search engine abstraction** for pluggable backends
- **Event-driven architecture** for better modularity
- **State management refactoring** with formal patterns
- **Plugin lifecycle optimization** for better performance

## Contributing

### How to Contribute
1. **Check this roadmap** for planned features
2. **Create GitHub issues** for new feature requests
3. **Comment on existing issues** to influence priority
4. **Submit pull requests** for high-priority items

### Development Priorities
- **High Priority** items are ready for implementation
- **Medium Priority** items need design discussion
- **Low Priority** items are future considerations
- **Technical Debt** improvements are always welcome

### Implementation Guidelines
- **Follow existing code patterns** and TypeScript conventions
- **Add comprehensive error handling** for all new features
- **Include debug logging** for troubleshooting
- **Write tests first** using test-driven development approach
- **Run test suite** (`npm test`) before submitting changes - all 61 tests must pass
- **Add tests for new features** following patterns in `src/tests/unit/`
- **Update this roadmap** when completing features

---

*Last updated: September 2025 - Added comprehensive testing infrastructure*
*For questions or suggestions, please create a GitHub issue.*

## Recent Completions (September 2025)

### ✅ **Comprehensive Automated Testing Infrastructure**
- **Completed**: Full test suite with 61 tests across 6 suites
- **Impact**: Zero tolerance for regressions, automatic bug prevention
- **Tools**: Vitest 2.1.0, TypeScript, jsdom environment
- **Coverage**: Core algorithms, edge cases, performance, Unicode support
- **Execution**: <1 second for complete test suite
- **Benefits**: Test-driven development, safe refactoring, quality assurance

### ✅ **Enhanced Logging System**
- **Completed**: 6-level logging system (SILENT → TRACE)
- **Impact**: Professional console experience, granular debug control
- **Migration**: Automatic conversion from boolean debug flag
- **Benefits**: Clean user experience, comprehensive debugging when needed

### ✅ **Development Commands Integration**
- **Completed**: 12 Obsidian commands for keyboard-first workflow
- **Impact**: Full accessibility, power-user efficiency
- **Features**: Command palette integration, custom hotkey support
- **Benefits**: Mouse-free operation, familiar VSCode-like workflows

### ✅ **File Group Header Focus Target Optimization**
- **Completed**: Enhanced keyboard navigation and accessibility for file group headers
- **Problem Solved**: Tab focus conflicts between heading text and replace button functionality
- **Technical Changes**:
  - Focus target moved from `file-group-heading` span to entire `file-group-header` div
  - Click event isolation prevents replace button from triggering expand/collapse
  - Sequential tabindex assignment for logical tab flow
  - Updated CSS focus styles with proper visual indicators
- **User Benefits**:
  - Larger, easier-to-target focus areas for keyboard navigation
  - Clear separation between replace actions and expand/collapse functionality
  - Logical tab order: header → all matches → next header → all matches
  - Improved shift-tab behavior that stays within plugin boundary
- **Accessibility Impact**: Better keyboard-only operation with predictable focus behavior

### ✅ **VSCode-Style File Filtering Implementation**
- **Completed**: Comprehensive file filtering system with both granular settings and quick UI filters
- **Features Implemented**:
  - File extension filtering (.md, .txt, .js) with smart pattern parsing
  - Folder inclusion/exclusion (Notes/, Archive/) with path matching logic
  - Glob pattern exclusion (*.tmp, *backup*, temp/*) with wildcard support
  - VSCode-style expandable filter panel with include/exclude inputs
  - Real-time filter sync with 500ms debounced input processing
  - Visual filter indicators with count badges on filter button
  - Seamless integration with existing search infrastructure
- **Technical Implementation**:
  - Backend filtering in SearchEngine.performSearch() with comprehensive file collection logic
  - Smart pattern parsing automatically detects extensions vs. folders vs. glob patterns
  - Dual interface: granular settings panel + quick main UI filters
  - Complete tab order integration (filter button tabindex 7, inputs 8-9)
  - CSS-based visual states (active filters show border + count badge)
  - Bidirectional sync between main UI inputs and plugin settings
- **User Benefits**:
  - **Large Vault Performance**: Ability to limit search scope reduces processing time
  - **Familiar UX**: VSCode-style filter panel with include/exclude pattern matching
  - **Flexible Filtering**: Support for extensions, folders, and complex glob patterns
  - **Visual Feedback**: Clear indicators show when filters are active and count
  - **Granular Control**: Both quick filters and detailed settings for power users

### ✅ **Complete Tab Order System Fix** (September 2025)
- **Completed**: Comprehensive fix for tab navigation across entire plugin interface
- **Problem Fixed**: Multiple tab order issues including missing filter elements and broken forward tabbing
- **Root Cause**: Custom keydown handlers were intercepting Tab key and preventing natural browser navigation
- **Technical Solution**:
  - Removed interfering custom tab navigation from clear button
  - Implemented complete sequential tabindex system (1-12)
  - Fixed DOM order vs tabindex conflicts
  - Sequential tab order: Search(1) → Replace(2) → Match Case(3) → Whole Word(4) → Regex(5) → Clear(6) → Filter(7) → Include(8) → Exclude(9) → Ellipsis(10) → Expand/Collapse(11) → Results(12)
- **User Impact**:
  - Perfect forward and reverse tab navigation through all interactive elements
  - Complete keyboard accessibility for filter functionality
  - No more skipped elements or broken tab flow
  - Consistent behavior in both directions (Tab and Shift+Tab)