/**
 * Application constants
 */

// View type identifier
export const VIEW_TYPE_FIND_REPLACE = 'find-replace-view';

// UI Constants
export const SEARCH_BATCH_SIZE = 10;
export const SEARCH_YIELD_DELAY = 0;
export const CONTEXT_BEFORE_MATCH = 10;
export const CONTEXT_AFTER_MATCH = 50;
export const SEARCH_DEBOUNCE_DELAY = 300;
export const FOCUS_DELAY = 100;
export const MODAL_POLL_INTERVAL = 50;
export const FILTER_UPDATE_DEBOUNCE_DELAY = 500;

// Default settings
export const DEFAULT_HIGHLIGHT_DURATION = 2000;
export const DEFAULT_PERSISTENT_HIGHLIGHT = false;

// Regex patterns for replacement text validation
export const CAPTURE_GROUP_PATTERN = /\$(\d+)/g;
export const LITERAL_DOLLAR_PATTERN = /\$(?![&'`$]|\d)/g;
export const WORD_BOUNDARY_PATTERN = /(^\\b|\\b$|\^|\$|\(\?<!|\(\?=|\(\?!|\(\?<=)/;

// File extensions
export const MARKDOWN_EXTENSION = 'md';