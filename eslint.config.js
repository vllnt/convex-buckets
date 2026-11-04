import { base } from "@vllnt/eslint-config";
import convex from "@vllnt/eslint-config/convex";

export default [
  { ignores: ["dist/**", "**/_generated/**", "coverage/**"] },
  ...base,
  ...convex,
  {
    languageOptions: {
      parserOptions: { project: "./tsconfig.lint.json", projectService: false },
    },
  },
  // Apply convex rules to component source (same structure as a convex/ folder)
  {
    files: ["src/component/**/*.ts"],
    ignores: ["src/component/_generated/**"],
    rules: {
      "convex-rules/namespace-separation": "error",
      "convex-rules/no-bare-v-any": "error",
      "convex-rules/no-filter-on-query": "error",
      "convex-rules/no-query-in-loop": "error",
      "convex-rules/require-returns-validator": "error",
      "convex-rules/snake-case-filenames": "error",
      "convex-rules/standard-filenames": "error",
    },
  },
  // Exempt config, validator, and schema files from strict naming rules
  {
    files: [
      "src/component/convex.config.ts",
      "src/component/validators.ts",
      "src/component/schema.ts",
    ],
    rules: {
      "convex-rules/namespace-separation": "off",
      "convex-rules/standard-filenames": "off",
    },
  },
  // Rule IDs in this file are external names, not camelCase identifiers.
  {
    files: ["eslint.config.js"],
    rules: { "@typescript-eslint/naming-convention": "off" },
  },
  // Positional client methods match the sibling stable components.
  {
    files: ["src/client/index.ts"],
    rules: { "max-params": "off" },
  },
  // Convex requires null for absent results and first-page cursors.
  {
    files: ["src/component/queries.ts", "example/**"],
    rules: { "unicorn/no-null": "off" },
  },
];
