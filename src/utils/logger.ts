import { Notice } from 'obsidian';
import VaultFindReplacePlugin from '../main';
import { LogLevel } from '../types/settings';

/**
 * Centralized logging utility with debug control and user-friendly error handling
 */
export class Logger {
    private plugin: VaultFindReplacePlugin;
    private context: string;

    constructor(plugin: VaultFindReplacePlugin, context: string = 'VaultFindReplace') {
        this.plugin = plugin;
        this.context = context;
    }

    /**
     * Safely get log level with fallback to ERROR if settings not available
     */
    private getLogLevel(): LogLevel {
        return this.plugin?.settings?.logLevel ?? LogLevel.ERROR;
    }

    /**
     * Trace logging - maximum verbosity for core development
     */
    trace(message: string, ...data: unknown[]): void {
        if (this.getLogLevel() >= LogLevel.TRACE) {
            console.debug(`[${this.context}] TRACE:`, message, ...data);
        }
    }

    /**
     * Debug logging - detailed information for troubleshooting
     */
    debug(message: string, ...data: unknown[]): void {
        if (this.getLogLevel() >= LogLevel.DEBUG) {
            console.debug(`[${this.context}] DEBUG:`, message, ...data);
        }
    }

    /**
     * Info logging - general operational information
     */
    info(message: string, ...data: unknown[]): void {
        if (this.getLogLevel() >= LogLevel.INFO) {
            console.debug(`[${this.context}] INFO:`, message, ...data);
        }
    }

    /**
     * Warning logging - important events that should be noted
     */
    warn(message: string, ...data: unknown[]): void {
        if (this.getLogLevel() >= LogLevel.WARN) {
            console.warn(`[${this.context}] WARN:`, message, ...data);
        }
    }

    /**
     * Error logging - critical failures (always shown unless SILENT)
     */
    error(message: string, error?: unknown, showToUser: boolean = false): void {
        if (this.getLogLevel() >= LogLevel.ERROR) {
            const fullMessage = `[${this.context}] ERROR: ${message}`;

            if (error) {
                console.error(fullMessage, error);

                // Show debug info if debug level or higher
                if (this.getLogLevel() >= LogLevel.DEBUG && error instanceof Error) {
                    console.error('Stack trace:', error.stack);
                }
            } else {
                console.error(fullMessage);
            }
        }

        // Show user-friendly notice if requested (regardless of log level for critical errors)
        if (showToUser) {
            new Notice(this.getUserFriendlyMessage(message), 5000);
        }
    }

    /**
     * Critical error - always shown to user with notice
     */
    critical(message: string, error?: unknown): void {
        this.error(message, error, true);
    }

    /**
     * Success message - shown to user as notice
     */
    success(message: string): void {
        this.info(message);
        new Notice(message, 3000);
    }

    /**
     * Performance timing utility - trace level
     */
    time(label: string): void {
        if (this.getLogLevel() >= LogLevel.TRACE) {
            console.debug(`[${this.context}] ${label} - START`);
        }
    }

    /**
     * End performance timing - trace level
     */
    timeEnd(label: string): void {
        if (this.getLogLevel() >= LogLevel.TRACE) {
            console.debug(`[${this.context}] ${label} - END`);
        }
    }

    /**
     * Convert technical error messages to user-friendly ones
     */
    private getUserFriendlyMessage(message: string): string {
        // Map technical errors to user-friendly messages
        const errorMappings: Record<string, string> = {
            'Search failed': 'Search could not be completed. Please try a different search term.',
            'Replace failed': 'Replacement operation failed. Please check the file permissions.',
            'File not found': 'The file could not be found or accessed.',
            'Invalid regex': 'The search pattern is not valid. Please check your regex syntax.',
            'Performance limit exceeded': 'Too many results found. Please refine your search.',
            'Network error': 'A network error occurred. Please check your connection.',
            'Permission denied': 'Permission denied. Please check file access rights.',
        };

        // Try to find a user-friendly version
        for (const [technical, friendly] of Object.entries(errorMappings)) {
            if (message.toLowerCase().includes(technical.toLowerCase())) {
                return friendly;
            }
        }

        // Return original message if no mapping found
        return message;
    }

    /**
     * Create a logger for a specific context
     */
    static create(plugin: VaultFindReplacePlugin, context: string): Logger {
        return new Logger(plugin, context);
    }
}