import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        ignores: ["dist/**", "node_modules/**", "**/*.js", "public/**", "migrations/**", "proto/**"],
    },

    {
        files: ["**/*.ts"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/no-namespace": "error",

            "no-console": "error",
            "prefer-const": "error",
            eqeqeq: ["error", "always"],
            curly: ["error", "all"],
            "no-var": "error",
            "no-duplicate-imports": "error",
            "object-shorthand": "error",
            "no-useless-return": "error",
            "no-else-return": "error",
        },
    },

    {
        files: ["**/*.test.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
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
        files: ["src/grpc/generated/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        },
    },

    {
        files: ["src/middleware/request.middleware.ts"],
        rules: {
            "@typescript-eslint/no-namespace": "off",
        },
    },
]);