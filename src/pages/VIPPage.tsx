import { useState } from "react";
import { Link } from "react-router";

import { useVipChecklist, type VipChecklistWithRelations } from "@/db/hooks/vipChecklist";
import {
	useDeleteVipGuest,
	useUpsertVipGuest,
	useVipGuests,
	type VipGuestWithRelations,
} from "@/db/hooks/vipGuests";
import { Car, Check, CheckCircle, Crown, Shield } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import EntityDrawer from "@/components/EntityDrawer";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META, statusVariant } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

type VipGuestCard = {
	id: string;
	name: string;
	designation: string;
	protocol: string;
	arrival: string;
	vehicle: string;
	security: boolean;
	speech: boolean;
	status: string;
};

type VipChecklistItem = {
	id: string;
	item: string;
	done: boolean;
};

export const VIPPage = () => {
	const { conferenceId } = useConference();
	const isEditor = useConference()?.isEditor || false;
	const { data: vipGuests = [] } = useVipGuests();
	const upsert = useUpsertVipGuest();
	const remove = useDeleteVipGuest();
	const [editing, setEditing] = useState<VipGuestCard | null>(null);
	const guests: VipGuestCard[] = vipGuests.map((guest: VipGuestWithRelations) => ({
		id: guest.id,
		name: guest.name || "-",
		designation: guest.designation || "",
		protocol: guest.protocol_level || "",
		arrival: guest.arrival_time || "",
		vehicle: guest.vehicle || "",
		security: !!guest.security_required,
		speech: !!guest.speech_required,
		status: guest.status_label || "pending",
	}));
	const { data: checklist = [] } = useVipChecklist();
	const checklistItems: VipChecklistItem[] = checklist.map((item: VipChecklistWithRelations) => ({
		id: item.id,
		item: item.item || "",
		done: !!item.is_done,
	}));
	const done = checklistItems.filter(item => item.done).length;

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title={PAGES_META.find(p => p.id === "vip")?.label || "VIP"}
				subtitle={
					PAGES_META.find(p => p.id === "vip")?.description || "Day 3 Special Programme"
				}
			/>
			<div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard icon={Crown} label="VIP Guests" value={guests.length} color="gold" />
				<StatCard
					icon={CheckCircle}
					label="Checklist Done"
					value={`${done}/${checklist.length}`}
					color="green"
				/>
				<StatCard icon={Car} label="Vehicles Assigned" value={guests.length} color="blue" />
				<StatCard
					icon={Shield}
					label="Security Required"
					value={guests.filter(guest => guest.security).length}
					color="red"
				/>
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<Card>
						<CardHead title="VIP Guest List" />
						{isEditor && (
							<button
								className="mx-4 mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
								onClick={() => setEditing({})}
							>
								+ Add VIP guest
							</button>
						)}
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-100">
										{[
											"Name & Designation",
											"Protocol",
											"Arrival",
											"Vehicle",
											"Security",
											"Speech",
											"Status",
										].map(header => (
											<th
												key={header}
												className="whitespace-nowrap px-4 py-3 text-left font-medium text-zinc-600"
											>
												{header}
											</th>
										))}
										{isEditor && (
											<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-zinc-600">
												Actions
											</th>
										)}
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{guests.map((guest, index) => (
										<tr key={index} className="hover:bg-gray-50">
											<td className="px-4 py-3">
												<Link
													to={AppRoutes.vip(conferenceId, guest.id)}
													className="hover:text-blue-600"
												>
													<p className="whitespace-nowrap font-medium text-zinc-900">
														{guest.name}
													</p>
													<p className="text-xs text-zinc-600">
														{guest.designation}
													</p>
												</Link>
											</td>
											<td className="px-4 py-3">
												<Badge
													variant={
														guest.protocol === "A+" ? "gold" : "blue"
													}
												>
													{guest.protocol}
												</Badge>
											</td>
											<td className="px-4 py-3 font-mono text-xs text-zinc-600">
												{guest.arrival}
											</td>
											<td className="px-4 py-3 text-xs text-zinc-600">
												{guest.vehicle}
											</td>
											<td className="px-4 py-3">
												<Badge variant={guest.security ? "green" : "red"}>
													{guest.security ? "Cleared" : "Pending"}
												</Badge>
											</td>
											<td className="px-4 py-3">
												<Badge variant={guest.speech ? "blue" : "gray"}>
													{guest.speech ? "Yes" : "No"}
												</Badge>
											</td>
											<td className="px-4 py-3">
												<Badge variant={statusVariant(guest.status)}>
													{guest.status}
												</Badge>
											</td>
											{isEditor && (
												<td className="px-4 py-3 text-xs">
													<button
														className="mr-2 rounded-md border border-gray-100 px-2 py-1"
														onClick={() => setEditing(guest)}
													>
														Edit
													</button>
													{guest.id && (
														<button
															className="rounded-md border border-red-200 px-2 py-1 text-red-600"
															onClick={() => remove.mutate(guest.id)}
														>
															Delete
														</button>
													)}
												</td>
											)}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Card>
				</div>
				<Card>
					<CardHead title={`VIP Checklist ${done}/${checklist.length}`} />
					<div className="p-4">
						<div className="mb-4">
							<ProgressBar value={done} max={checklist.length} color="green" />
						</div>
						<div className="space-y-2.5">
							{checklistItems.map((item, index) => (
								<div key={index} className="flex items-center gap-2.5">
									<div
										className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-green-600" : "border border-gray-100 bg-white"}`}
									>
										{item.done && <Check size={9} className="text-white" />}
									</div>
									<span
										className={`text-sm ${item.done ? "text-zinc-600 line-through" : "text-zinc-500"}`}
									>
										{item.item}
									</span>
								</div>
							))}
						</div>
					</div>
				</Card>
			</div>
			{editing !== null && (
				<EntityDrawer
					open
					title={editing?.id ? "Edit VIP guest" : "Add VIP guest"}
					initial={editing}
					fields={[
						{ name: "name", label: "Name" },
						{ name: "designation", label: "Designation" },
						{ name: "protocol", label: "Protocol" },
						{ name: "arrival", label: "Arrival" },
						{ name: "vehicle", label: "Vehicle" },
						{
							name: "security",
							label: "Security",
							type: "select",
							options: ["true", "false"],
						},
						{
							name: "speech",
							label: "Speech",
							type: "select",
							options: ["true", "false"],
						},
						{ name: "status", label: "Status" },
					]}
					onCancel={() => setEditing(null)}
					onSave={async row => {
						await upsert.mutateAsync(row);
						setEditing(null);
					}}
					onDelete={
						editing?.id
							? async () => {
									await remove.mutateAsync(editing.id);
									setEditing(null);
								}
							: undefined
					}
				/>
			)}
		</div>
	);
};
