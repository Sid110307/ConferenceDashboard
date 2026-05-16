const formatPath = (conferenceid: string | undefined, path: string): string => {
	return conferenceid ? `/c/${conferenceid}/${path}` : path;
};

export const Routes = {
	dashboard: (conferenceid?: string) => formatPath(conferenceid, ""),
	attendees: (conferenceid?: string, attendeeId?: string) =>
		formatPath(conferenceid, attendeeId ? `attendees/${attendeeId}` : "attendees"),
	checkin: (conferenceid?: string, checkInId?: string) =>
		formatPath(conferenceid, checkInId ? `checkin/${checkInId}` : "checkin"),
	accommodation: (conferenceid?: string, roomId?: string) =>
		formatPath(conferenceid, roomId ? `accommodation/${roomId}` : "accommodation"),
	travel: (conferenceid?: string, travelId?: string) =>
		formatPath(conferenceid, travelId ? `travel/${travelId}` : "travel"),
	feedback: (conferenceid?: string, feedbackId?: string) =>
		formatPath(conferenceid, feedbackId ? `feedback/${feedbackId}` : "feedback"),
	food: (conferenceid?: string, dayId?: string) =>
		formatPath(conferenceid, dayId ? `food/${dayId}` : "food"),
	schedule: (conferenceid?: string, dayId?: string) =>
		formatPath(conferenceid, dayId ? `schedule/${dayId}` : "schedule"),
	vip: (conferenceid?: string, vipId?: string) =>
		formatPath(conferenceid, vipId ? `vip/${vipId}` : "vip"),
	logistics: (conferenceid?: string, logisticsId?: string) =>
		formatPath(conferenceid, logisticsId ? `logistics/${logisticsId}` : "logistics"),
	venue: (conferenceid?: string, venueId?: string) =>
		formatPath(conferenceid, venueId ? `venue/${venueId}` : "venue"),
	volunteers: (conferenceid?: string, volunteerId?: string) =>
		formatPath(conferenceid, volunteerId ? `volunteers/${volunteerId}` : "volunteers"),
	helpdesk: (conferenceid?: string, issueId?: string) =>
		formatPath(conferenceid, issueId ? `helpdesk/${issueId}` : "helpdesk"),
	finance: (conferenceid?: string, financialId?: string) =>
		formatPath(conferenceid, financialId ? `finance/${financialId}` : "finance"),
	reports: (conferenceid?: string) => formatPath(conferenceid, "reports"),
	settings: (conferenceid?: string) => formatPath(conferenceid, "settings"),
};
