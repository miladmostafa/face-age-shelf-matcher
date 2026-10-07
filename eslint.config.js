import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "public/**", "node_modules/**", "coverage/**", "scripts/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
