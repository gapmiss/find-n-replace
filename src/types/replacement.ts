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
}