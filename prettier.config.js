/**
 * @type {import("prettier").Config}
 */
export default {
	tabWidth: 4,
	useTabs: true,
	trailingComma: "all",
	singleQuote: false,
	bracketSpacing: true,
	arrowParens: "avoid",
	printWidth: 100,
	bracketSameLine: false,
	semi: true,
	quoteProps: "consistent",
	importOrder: [
		"^react(.*)$",
		"<BUILTIN_MODULES>",
		"",
		"<THIRD_PARTY_MODULES>",
		"",
		"^(.*)assets(.*)$",
		"",
		"^(.*)pages(.*)$",
		"",
		"^(.*)components(.*)$",
		"",
		"^(.*)core(.*)$",
		"",
		"^[.]",
	],
	importOrderTypeScriptVersion: "5.0.0",
	plugins: ["@ianvs/prettier-plugin-sort-imports"],
};
