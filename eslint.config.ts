import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
    stylistic.configs["recommended"],
    { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    tseslint.configs.recommended,
    {
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "@stylistic/indent": ["error", 4],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/member-delimiter-style": "error",
            "@stylistic/type-generic-spacing": "error",
            "@stylistic/type-named-tuple-spacing": "error",
        },
    },
    { ignores: ["dist/**"] },
]);
