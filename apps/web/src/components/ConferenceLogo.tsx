import { api } from "@/lib/api";
import { useConference } from "@/lib/ConferenceContext";
import { cx } from "@/lib/uiStyles";
import { useQuery } from "@tanstack/react-query";

type ThemeSettings = {
	logoFileId?: string | null;
};

export function ConferenceLogo({ className, alt }: { className?: string; alt?: string }) {
	const { conference } = useConference();

	const theme = useQuery<{ data: ThemeSettings }>({
		queryKey: ["conf-theme", conference.slug],
		queryFn: () =>
			api.get<{ data: ThemeSettings }>(`/api/v1/c/${conference.slug}/settings/theme`),
		staleTime: 60_000,
	});

	const logoFileId = theme.data?.data?.logoFileId ?? null;
	const logoPreview = useQuery<{ url: string }>({
		queryKey: ["conf-theme-logo", conference.slug, logoFileId],
		queryFn: () =>
			api.get<{ url: string }>(`/api/v1/c/${conference.slug}/files/${logoFileId}/download`),
		enabled: !!logoFileId,
		staleTime: 1000 * 60 * 10,
	});

	if (!logoFileId || !logoPreview.data?.url) return null;
	return (
		<img
			src={logoPreview.data.url}
			alt={alt ?? `${conference.name} logo`}
			className={cx("object-contain border border-line rounded-md", className)}
		/>
	);
}
