import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: [
            "dist/**", 
            "node_modules/**", 
            "**/*.js", 
            "!eslint.config.js",
            "coverage/**",
            "public/**",
            "migrations/**",
            "proto/**",
            "examples/**"
        ],
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-namespace": "error",
            "no-console": "warn",
            "prefer-const": "error",
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
        files: ["src/grpc/**/*.ts"],
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
);
