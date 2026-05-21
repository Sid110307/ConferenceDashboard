import {
	GENDERS,
	PICKUP_STATUSES,
	ROOM_TYPES,
	TRAVEL_DIRECTIONS,
	TRAVEL_MODES,
	type Gender,
	type PickupStatus,
	type RoomType,
	type TravelDirection,
	type TravelMode,
} from "@/constants";
import {
	customFieldsSchema,
	emailSchema,
	isoDateSchema,
	isoDatetimeSchema,
	moneySchema,
	phoneSchema,
	slugSchema,
	uuidSchema,
} from "@/schemas/common";
import { z } from "zod";

export const committeeCreateSchema = z.object({
	slug: slugSchema,
	name: z.string().trim().min(1).max(120),
	description: z.string().max(2000).optional(),
	color: z.string().max(16).optional(),
	icon: z.string().max(64).optional(),
	sortOrder: z.number().int().min(0).default(0),
	isEnabled: z.boolean().default(true),
	leadName: z.string().max(255).optional(),
	leadPhone: phoneSchema.optional(),
	leadEmail: emailSchema.optional(),
	notes: z.string().max(2000).optional(),
});

export const committeeUpdateSchema = committeeCreateSchema.partial();

export const staffCreateSchema = z.object({
	staffCode: z.string().max(32).optional(),
	salutation: z.string().max(16).optional(),
	name: z.string().trim().min(1).max(255),
	gender: z.enum(GENDERS as readonly [Gender, ...Gender[]]).optional(),
	designation: z.string().max(255).optional(),
	department: z.string().max(255).optional(),
	institution: z.string().max(255).optional(),
	prantha: z.string().max(120).optional(),
	city: z.string().max(120).optional(),
	state: z.string().max(120).optional(),
	country: z.string().max(120).optional(),
	email: emailSchema.optional(),
	phone: phoneSchema.optional(),
	altPhone: phoneSchema.optional(),
	whatsapp: phoneSchema.optional(),
	dob: isoDateSchema.optional(),
	bloodGroup: z.string().max(8).optional(),
	emergencyContactName: z.string().max(255).optional(),
	emergencyContactPhone: phoneSchema.optional(),
	emergencyContactRelation: z.string().max(32).optional(),
	idDocumentType: z.string().max(32).optional(),
	idDocumentNumber: z.string().max(64).optional(),
	notes: z.string().max(2000).optional(),
	customFields: customFieldsSchema,
});

export const staffUpdateSchema = staffCreateSchema.partial();

export const committeeAssignmentCreateSchema = z.object({
	committeeId: uuidSchema,
	staffId: uuidSchema,
	roleInCommittee: z.string().max(64).optional(),
	isLead: z.boolean().default(false),
	responsibilities: z.string().max(2000).optional(),
	shiftStart: isoDatetimeSchema.optional(),
	shiftEnd: isoDatetimeSchema.optional(),
	assignmentNotes: z.string().max(1000).optional(),
});

export const vehicleCreateSchema = z.object({
	vehicleCode: z.string().max(32).optional(),
	vehicleType: z.string().max(32).optional(),
	plateNumber: z.string().max(32).optional(),
	make: z.string().max(64).optional(),
	model: z.string().max(64).optional(),
	capacity: z.number().int().min(1).max(60).default(4),
	driverName: z.string().max(255).optional(),
	driverPhone: phoneSchema.optional(),
	driverLicense: z.string().max(64).optional(),
	assignedCommitteeId: uuidSchema.optional(),
	isExternal: z.boolean().default(false),
	vendorName: z.string().max(255).optional(),
	vendorContact: z.string().max(255).optional(),
	ratePerDay: moneySchema.optional(),
	notes: z.string().max(2000).optional(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial().extend({
	status: z.enum(["available", "in_use", "maintenance", "unavailable"]).optional(),
});

export const travelSegmentCreateSchema = z.object({
	attendeeId: uuidSchema,
	direction: z.enum(TRAVEL_DIRECTIONS as readonly [TravelDirection, ...TravelDirection[]]),
	travelMode: z.enum(TRAVEL_MODES as readonly [TravelMode, ...TravelMode[]]).default("other"),
	carrier: z.string().max(255).optional(),
	serviceNumber: z.string().max(32).optional(),
	pnr: z.string().max(32).optional(),
	seatNumber: z.string().max(16).optional(),
	coachNumber: z.string().max(16).optional(),
	classOfTravel: z.string().max(32).optional(),

	originCity: z.string().max(120).optional(),
	originLocation: z.string().max(255).optional(),
	originTerminal: z.string().max(16).optional(),
	destinationCity: z.string().max(120).optional(),
	destinationLocation: z.string().max(255).optional(),
	destinationTerminal: z.string().max(16).optional(),

	scheduledTime: isoDatetimeSchema.optional(),
	actualTime: isoDatetimeSchema.optional(),

	pickupRequired: z.boolean().default(false),
	pickupStatus: z
		.enum(PICKUP_STATUSES as readonly [PickupStatus, ...PickupStatus[]])
		.default("not_required"),
	pickupPoint: z.string().max(255).optional(),
	dropPoint: z.string().max(255).optional(),
	pickupScheduledAt: isoDatetimeSchema.optional(),
	pickupCompletedAt: isoDatetimeSchema.optional(),

	vehicleId: uuidSchema.optional(),
	driverNameOverride: z.string().max(255).optional(),
	driverPhoneOverride: phoneSchema.optional(),

	travelGroupCode: z.string().max(32).optional(),
	notes: z.string().max(2000).optional(),
	customFields: customFieldsSchema,
});

export const travelSegmentUpdateSchema = travelSegmentCreateSchema
	.omit({ attendeeId: true, direction: true })
	.partial()
	.extend({
		status: z.enum(["planned", "in_transit", "arrived", "delayed", "cancelled"]).optional(),
	});

export const travelManifestQuerySchema = z.object({
	direction: z.enum(TRAVEL_DIRECTIONS as readonly [TravelDirection, ...TravelDirection[]]),
	gender: z.enum(GENDERS as readonly [Gender, ...Gender[]]).optional(),
	date: isoDateSchema.optional(),
	travelMode: z.enum(TRAVEL_MODES as readonly [TravelMode, ...TravelMode[]]).optional(),
	pickupStatus: z.enum(PICKUP_STATUSES as readonly [PickupStatus, ...PickupStatus[]]).optional(),
});

export const accommodationBlockCreateSchema = z.object({
	code: z.string().min(1).max(32),
	name: z.string().min(1).max(255),
	address: z.string().max(500).optional(),
	contactName: z.string().max(255).optional(),
	contactPhone: phoneSchema.optional(),
	notes: z.string().max(2000).optional(),
	sortOrder: z.number().int().default(0),
});

export const accommodationRoomCreateSchema = z.object({
	blockId: uuidSchema,
	roomNumber: z.string().min(1).max(32),
	floor: z.string().max(16).optional(),
	roomType: z.enum(ROOM_TYPES as readonly [RoomType, ...RoomType[]]).default("double"),
	capacity: z.number().int().min(1).max(20).default(2),
	genderPreference: z.enum(["male", "female", "mixed", "none"]).default("none"),
	amenities: z.array(z.string().max(40)).default([]),
	ratePerNight: moneySchema.optional(),
	notes: z.string().max(2000).optional(),
	customFields: customFieldsSchema,
});

export const allocationCreateSchema = z.object({
	roomId: uuidSchema,
	attendeeId: uuidSchema,
	bedNumber: z.string().max(16).optional(),
	plannedCheckinDate: isoDateSchema.optional(),
	plannedCheckoutDate: isoDateSchema.optional(),
	notes: z.string().max(1000).optional(),
});

export const allocationCheckActionSchema = z.object({
	action: z.enum(["check_in", "check_out", "cancel", "no_show"]),
	keyIssued: z.boolean().optional(),
	keyReturned: z.boolean().optional(),
	notes: z.string().max(500).optional(),
});

export type CommitteeCreateInput = z.infer<typeof committeeCreateSchema>;
export type CommitteeUpdateInput = z.infer<typeof committeeUpdateSchema>;
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
export type CommitteeAssignmentInput = z.infer<typeof committeeAssignmentCreateSchema>;
export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
export type TravelSegmentCreateInput = z.infer<typeof travelSegmentCreateSchema>;
export type TravelSegmentUpdateInput = z.infer<typeof travelSegmentUpdateSchema>;
export type TravelManifestQuery = z.infer<typeof travelManifestQuerySchema>;
export type AccommodationBlockInput = z.infer<typeof accommodationBlockCreateSchema>;
export type AccommodationRoomInput = z.infer<typeof accommodationRoomCreateSchema>;
export type AllocationCreateInput = z.infer<typeof allocationCreateSchema>;
