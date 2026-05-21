import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tsEslint from "typescript-eslint";

export default defineConfig([
	globalIgnores(["dist", "node_modules", "build", "coverage"]),
	js.configs.recommended,
	...tsEslint.configs.recommended,
	{
		files: ["**/*.{ts,tsx}"],
		ignores: ["apps/web/**/*"],
		plugins: { "unused-imports": unusedImports },
		languageOptions: {
			parser: tsEslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				...globals.es2022,
				...globals.node,
			},
		},
		rules: {
			"unused-imports/no-unused-imports": "error",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					vars: "all",
					args: "after-used",
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
		},
	},
	{
		files: ["apps/web/**/*.{ts,tsx}"],
		plugins: {
			react,
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
			"unused-imports": unusedImports,
		},
		languageOptions: {
			parser: tsEslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: { jsx: true },
			},
			globals: {
				...globals.browser,
				...globals.es2022,
			},
		},
		settings: { react: { version: "detect" } },
		rules: {
			...react.configs.recommended.rules,
			...react.configs["jsx-runtime"].rules,
			...reactHooks.configs.recommended.rules,
			"react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					vars: "all",
					args: "after-used",
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"react-hooks/set-state-in-effect": "off",
		},
	},
]);
