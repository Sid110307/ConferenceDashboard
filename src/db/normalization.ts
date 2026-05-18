export const relationToId = <T extends { id: string }>(
	value: string | T | null | undefined,
): string | null => {
	if (!value) return null;
	return typeof value === "string" ? value : value.id;
};

type MutableRecord = Record<string, unknown>;

export const createRelationStripper = <T extends MutableRecord>(relationKeys: (keyof T)[]) => {
	return (row: Partial<T>): Partial<T> => {
		const stripped: Partial<T> = { ...row };
		relationKeys.forEach(key => {
			delete stripped[key];
		});
		return stripped;
	};
};

export const createRelationMapper = <Raw extends MutableRecord, Mapped extends MutableRecord>(
	mappings: Record<string, string>,
) => {
	const aliasKeys = Object.keys(mappings);

	return (raw: Raw): Mapped => {
		const mapped: MutableRecord = { ...raw };
		for (const [alias, fieldName] of Object.entries(mappings)) {
			if (alias in mapped) {
				mapped[fieldName] = mapped[alias];
				delete mapped[alias];
			}
		}

		aliasKeys.forEach(key => {
			delete mapped[key];
		});

		return mapped as Mapped;
	};
};

export const normalizeRelations = <Raw extends MutableRecord, Mapped>(
	results: Raw[],
	mapper: (raw: Raw) => Mapped,
): Mapped[] => {
	return results.map(mapper);
};
