import { Notice } from 'obsidian';
import VaultFindReplacePlugin from '../main';

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
     * Debug logging - only shown when debug setting is enabled
     */
    debug(message: string, ...data: any[]): void {
        if (this.plugin.settings.enableDebugLogging) {
            console.log(`[${this.context}] DEBUG:`, message, ...data);
        }
    }

    /**
     * Info logging - always shown in console
     */
    info(message: string, ...data: any[]): void {
        console.info(`[${this.context}] INFO:`, message, ...data);
    }

    /**
     * Warning logging - always shown in console
     */
    warn(message: string, ...data: any[]): void {
        console.warn(`[${this.context}] WARN:`, message, ...data);
    }

    /**
     * Error logging - always shown in console and optionally to user
     */
    error(message: string, error?: Error | unknown, showToUser: boolean = false): void {
        const fullMessage = `[${this.context}] ERROR: ${message}`;

        if (error) {
            console.error(fullMessage, error);

            // Show debug info if enabled
            if (this.plugin.settings.enableDebugLogging && error instanceof Error) {
                console.error('Stack trace:', error.stack);
            }
        } else {
            console.error(fullMessage);
        }

        // Show user-friendly notice if requested
        if (showToUser) {
            new Notice(this.getUserFriendlyMessage(message), 5000);
        }
    }

    /**
     * Critical error - always shown to user with notice
     */
    critical(message: string, error?: Error | unknown): void {
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
     * Performance timing utility
     */
    time(label: string): void {
        if (this.plugin.settings.enableDebugLogging) {
            console.time(`[${this.context}] ${label}`);
        }
    }

    /**
     * End performance timing
     */
    timeEnd(label: string): void {
        if (this.plugin.settings.enableDebugLogging) {
            console.timeEnd(`[${this.context}] ${label}`);
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

/**
 * Type-safe error wrapper for async operations
 */
export async function safeAsync<T>(
    operation: () => Promise<T>,
    logger: Logger,
    errorMessage: string,
    showToUser: boolean = false
): Promise<T | null> {
    try {
        return await operation();
    } catch (error) {
        logger.error(errorMessage, error, showToUser);
        return null;
    }
}

/**
 * Type-safe error wrapper for synchronous operations
 */
export function safeSync<T>(
    operation: () => T,
    logger: Logger,
    errorMessage: string,
    showToUser: boolean = false
): T | null {
    try {
        return operation();
    } catch (error) {
        logger.error(errorMessage, error, showToUser);
        return null;
    }
}

/**
 * Validate and safely cast DOM elements
 */
export function safeQuerySelector<T extends Element>(
    parent: Element | Document,
    selector: string,
    logger: Logger,
    required: boolean = true
): T | null {
    try {
        const element = parent.querySelector<T>(selector);

        if (!element && required) {
            logger.error(`Required element not found: ${selector}`);
            return null;
        }

        return element;
    } catch (error) {
        logger.error(`Error querying selector "${selector}"`, error);
        return null;
    }
}

/**
 * Type guard for checking if value is not null or undefined
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

/**
 * Type guard for checking if value is a valid string
 */
export function isValidString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for checking if value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}