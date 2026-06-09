/**
 * Application constants
 */

// UI Constants
export const CONTEXT_BEFORE_MATCH = 10;
export const CONTEXT_AFTER_MATCH = 50;
export const SEARCH_DEBOUNCE_DELAY = 300;
export const FOCUS_DELAY = 100;
export const FILTER_UPDATE_DEBOUNCE_DELAY = 500;
export const MAX_FILE_GROUP_STATES = 500;

// Default settings
export const DEFAULT_HIGHLIGHT_DURATION = 2000;
export const DEFAULT_PERSISTENT_HIGHLIGHT = false;

// Regex patterns for replacement text validation
export const CAPTURE_GROUP_PATTERN = /\$(\d+)/g;
export const LITERAL_DOLLAR_PATTERN = /\$(?![&'`$]|\d)/g;

// File extensions
export const MARKDOWN_EXTENSION = 'md';