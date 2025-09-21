# Find-n-Replace

A comprehensive find and replace plugin for Obsidian that performs vault-wide search and replacement operations with regex support, multi-selection capabilities, and real-time replacement preview.

## What This Plugin Does

This plugin provides a dedicated search interface that allows you to:

1. Search across your entire vault for text patterns
2. Preview all matches in a structured, navigable list
3. Select specific matches or entire files for replacement
4. Execute replacements with full regex capture group support
5. Navigate directly to any match location with a single click

Unlike Obsidian's built-in search, this plugin is designed specifically for bulk editing operations across multiple files simultaneously.

## Core Features

### Search Capabilities
- Full-text search across all markdown files in your vault
- Regular expression pattern matching with JavaScript regex syntax
- Case-sensitive and whole-word matching options
- Automatic search-as-you-type with configurable debouncing
- Search result limiting to handle large vaults efficiently

### Selection System
- Multi-select individual matches using Ctrl/Cmd+click
- Select all matches in a specific file
- Select all matches across the entire vault
- Visual selection indicators with persistent state
- Keyboard shortcuts for bulk selection operations

### Replacement Operations
- Replace individual matches one at a time
- Replace all selected matches in bulk
- Replace all matches within a specific file
- Replace all matches across the entire vault
- Real-time preview showing exact replacement text before execution

### Regex Support
- Full JavaScript regular expression support
- Capture group replacement using `$1`, `$2`, etc.
- Special replacement tokens: `$&` (full match), `$$` (literal $)
- Live preview of regex replacements with capture group expansion
- Regex validation with clear error messages

### User Interface
- Clean, focused interface optimized for find/replace workflows
- Collapsible file groups with persistent expand/collapse state
- Adaptive toolbar that shows relevant controls contextually
- Full keyboard navigation with complete sequential tab order (toolbar → file headers → replace buttons → matches → replace buttons)
- Enhanced accessibility with larger focus targets and proper event isolation
- All replace actions accessible via keyboard navigation
- Accessible design with screen reader support
- **Built-in Help System**: Comprehensive help modal accessible via toolbar menu (⋯) showing all keyboard shortcuts, usage tips, and your personal hotkey configurations

### Performance Optimizations
- Incremental result updates after replacements (avoids full re-search)
- Intelligent regex compilation caching
- Batched file processing to maintain UI responsiveness
- Configurable result limits to prevent UI freezing
- Search operation serialization to prevent race conditions

## Installation

### Community Plugins (Recommended)
1. Open Obsidian Settings
2. Navigate to Community Plugins
3. Browse for "Find-n-Replace"
4. Install and enable

### Manual Installation
1. Download the latest release from GitHub
2. Extract to `.obsidian/plugins/vault-find-replace/` in your vault
3. Enable in Obsidian Community Plugins settings

## Usage Guide

### Opening the Plugin
Access via Command Palette: `Find-n-Replace: Open`

The plugin opens in a dedicated pane that can be docked anywhere in your workspace.

### Getting Help
Click the **⋯** (ellipsis) button in the toolbar and select **Help** to open the comprehensive help modal. This shows:
- All 12 available plugin commands with descriptions
- Your configured keyboard shortcuts (if any)
- Recommended hotkey combinations
- Usage tips for efficient workflows
- Direct link to hotkey configuration in Obsidian settings

### Basic Search Workflow
1. Enter search term in the search input field
2. Results populate automatically as you type
3. Browse results organized by file
4. Click any result to navigate to that location in your vault

### Search Options
- **Match Case**: Enable case-sensitive searching
- **Whole Word**: Match complete words only (adds word boundaries)
- **Use Regex**: Enable regular expression pattern matching

### Multi-Selection
- **Ctrl/Cmd+Click**: Toggle selection of individual results
- **Ctrl/Cmd+A**: Select all visible results
- **Escape**: Clear all selections

### Replacement Options
- **Replace This**: Replace a single match (appears on hover)
- **Replace Selected**: Replace all currently selected matches
- **Replace All in File**: Replace all matches within a specific file
- **Replace All in Vault**: Replace all matches across entire vault

### File Group Management
- Click file names to expand/collapse result groups
- File states persist across search sessions
- Expand/Collapse All button in toolbar for bulk operations

## Configuration

### Plugin Settings
- **Max Results**: Maximum search results to display (default: 1000)
- **Search Debounce Delay**: Delay before auto-search triggers (default: 300ms)
- **Enable Auto Search**: Toggle automatic search-as-you-type
- **Console Logging Level**: Granular control over console output (Silent, Errors Only, Standard, Verbose, Debug, Trace)

### File Filtering
- **File Extensions**: Limit search to specific file types (default: md)
- **Search In Folders**: Restrict search to specific folders
- **Exclude Folders**: Skip specific folders during search
- **Exclude Patterns**: Regex patterns for files to ignore

### Performance Tuning
- **Result Limiting**: Automatic truncation with user notification
- **Batch Processing**: Files processed in batches to maintain responsiveness
- **Cache Management**: Automatic regex compilation caching for repeated searches

## Practical Examples

### Find All TODOs
```
Search: TODO
Result: Locates all TODO items across your vault for review
```

### Convert Date Formats
```
Search: (\d{4})-(\d{2})-(\d{2})
Replace: $2/$3/$1
Result: Changes "2024-01-15" to "01/15/2024"
```

### Standardize Heading Formats
```
Search: ^#+\s*(.+?)\s*#+\s*$
Replace: ## $1
Result: Converts any heading level to level 2 headings
```

### Find Broken Wikilinks
```
Search: \[\[([^\]]+)\]\]
Result: Locate all wikilinks for validation
```

### Replace Markdown Links
```
Search: \[([^\]]+)\]\(([^)]+)\)
Replace: [[$1|$2]]
Result: Convert markdown links to wikilinks
```

### Clean Up Multiple Spaces
```
Search: \s{2,}
Replace: (single space)
Result: Replace multiple consecutive spaces with single space
```

## Keyboard Shortcuts

### Navigation
- **Tab**: Sequential navigation through toolbar → file headers → replace buttons → matches → replace buttons
- **Shift+Tab**: Reverse navigation staying within plugin boundary
- **Enter/Space**: Expand/collapse file groups when header is focused
- **Enter/Space**: Open result file when match is focused
- **Enter/Space**: Execute replace action when replace button is focused

### Selection
- **Ctrl/Cmd+A**: Select all results
- **Escape**: Clear current selection
- **Ctrl/Cmd+Click**: Toggle individual result selection

### Search
- **Enter** (in search field): Execute manual search
- **Escape** (in search field): Clear search input

## Obsidian Commands

All plugin functionality is available through Obsidian's Command Palette (Ctrl/Cmd+P) and can be assigned custom hotkeys:

### View Management
- **Open Find-n-Replace** - Opens the plugin view
- **Focus Search Input** - Focuses the search input field
- **Focus Replace Input** - Focuses the replace input field

### Search Operations
- **Perform Search** - Executes search with current query
- **Clear Search and Replace** - Clears inputs and resets all toggle options
- **Toggle Match Case** - Toggles case-sensitive search mode
- **Toggle Whole Word** - Toggles whole word matching mode
- **Toggle Regex** - Toggles regular expression mode

### Replace Operations
- **Replace Selected Matches** - Replaces only the currently selected results
- **Replace All in Vault** - Replaces all matches across the entire vault

### Result Management
- **Select All Results** - Selects all visible search results
- **Expand/Collapse All Results** - Toggles expand/collapse state for all file groups

### Custom Hotkey Assignment
To assign custom keyboard shortcuts:
1. Open Obsidian Settings → Hotkeys
2. Search for "Find-n-Replace"
3. Assign your preferred key combinations to any command

## Architecture

### Search Engine
- Batched file processing with configurable batch sizes
- Regex compilation caching for performance
- Incremental result updates after replacements
- Search operation serialization to prevent concurrency issues

### UI Components
- **Search Toolbar**: UI creation and layout management with toggle button states
- **Action Handler**: Event processing and replace operation coordination
- **Search Controller**: Search execution, state management, and result processing
- **Results Renderer**: Virtualized result display with file grouping
- **Selection Manager**: Multi-selection state management with keyboard navigation
- **Adaptive Toolbar**: Context-sensitive action buttons with ellipsis menu

### State Management
- Centralized view state with immutable updates
- Persistent file group expand/collapse states
- Selection state preservation during result updates
- Search option state synchronization

## Troubleshooting

### Common Issues

**Search returns no results**
- Verify file extension filters include your target files
- Check folder inclusion/exclusion settings
- Ensure search pattern syntax is correct for regex mode

**Performance problems with large vaults**
- Reduce Max Results setting
- Use more specific search patterns
- Enable folder filtering to limit search scope
- Check console for performance warnings

**Regex patterns not working**
- Validate regex syntax using online regex testers
- Escape special characters when searching for literal text
- Verify capture group numbering in replacement patterns
- Check console for regex compilation errors

**Individual replacement issues**
- All replacement modes now work reliably, including second matches on same line
- If individual replacements fail, try "Replace Selected" or "Replace All in File"
- Check console logging level for detailed replacement debugging information

**Selection state issues**
- Clear selection and re-select if state becomes inconsistent
- Check console for selection state warnings (if logging enabled)
- Ensure not clicking during active search operations

### Debug Information
The plugin features a professional logging system with clean console experience by default:

**Console Logging Levels** (adjust in settings):
- **Silent**: No console output (production environments)
- **Errors Only**: Critical failures only (recommended default - clean console)
- **Standard**: Errors and warnings
- **Verbose**: All info, warnings, and errors
- **Debug**: Full debugging output with detailed operation tracking
- **Trace**: Maximum verbosity including performance timing and lifecycle events

**Professional Logging System:**
- Clean console experience by default (no debug spam)
- Granular control over debugging output via settings
- All plugin components respect user's chosen log level
- Console output only appears when specifically enabled for troubleshooting

## Development

### Project Structure
```
src/
├── core/           # Search and replacement engines
├── ui/             # User interface components
├── types/          # TypeScript type definitions
├── utils/          # Utility functions and helpers
└── main.ts         # Plugin entry point
```

### Build Process
```bash
# Install dependencies
npm install

# Development build with watching
npm run dev

# Production build
npm run build

# Run test suite
npm test

# Watch mode testing
npm run test:watch

# Generate coverage reports
npm run test:coverage

# Release build
npm run release
```

### Code Architecture
- **TypeScript**: Full type safety with strict mode
- **Event-driven**: Reactive UI updates based on state changes
- **Modular**: Separation of concerns between search, UI, and state
- **Testable**: Isolated components with dependency injection
- **Test Coverage**: 61 automated tests preventing regressions and edge cases

### Contributing Guidelines
1. Follow existing code style and TypeScript conventions
2. Add comprehensive logging for debugging
3. Include error handling for all async operations
4. **Run test suite before submitting:** `npm test` (61 tests must pass)
5. **Add tests for new features:** Follow existing test patterns in `src/tests/unit/`
6. Test with large vaults to ensure performance
7. Update documentation for any API changes

## Technical Details

### Search Performance
- Files processed in configurable batches (default: 10 files)
- Regex compilation cached to avoid recompilation
- Results limited to prevent UI freezing (default: 1000)
- Incremental updates after replacements avoid full re-search

### Memory Management
- Search results stored efficiently with minimal object overhead
- Automatic cleanup of event listeners and references
- Garbage collection friendly with proper disposal methods
- Memory usage monitoring in debug mode

### Concurrency Control
- Search operations serialized to prevent race conditions
- Proper async/await usage throughout codebase
- AbortController support for cancelling long-running searches
- Debounced user input to prevent excessive search requests

### Quality Assurance
- **Comprehensive Test Suite**: 61 automated tests covering core functionality
- **Regression Prevention**: Specific tests for known bugs (e.g., second match replacement)
- **Edge Case Coverage**: Unicode, overlapping patterns, performance limits
- **Property-Based Testing**: Random input generation to discover unknown edge cases
- **Fast Execution**: Complete test suite runs in under 1 second
- **Zero Dependencies**: Tests run independently without Obsidian API requirements

#### Test Structure
```
src/tests/
├── unit/                    # Isolated unit tests
│   ├── regexUtils.test.ts       # Pattern matching (10 tests)
│   ├── positionTracking.test.ts # Position accuracy (9 tests)
│   ├── bugRegression.test.ts    # Bug prevention (13 tests)
│   ├── performance.test.ts      # Performance limits (15 tests)
│   └── testDataGenerators.test.ts # Property-based (12 tests)
└── basic.test.ts            # Framework validation (2 tests)
```

## License

MIT License