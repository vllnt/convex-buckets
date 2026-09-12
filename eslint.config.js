import { base } from "@vllnt/eslint-config";
import convex from "@vllnt/eslint-config/convex";
import tseslint from "typescript-eslint";

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
    languageOptions: {
      parser: tseslint.parser,
    },
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
];
