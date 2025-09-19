import { TFile } from 'obsidian';
import { SearchResult } from './search';

/**
 * Replacement operation types
 */
export type ReplacementMode = "one" | "selected" | "file" | "vault";

/**
 * Replacement operation target
 */
export type ReplacementTarget = SearchResult | TFile | undefined;

/**
 * Replacement validation result
 */
export interface ReplacementValidation {
    isValid: boolean;
    warnings: string[];
    errors: string[];
}

/**
 * Replacement operation result
 */
export interface ReplacementResult {
    mode: ReplacementMode;
    totalReplacements: number;
    filesModified: number;
    duration: number; // in milliseconds
    errors: string[];
    affectedResults?: AffectedResults; // Metadata for incremental UI updates
}

/**
 * Metadata about which results were affected by a replacement operation
 * Used for incremental UI updates instead of full re-search
 */
export interface AffectedResults {
    // Results that were replaced and should be removed from UI
    replacedResultIndices: number[];
    // Files that had content modified (for re-validation)
    modifiedFiles: Set<TFile>;
    // Lines that were modified in each file (for targeted re-checking)
    modifiedLines: Map<TFile, Set<number>>;
    // Whether this replacement might affect other results (e.g., regex with global effects)
    requiresFullRevalidation: boolean;
}