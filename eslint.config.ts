import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores([
        "dist/**",
        "public/**",
        "migrations/**",
        "coverage/**",
        "proto/**",
        "src/grpc/generated/**",
        "scripts/**",
        "eslint.config.ts",
    ]),

    {
        files: ["src/**/*.ts"],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: {
                projectService: true,
            },
        },
        plugins: {
            import: importPlugin,
            "simple-import-sort": simpleImportSort,
            "unused-imports": unusedImports,
        },
        settings: {
            "import/resolver": {
                typescript: {
                    alwaysTryTypes: true,
                    project: "./tsconfig.json",
                },
            },
        },
        rules: {
            // general
            "no-undef": "off",
            curly: ["error", "all"],
            eqeqeq: ["error", "always"],
            "no-console": "error",
            "no-else-return": "error",
            "no-useless-return": "error",
            "no-var": "error",
            "object-shorthand": "error",
            "prefer-const": "error",
            "no-constant-condition": ["error", { checkLoops: false }],
            "no-throw-literal": "error",
            "no-return-await": "error",
            "require-atomic-updates": "error",
            "consistent-return": "error",

            // imports
            "import/first": "error",
            "import/newline-after-import": "error",
            "import/no-duplicates": "error",
            "import/no-unresolved": "error",
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "unused-imports/no-unused-imports": "error",

            // TypeScript
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/no-namespace": "error",
            "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports",
                    fixStyle: "inline-type-imports",
                },
            ],
            "@typescript-eslint/no-import-type-side-effects": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "error",
            "@typescript-eslint/prefer-optional-chain": "error",
            "@typescript-eslint/prefer-includes": "error",
            "@typescript-eslint/prefer-string-starts-ends-with": "error",
            "@typescript-eslint/prefer-readonly": "warn",
            "@typescript-eslint/switch-exhaustiveness-check": "error",
            "@typescript-eslint/no-unnecessary-condition": "warn",
            "@typescript-eslint/no-confusing-void-expression": [
                "error",
                {
                    ignoreArrowShorthand: true,
                    ignoreVoidOperator: true,
                },
            ],
            "@typescript-eslint/only-throw-error": "error",
            "@typescript-eslint/prefer-promise-reject-errors": "error",
            "@typescript-eslint/promise-function-async": "error",

            // type-aware safety
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/no-unnecessary-type-assertion": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/restrict-template-expressions": [
                "error",
                {
                    allowNumber: true,
                    allowBoolean: true,
                    allowNullish: true,
                },
            ],

            // intentionally off
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
        },
    },

    {
        files: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/__tests__/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/prefer-promise-reject-errors": "off",
            "no-console": "off",
        },
    },

    {
        files: ["src/server.ts", "src/db/migrate.ts", "src/utils/logger.ts", "src/grpc/server.ts"],
        rules: {
            "no-console": "off",
        },
    },

    {
        files: ["src/middleware/request.middleware.ts"],
        rules: {
            "@typescript-eslint/no-namespace": "off",
        },
    },

    eslintConfigPrettier,
]);
