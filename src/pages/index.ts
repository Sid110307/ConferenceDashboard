import React from "react";

import { PAGES_META } from "@/core/data";
import pageRegistry from "@/core/pageRegistry";

type PageComponent = React.ComponentType<Record<string, never>>;

const PAGE_IMPORTS = pageRegistry.getRegisteredPages();

export const PAGES = PAGES_META.reduce<Record<string, React.LazyExoticComponent<PageComponent>>>(
	(acc, meta) => {
		const page = PAGE_IMPORTS[meta.id];
		if (page) acc[meta.id] = page;
		return acc;
	},
	{},
);
