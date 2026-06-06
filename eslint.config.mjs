// eslint.config.mjs
import tsParser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
    // Global ignores
    { ignores: ["node_modules/**", "main.js", "*.mjs", "*.config.ts", "package.json", "package-lock.json", "versions.json", "tsconfig.json", "src/tests/**"] },

    // TypeScript type-checked rules for production code only
    ...tseslint.configs.recommendedTypeChecked.map(config => ({
        ...config,
        files: ["src/**/*.ts"],
        ignores: ["src/tests/**"],
    })),

    // Obsidian plugin rules
    ...obsidianmd.configs.recommended,

    // Production code config
    {
        files: ["src/**/*.ts"],
        ignores: ["src/tests/**"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: "./tsconfig.json",
                sourceType: "module",
            },
        },
        rules: {
            // Console: scanner allows warn, error, debug only
            "no-console": ["error", { allow: ["warn", "error", "debug"] }],
            // Allow underscore-prefixed unused params
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            }],
            // Keep existing relaxed rules
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-empty-function": "off",
            "no-prototype-builtins": "off",
            // Enable prefer-active-doc for popout window support
            "obsidianmd/prefer-active-doc": "error",
            // Disabled by default in v0.3.0 (not working as intended)
            "obsidianmd/ui/sentence-case": "off",
        },
    },
];
