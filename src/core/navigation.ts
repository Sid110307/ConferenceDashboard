export const Routes = {
	dashboard: () => "/",
	attendees: (attendeeId?: string) => (attendeeId ? `/attendees/${attendeeId}` : "/attendees"),
	checkin: (checkInId?: string) => (checkInId ? `/checkin/${checkInId}` : "/checkin"),
	accommodation: (roomId?: string) => (roomId ? `/accommodation/${roomId}` : "/accommodation"),
	travel: (travelId?: string) => (travelId ? `/travel/${travelId}` : "/travel"),
	feedback: (feedbackId?: string) => (feedbackId ? `/feedback/${feedbackId}` : "/feedback"),
	food: (dayId?: string) => (dayId ? `/food/${dayId}` : "/food"),
	schedule: (dayId?: string) => (dayId ? `/schedule/${dayId}` : "/schedule"),
	vip: (vipId?: string) => (vipId ? `/vip/${vipId}` : "/vip"),
	logistics: (logisticsId?: string) => (logisticsId ? `/logistics/${logisticsId}` : "/logistics"),
	venue: (venueId?: string) => (venueId ? `/venue/${venueId}` : "/venue"),
	volunteers: (volunteerId?: string) =>
		volunteerId ? `/volunteers/${volunteerId}` : "/volunteers",
	helpdesk: (issueId?: string) => (issueId ? `/helpdesk/${issueId}` : "/helpdesk"),
	finance: (financialId?: string) => (financialId ? `/finance/${financialId}` : "/finance"),
	reports: () => "/reports",
	settings: () => "/settings",
};
