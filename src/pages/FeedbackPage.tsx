import { CheckCircle, Clock, Download, MessageSquare, Star } from "lucide-react";

import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

export const FeedbackPage = () => (
	<div>
		<SectionTitle
			title="Feedback & Certificates"
			subtitle="Post-event feedback and certificate management"
		/>
		<div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
			<StatCard icon={MessageSquare} label="Feedback Received" value="147" color="blue" />
			<StatCard icon={Star} label="Average Rating" value="4.2 / 5" color="yellow" />
			<StatCard icon={CheckCircle} label="Certs Generated" value="0" color="gray" />
			<StatCard icon={Download} label="Certs Downloaded" value="0" color="gray" />
		</div>
		<Card className="p-10 text-center">
			<Clock size={32} className="mx-auto mb-3 text-zinc-700" />
			<p className="font-medium text-zinc-400">Feedback collection active</p>
			<p className="mt-1 text-sm text-zinc-600">
				Certificate generation will open after Day 3 concludes on December 17.
			</p>
		</Card>
	</div>
);
