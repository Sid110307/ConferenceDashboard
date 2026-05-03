import { Link } from "react-router";

import { Car, Check, CheckCircle, Crown, Shield } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { DATA, statusVariant, PAGES_META } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const VIPPage = () => {
	const done = DATA.vip.checklist.filter(item => item.done).length;

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "vip")?.label || "VIP"}
				subtitle={PAGES_META.find(p => p.id === "vip")?.description || "Day 3 Special Programme"}
			/>
			<div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard
					icon={Crown}
					label="VIP Guests"
					value={DATA.vip.guests.length}
					color="gold"
				/>
				<StatCard
					icon={CheckCircle}
					label="Checklist Done"
					value={`${done}/${DATA.vip.checklist.length}`}
					color="green"
				/>
				<StatCard
					icon={Car}
					label="Vehicles Assigned"
					value={DATA.vip.guests.length}
					color="blue"
				/>
				<StatCard
					icon={Shield}
					label="Security Cleared"
					value={DATA.vip.guests.filter(guest => guest.security).length}
					color="red"
				/>
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<Card>
						<CardHead title="VIP Guest List" />
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-200">
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
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{DATA.vip.guests.map((guest, index) => (
										<tr key={index} className="hover:bg-gray-50">
											<td className="px-4 py-3">
												<Link
													to={AppRoutes.vip(
														guest.name
															.replace(/\s+/g, "-")
															.toLowerCase(),
													)}
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
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Card>
				</div>
				<Card>
					<CardHead title={`VIP Checklist ${done}/${DATA.vip.checklist.length}`} />
					<div className="p-4">
						<div className="mb-4">
							<ProgressBar
								value={done}
								max={DATA.vip.checklist.length}
								color="green"
							/>
						</div>
						<div className="space-y-2.5">
							{DATA.vip.checklist.map((item, index) => (
								<div key={index} className="flex items-center gap-2.5">
									<div
										className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-green-600" : "border border-gray-300 bg-white"}`}
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
		</div>
	);
};
