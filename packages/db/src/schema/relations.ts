import { relations } from "drizzle-orm";

import {
	accommodationBlocks,
	accommodationIssues,
	accommodationRooms,
	roomAllocations,
} from "./accommodation";
import { attendees } from "./attendees";
import {
	accounts,
	auditLog,
	sessions as authSessions,
	invitations,
	userConferenceRoles,
	users,
} from "./auth";
import {
	messageCampaigns,
	messageRecipients,
	messageTemplates,
	messagingProviders,
} from "./communications";
import { conferences } from "./conferences";
import { customFieldDefinitions } from "./custom_fields";
import { files } from "./files";
import { financeItems, logisticsItems, sponsors } from "./finance";
import { foodPlans, mealScans } from "./food";
import { helpdeskIssues } from "./helpdesk";
import { importJobs, importRows } from "./imports";
import {
	announcements,
	appSettings,
	certificates,
	dailyControlLogs,
	feedback,
	themeSettings,
} from "./misc";
import {
	conferenceSessions as programmeSessions,
	sessionSpeakers,
	speakers,
	tracks,
	venues,
} from "./programme";
import { reportJobs } from "./reports";
import { committeeAssignments, committees, staff } from "./staff";
import { travelSegments, vehicles } from "./travel";
import { vipChecklist, vipGuests } from "./vip";

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	sessions: many(authSessions),
	conferenceRoles: many(userConferenceRoles, { relationName: "user_conference_roles_user" }),
	invitedConferenceRoles: many(userConferenceRoles, {
		relationName: "user_conference_roles_invited_by",
	}),
	auditEntries: many(auditLog),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
	user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

export const userConferenceRolesRelations = relations(userConferenceRoles, ({ one }) => ({
	user: one(users, {
		fields: [userConferenceRoles.userId],
		references: [users.id],
		relationName: "user_conference_roles_user",
	}),
	conference: one(conferences, {
		fields: [userConferenceRoles.conferenceId],
		references: [conferences.id],
	}),
	invitedBy: one(users, {
		fields: [userConferenceRoles.invitedByUserId],
		references: [users.id],
		relationName: "user_conference_roles_invited_by",
	}),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
	conference: one(conferences, {
		fields: [invitations.conferenceId],
		references: [conferences.id],
	}),
	invitedBy: one(users, {
		fields: [invitations.invitedByUserId],
		references: [users.id],
	}),
}));

export const conferencesRelations = relations(conferences, ({ many, one }) => ({
	memberships: many(userConferenceRoles),
	committees: many(committees),
	staff: many(staff),
	attendees: many(attendees),
	vehicles: many(vehicles),
	travelSegments: many(travelSegments),
	accommodationBlocks: many(accommodationBlocks),
	accommodationRooms: many(accommodationRooms),
	roomAllocations: many(roomAllocations),
	foodPlans: many(foodPlans),
	mealScans: many(mealScans),
	venues: many(venues),
	tracks: many(tracks),
	speakers: many(speakers),
	sessions: many(programmeSessions),
	messagingProviders: many(messagingProviders),
	messageTemplates: many(messageTemplates),
	messageCampaigns: many(messageCampaigns),
	importJobs: many(importJobs),
	customFieldDefinitions: many(customFieldDefinitions),
	reportJobs: many(reportJobs),
	helpdeskIssues: many(helpdeskIssues),
	vipGuests: many(vipGuests),
	financeItems: many(financeItems),
	sponsors: many(sponsors),
	logisticsItems: many(logisticsItems),
	announcements: many(announcements),
	appSettings: many(appSettings),
	themeSettings: one(themeSettings),
	feedback: many(feedback),
	dailyControlLogs: many(dailyControlLogs),
	certificates: many(certificates),
}));

export const committeesRelations = relations(committees, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [committees.conferenceId],
		references: [conferences.id],
	}),
	assignments: many(committeeAssignments),
	vehicles: many(vehicles),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [staff.conferenceId],
		references: [conferences.id],
	}),
	user: one(users, { fields: [staff.userId], references: [users.id] }),
	photo: one(files, { fields: [staff.photoFileId], references: [files.id] }),
	assignments: many(committeeAssignments),
}));

export const committeeAssignmentsRelations = relations(committeeAssignments, ({ one }) => ({
	conference: one(conferences, {
		fields: [committeeAssignments.conferenceId],
		references: [conferences.id],
	}),
	committee: one(committees, {
		fields: [committeeAssignments.committeeId],
		references: [committees.id],
	}),
	staff: one(staff, {
		fields: [committeeAssignments.staffId],
		references: [staff.id],
	}),
}));

export const attendeesRelations = relations(attendees, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [attendees.conferenceId],
		references: [conferences.id],
	}),
	photo: one(files, { fields: [attendees.photoFileId], references: [files.id] }),
	travelSegments: many(travelSegments),
	roomAllocations: many(roomAllocations),
	mealScans: many(mealScans),
	certificates: many(certificates),
	feedback: many(feedback),
	helpdeskIssues: many(helpdeskIssues),
	vipRecords: many(vipGuests),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [vehicles.conferenceId],
		references: [conferences.id],
	}),
	assignedCommittee: one(committees, {
		fields: [vehicles.assignedCommitteeId],
		references: [committees.id],
	}),
	travelSegments: many(travelSegments),
}));

export const travelSegmentsRelations = relations(travelSegments, ({ one }) => ({
	conference: one(conferences, {
		fields: [travelSegments.conferenceId],
		references: [conferences.id],
	}),
	attendee: one(attendees, {
		fields: [travelSegments.attendeeId],
		references: [attendees.id],
	}),
	vehicle: one(vehicles, {
		fields: [travelSegments.vehicleId],
		references: [vehicles.id],
	}),
}));

export const accommodationBlocksRelations = relations(accommodationBlocks, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [accommodationBlocks.conferenceId],
		references: [conferences.id],
	}),
	rooms: many(accommodationRooms),
}));

export const accommodationRoomsRelations = relations(accommodationRooms, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [accommodationRooms.conferenceId],
		references: [conferences.id],
	}),
	block: one(accommodationBlocks, {
		fields: [accommodationRooms.blockId],
		references: [accommodationBlocks.id],
	}),
	allocations: many(roomAllocations),
	issues: many(accommodationIssues),
}));

export const roomAllocationsRelations = relations(roomAllocations, ({ one }) => ({
	conference: one(conferences, {
		fields: [roomAllocations.conferenceId],
		references: [conferences.id],
	}),
	room: one(accommodationRooms, {
		fields: [roomAllocations.roomId],
		references: [accommodationRooms.id],
	}),
	attendee: one(attendees, {
		fields: [roomAllocations.attendeeId],
		references: [attendees.id],
	}),
}));

export const accommodationIssuesRelations = relations(accommodationIssues, ({ one }) => ({
	conference: one(conferences, {
		fields: [accommodationIssues.conferenceId],
		references: [conferences.id],
	}),
	room: one(accommodationRooms, {
		fields: [accommodationIssues.roomId],
		references: [accommodationRooms.id],
	}),
	reportedBy: one(attendees, {
		fields: [accommodationIssues.attendeeId],
		references: [attendees.id],
	}),
}));

export const foodPlansRelations = relations(foodPlans, ({ one }) => ({
	conference: one(conferences, {
		fields: [foodPlans.conferenceId],
		references: [conferences.id],
	}),
}));

export const mealScansRelations = relations(mealScans, ({ one }) => ({
	conference: one(conferences, {
		fields: [mealScans.conferenceId],
		references: [conferences.id],
	}),
	attendee: one(attendees, {
		fields: [mealScans.attendeeId],
		references: [attendees.id],
	}),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [venues.conferenceId],
		references: [conferences.id],
	}),
	sessions: many(programmeSessions),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [tracks.conferenceId],
		references: [conferences.id],
	}),
	sessions: many(programmeSessions),
}));

export const speakersRelations = relations(speakers, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [speakers.conferenceId],
		references: [conferences.id],
	}),
	sessions: many(sessionSpeakers),
}));

export const programmeSessionsRelations = relations(programmeSessions, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [programmeSessions.conferenceId],
		references: [conferences.id],
	}),
	track: one(tracks, {
		fields: [programmeSessions.trackId],
		references: [tracks.id],
	}),
	venue: one(venues, {
		fields: [programmeSessions.venueId],
		references: [venues.id],
	}),
	speakers: many(sessionSpeakers),
	feedback: many(feedback),
}));

export const sessionSpeakersRelations = relations(sessionSpeakers, ({ one }) => ({
	session: one(programmeSessions, {
		fields: [sessionSpeakers.sessionId],
		references: [programmeSessions.id],
	}),
	speaker: one(speakers, {
		fields: [sessionSpeakers.speakerId],
		references: [speakers.id],
	}),
}));

export const messagingProvidersRelations = relations(messagingProviders, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [messagingProviders.conferenceId],
		references: [conferences.id],
	}),
	campaigns: many(messageCampaigns),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [messageTemplates.conferenceId],
		references: [conferences.id],
	}),
	campaigns: many(messageCampaigns),
}));

export const messageCampaignsRelations = relations(messageCampaigns, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [messageCampaigns.conferenceId],
		references: [conferences.id],
	}),
	provider: one(messagingProviders, {
		fields: [messageCampaigns.providerId],
		references: [messagingProviders.id],
	}),
	template: one(messageTemplates, {
		fields: [messageCampaigns.templateId],
		references: [messageTemplates.id],
	}),
	recipients: many(messageRecipients),
}));

export const messageRecipientsRelations = relations(messageRecipients, ({ one }) => ({
	conference: one(conferences, {
		fields: [messageRecipients.conferenceId],
		references: [conferences.id],
	}),
	campaign: one(messageCampaigns, {
		fields: [messageRecipients.campaignId],
		references: [messageCampaigns.id],
	}),
	attendee: one(attendees, {
		fields: [messageRecipients.attendeeId],
		references: [attendees.id],
	}),
	staff: one(staff, {
		fields: [messageRecipients.staffId],
		references: [staff.id],
	}),
}));

export const importJobsRelations = relations(importJobs, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [importJobs.conferenceId],
		references: [conferences.id],
	}),
	sourceFile: one(files, {
		fields: [importJobs.fileId],
		references: [files.id],
	}),
	rows: many(importRows),
}));

export const importRowsRelations = relations(importRows, ({ one }) => ({
	job: one(importJobs, {
		fields: [importRows.jobId],
		references: [importJobs.id],
	}),
}));

export const customFieldDefinitionsRelations = relations(customFieldDefinitions, ({ one }) => ({
	conference: one(conferences, {
		fields: [customFieldDefinitions.conferenceId],
		references: [conferences.id],
	}),
}));

export const reportJobsRelations = relations(reportJobs, ({ one }) => ({
	conference: one(conferences, {
		fields: [reportJobs.conferenceId],
		references: [conferences.id],
	}),
	file: one(files, { fields: [reportJobs.fileId], references: [files.id] }),
}));

export const helpdeskIssuesRelations = relations(helpdeskIssues, ({ one }) => ({
	conference: one(conferences, {
		fields: [helpdeskIssues.conferenceId],
		references: [conferences.id],
	}),
	attendee: one(attendees, {
		fields: [helpdeskIssues.attendeeId],
		references: [attendees.id],
	}),
	assignedStaff: one(staff, {
		fields: [helpdeskIssues.assignedToStaffId],
		references: [staff.id],
	}),
	assignedCommittee: one(committees, {
		fields: [helpdeskIssues.assignedCommitteeId],
		references: [committees.id],
	}),
}));

export const vipGuestsRelations = relations(vipGuests, ({ one, many }) => ({
	conference: one(conferences, {
		fields: [vipGuests.conferenceId],
		references: [conferences.id],
	}),
	attendee: one(attendees, {
		fields: [vipGuests.attendeeId],
		references: [attendees.id],
	}),
	liaisonStaff: one(staff, {
		fields: [vipGuests.liaisonStaffId],
		references: [staff.id],
	}),
	checklist: many(vipChecklist),
}));

export const vipChecklistRelations = relations(vipChecklist, ({ one }) => ({
	conference: one(conferences, {
		fields: [vipChecklist.conferenceId],
		references: [conferences.id],
	}),
	vipGuest: one(vipGuests, {
		fields: [vipChecklist.vipGuestId],
		references: [vipGuests.id],
	}),
}));

export const financeItemsRelations = relations(financeItems, ({ one }) => ({
	conference: one(conferences, {
		fields: [financeItems.conferenceId],
		references: [conferences.id],
	}),
	invoiceFile: one(files, {
		fields: [financeItems.invoiceFileId],
		references: [files.id],
	}),
}));

export const sponsorsRelations = relations(sponsors, ({ one }) => ({
	conference: one(conferences, {
		fields: [sponsors.conferenceId],
		references: [conferences.id],
	}),
	logo: one(files, { fields: [sponsors.logoFileId], references: [files.id] }),
}));

export const logisticsItemsRelations = relations(logisticsItems, ({ one }) => ({
	conference: one(conferences, {
		fields: [logisticsItems.conferenceId],
		references: [conferences.id],
	}),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
	conference: one(conferences, {
		fields: [announcements.conferenceId],
		references: [conferences.id],
	}),
}));

export const appSettingsRelations = relations(appSettings, ({ one }) => ({
	conference: one(conferences, {
		fields: [appSettings.conferenceId],
		references: [conferences.id],
	}),
}));

export const themeSettingsRelations = relations(themeSettings, ({ one }) => ({
	conference: one(conferences, {
		fields: [themeSettings.conferenceId],
		references: [conferences.id],
	}),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
	conference: one(conferences, {
		fields: [feedback.conferenceId],
		references: [conferences.id],
	}),
	session: one(programmeSessions, {
		fields: [feedback.sessionId],
		references: [programmeSessions.id],
	}),
	attendee: one(attendees, {
		fields: [feedback.attendeeId],
		references: [attendees.id],
	}),
}));

export const dailyControlLogsRelations = relations(dailyControlLogs, ({ one }) => ({
	conference: one(conferences, {
		fields: [dailyControlLogs.conferenceId],
		references: [conferences.id],
	}),
	staff: one(staff, {
		fields: [dailyControlLogs.shiftHeadStaffId],
		references: [staff.id],
	}),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
	conference: one(conferences, {
		fields: [certificates.conferenceId],
		references: [conferences.id],
	}),
	attendee: one(attendees, {
		fields: [certificates.attendeeId],
		references: [attendees.id],
	}),
	file: one(files, {
		fields: [certificates.certificateFileId],
		references: [files.id],
	}),
}));

export const filesRelations = relations(files, ({ one }) => ({
	conference: one(conferences, {
		fields: [files.conferenceId],
		references: [conferences.id],
	}),
	uploader: one(users, {
		fields: [files.uploadedByUserId],
		references: [users.id],
	}),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
	user: one(users, {
		fields: [auditLog.userId],
		references: [users.id],
	}),
}));
