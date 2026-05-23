import { useState } from "react";

import { api, ApiError } from "@/lib/api";
import { slugify } from "@/lib/format";
import { conferenceCreateSchema, type ConferenceCreateInput } from "@conference/shared";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2 } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DatePickerInput } from "@/components/DatePicker";
import { FieldRow } from "@/components/FieldRow";
import { Input, Textarea } from "@/components/Input";
import { useToast } from "@/components/Toast";

type Me = {
	user: { id: string; name: string; email: string; isPlatformAdmin?: boolean };
};

export const Route = createFileRoute("/new-conference")({
	beforeLoad: async ({ location }) => {
		let me: Me;
		try {
			me = await api.get<Me>("/api/v1/auth/me");
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				throw redirect({
					to: "/login",
					search: { next: `${location.pathname}${location.search}${location.hash}` },
				});
			}
			throw err;
		}

		if (!me.user.isPlatformAdmin) {
			throw redirect({ to: "/" });
		}
	},
	component: NewConferencePage,
});

function NewConferencePage() {
	const navigate = useNavigate();
	const toast = useToast();
	const [form, setForm] = useState({
		name: "",
		shortName: "",
		slug: "",
		startDate: "",
		endDate: "",
		venueName: "",
		description: "",
	});
	const [slugTouched, setSlugTouched] = useState(false);

	const create = useMutation({
		mutationFn: () =>
			api.post<{ data: { slug: string } }>(
				"/api/v1/conferences",
				conferenceCreateSchema.parse({
					name: form.name,
					shortName: form.shortName || undefined,
					slug: form.slug,
					startDate: form.startDate || undefined,
					endDate: form.endDate || undefined,
					venueName: form.venueName || undefined,
					description: form.description || undefined,
				}) as ConferenceCreateInput,
			),
		onSuccess: res => {
			toast.success("Conference created", "Default committees have been seeded.");
			navigate({ to: "/c/$slug", params: { slug: res.data.slug } }).catch(console.error);
		},
		onError: e => toast.error("Could not create conference", e.message),
	});

	const upd = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));
	const valid = form.name && form.slug;

	return (
		<div className="min-h-full">
			<AppHeader />
			<div className="max-w-2xl mx-auto px-6 py-8">
				<Button
					variant="ghost"
					leadingIcon={<ArrowLeft size={14} />}
					onClick={() => navigate({ to: ".." })}
					className="mb-4"
				>
					Back
				</Button>
				<div className="flex items-center gap-3 mb-6">
					<div className="size-10 rounded-lg bg-accent-soft text-accent-soft-fg flex items-center justify-center">
						<Building2 size={20} />
					</div>
					<div>
						<h1 className="text-xl font-semibold text-ink">Create a conference</h1>
						<p className="text-sm text-ink-3">
							Enter the basic details of your conference. You can always edit these
							later.
						</p>
					</div>
				</div>

				<Card>
					<div className="space-y-4">
						<FieldRow label="Conference name" required>
							<Input
								value={form.name}
								onChange={e => {
									upd({ name: e.target.value });
								}}
								placeholder="My New Conference 2026"
							/>
						</FieldRow>
						<div className="grid grid-cols-2 gap-3">
							<FieldRow label="Short name" hint="Used in badges & codes.">
								<Input
									value={form.shortName}
									onChange={e => {
										upd({
											shortName: e.target.value,
											slug: slugTouched ? form.slug : slugify(e.target.value),
										});
									}}
									placeholder="e.g. XYZ26"
								/>
							</FieldRow>
							<FieldRow label="URL slug" required>
								<Input
									value={form.slug}
									onChange={e => {
										setSlugTouched(true);
										upd({ slug: slugify(e.target.value) });
									}}
									placeholder="e.g. xyz26"
								/>
							</FieldRow>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<FieldRow label="Start date">
								<DatePickerInput
									value={form.startDate}
									onChange={startDate => upd({ startDate })}
								/>
							</FieldRow>
							<FieldRow label="End date">
								<DatePickerInput
									value={form.endDate}
									onChange={endDate => upd({ endDate })}
								/>
							</FieldRow>
						</div>
						<FieldRow label="Venue">
							<Input
								value={form.venueName}
								onChange={e => upd({ venueName: e.target.value })}
								placeholder="Convention Center"
							/>
						</FieldRow>
						<FieldRow label="Description">
							<Textarea
								value={form.description}
								onChange={e => upd({ description: e.target.value })}
								placeholder="A brief description of the conference..."
							/>
						</FieldRow>
					</div>
				</Card>

				<div className="mt-4 flex justify-end gap-2">
					<Button variant="ghost" onClick={() => navigate({ to: "/" })}>
						Cancel
					</Button>
					<Button
						variant="primary"
						loading={create.isPending}
						disabled={!valid}
						onClick={() => create.mutate()}
					>
						Create conference
					</Button>
				</div>
			</div>
		</div>
	);
}
