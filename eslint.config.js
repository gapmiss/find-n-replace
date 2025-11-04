import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Obsidian recommended configuration (spreads into flat config format)
  ...obsidianmd.configs.recommended,

  // TypeScript configuration without type-checking rules
  ...tseslint.configs.recommendedTypeChecked.map(config => ({
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  })),

  // Custom rules
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "args": "none" }],
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",
      "no-prototype-builtins": "off"
    }
  }
);
