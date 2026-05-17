const ACRONYMS = new Set(["vip", "id", "pa", "ui", "api", "qr"]);

const formatSegment = (segment: string) => {
	if (!segment) return "";
	if (/^[A-Z0-9/&-]+$/.test(segment) && segment === segment.toUpperCase()) {
		return segment;
	}

	const lower = segment.toLowerCase();
	if (ACRONYMS.has(lower)) return lower.toUpperCase();

	return `${segment[0].toUpperCase()}${segment.slice(1).toLowerCase()}`;
};

export const formatLabel = (value?: string | null) => {
	if (!value) return "";

	return value
		.replace(/[_-]+/g, " ")
		.split(/\s+/)
		.filter(Boolean)
		.map(part => part.split("/").map(formatSegment).join("/"))
		.join(" ");
};
