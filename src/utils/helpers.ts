/**
 * Utility helper functions
 */

/**
 * Creates a debounced version of a function
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

/**
 * Escapes special regex characters for literal matching
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Formats file size in human readable format
 * @param bytes - Size in bytes
 * @returns Formatted string
 */
export function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Pluralizes a word based on count
 * @param count - Number to check
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + 's')
 * @returns Pluralized string
 */
export function pluralize(count: number, singular: string, plural?: string): string {
    if (count === 1) {
        return singular;
    }
    return plural || (singular + 's');
}

/**
 * Creates a delay promise
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if a keyboard event represents an activation key (Enter or Space)
 * @param event - Keyboard event
 * @returns true if activation key
 */
export function isActivationKey(event: KeyboardEvent): boolean {
    return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}

/**
 * Safely gets the text content of an element
 * @param element - HTML element
 * @returns Text content or empty string
 */
export function getTextContent(element: HTMLElement | null): string {
    return element?.textContent || '';
}

/**
 * Creates a cache key from an object
 * @param obj - Object to create key from
 * @returns Cache key string
 */
export function createCacheKey(obj: any): string {
    return JSON.stringify(obj);
}

/**
 * Validates if a string is a valid regex pattern
 * @param pattern - Pattern to validate
 * @returns true if valid regex
 */
export function isValidRegex(pattern: string): boolean {
    try {
        new RegExp(pattern);
        return true;
    } catch {
        return false;
    }
}

/**
 * Truncates text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Creates a promise that can be resolved externally
 * @returns Object with promise and resolve/reject functions
 */
export function createDeferredPromise<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
} {
    let resolve: (value: T) => void;
    let reject: (reason?: any) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve: resolve!, reject: reject! };
}

/**
 * Removes file extension from filename
 * @param filename - Filename with extension
 * @returns Filename without extension
 */
export function removeFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return filename;
    }
    return filename.slice(0, lastDotIndex);
}

/**
 * Formats a count with proper pluralization
 * @param count - Number to format
 * @param singular - Singular form
 * @param plural - Plural form
 * @returns Formatted count string
 */
export function formatCount(count: number, singular: string, plural?: string): string {
    return `${count} ${pluralize(count, singular, plural)}`;
}