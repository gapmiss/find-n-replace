import { ReplacementMode, ReplacementTarget } from './replacement';

/**
 * Event callback types
 */
export type PerformSearchCallback = () => Promise<void>;
export type ReplaceCallback = (mode: ReplacementMode, target?: ReplacementTarget) => Promise<void>;
export type ConfirmCallback = (message: string) => Promise<boolean>;
export type NavigationCallback = (filePath: string, line: number, col: number) => Promise<void>;
export type SelectionChangeCallback = (selectedCount: number) => void;
export type SearchCompleteCallback = (resultCount: number, duration: number) => void;