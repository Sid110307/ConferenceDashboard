import React, { type FC } from "react";

import { PAGES_META } from "@/core/data";
import pageRegistry from "@/core/pageRegistry";

// Build pages map from the runtime registry. This allows other modules to call
// registerPage(...) and override or add pages dynamically.
const PAGE_IMPORTS = pageRegistry.getRegisteredPages();

export const PAGES: Record<string, React.LazyExoticComponent<FC<any>>> = PAGES_META.reduce(
    (acc, meta) => {
        if (PAGE_IMPORTS[meta.id]) acc[meta.id] = PAGE_IMPORTS[meta.id] as React.LazyExoticComponent<FC<any>>;
        return acc;
    },
    {} as Record<string, React.LazyExoticComponent<FC<any>>>,
);
