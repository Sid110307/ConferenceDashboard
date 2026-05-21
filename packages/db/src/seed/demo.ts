import "dotenv/config";

import { dbAdmin } from "@/client";
import { accommodationBlocks, accommodationRooms, roomAllocations } from "@/schema/accommodation";
import { attendees } from "@/schema/attendees";
import { users } from "@/schema/auth";
import { messageCampaigns, messageTemplates } from "@/schema/communications";
import { conferences } from "@/schema/conferences";
import { customFieldDefinitions } from "@/schema/custom_fields";
import { financeItems, sponsors } from "@/schema/finance";
import { foodPlans } from "@/schema/food";
import { helpdeskIssues } from "@/schema/helpdesk";
import { dailyControlLogs } from "@/schema/misc";
import { conferenceSessions, sessionSpeakers, speakers, tracks, venues } from "@/schema/programme";
import { committeeAssignments, committees, staff } from "@/schema/staff";
import { travelSegments, vehicles } from "@/schema/travel";
import { faker } from "@faker-js/faker";
import { addHours, addMinutes } from "date-fns";
import { eq, sql } from "drizzle-orm";

import { DEFAULT_COMMITTEES, DEFAULT_CUSTOM_FIELDS } from "./reference";


faker.seed(69420);

const KARNATAKA_PRANTHAS = [
	"Bengaluru Mahanagara",
	"Bengaluru Grameena",
	"Mysuru",
	"Mangaluru",
	"Hubballi-Dharwad",
	"Belagavi",
	"Kalaburagi",
	"Shivamogga",
	"Davanagere",
	"Tumakuru",
	"Udupi",
	"Chikkamagaluru",
];
const INDIAN_STATES = [
	"Karnataka",
	"Tamil Nadu",
	"Maharashtra",
	"Andhra Pradesh",
	"Telangana",
	"Kerala",
	"Delhi",
	"West Bengal",
];
const INDIAN_FIRST_NAMES_M = [
	"Arjun",
	"Vikram",
	"Rohan",
	"Karthik",
	"Aditya",
	"Siddharth",
	"Rahul",
	"Ananth",
	"Suresh",
	"Vinod",
	"Manish",
	"Pradeep",
	"Ramesh",
	"Mohan",
];
const INDIAN_FIRST_NAMES_F = [
	"Ananya",
	"Priya",
	"Lakshmi",
	"Sneha",
	"Divya",
	"Meera",
	"Sruthi",
	"Kavitha",
	"Pooja",
	"Aishwarya",
	"Bhavya",
	"Nikitha",
	"Shruti",
	"Padma",
];
const INDIAN_LAST_NAMES = [
	"Sharma",
	"Rao",
	"Iyer",
	"Reddy",
	"Hegde",
	"Bhat",
	"Naik",
	"Murthy",
	"Acharya",
	"Pai",
	"Shenoy",
	"Gowda",
	"Kamath",
	"Kulkarni",
];
const INDIAN_AIRPORTS = [
	["BLR", "Bengaluru (KIA)"],
	["DEL", "Delhi (IGI)"],
	["BOM", "Mumbai (CSIA)"],
	["MAA", "Chennai"],
	["HYD", "Hyderabad"],
	["CCU", "Kolkata"],
	["COK", "Kochi"],
	["IXM", "Madurai"],
];
const AIRLINE_CARRIERS = ["Indigo", "Air India", "Vistara", "SpiceJet", "Akasa Air"];

function pickIndianName(gender: "male" | "female"): string {
	const first =
		gender === "male"
			? faker.helpers.arrayElement(INDIAN_FIRST_NAMES_M)
			: faker.helpers.arrayElement(INDIAN_FIRST_NAMES_F);
	const last = faker.helpers.arrayElement(INDIAN_LAST_NAMES);
	return `${first} ${last}`;
}

function indianPhone(): string {
	return `+91-9${faker.number.int({ min: 100000000, max: 999999999 })}`;
}

function attendeeCode(idx: number): string {
	return `NCC26-A${String(idx).padStart(4, "0")}`;
}

async function main() {
	console.log("Seeding demo conference data...");
	const previous = await dbAdmin
		.select({ id: conferences.id })
		.from(conferences)
		.where(eq(conferences.slug, "demo-2026"));
	if (previous[0]) {
		await dbAdmin.delete(conferences).where(eq(conferences.id, previous[0].id));
		console.log("Existing demo conference data deleted. Reseeding fresh data...");
	}

	const [adminRow] = await dbAdmin
		.select({ id: users.id })
		.from(users)
		.where(eq(users.isPlatformAdmin, true))
		.limit(1);
	if (!adminRow) throw new Error("Run `pnpm db:seed` first to create the platform super-admin.");
	const adminId = adminRow.id;

	console.log("Creating conference...");
	const startDate = "2026-12-26";
	const endDate = "2026-12-29";
	const [conf] = await dbAdmin
		.insert(conferences)
		.values({
			slug: "demo-2026",
			name: "Demo National Conference 2026",
			shortName: "NCC26",
			description:
				"A sample multi-day conference used by Conference Dashboard for demo purposes.",
			startDate,
			endDate,
			timezone: "Asia/Kolkata",
			conferenceStatus: "active",
			publicStatus: "published",
			venueName: "Indian Institute of Science",
			venueAddress: "CV Raman Avenue",
			venueCity: "Bengaluru",
			venueState: "Karnataka",
			venueCountry: "India",
			currentDay: 1,
			createdBy: adminId,
		})
		.returning({ id: conferences.id });
	if (!conf) throw new Error("Failed to create demo conference");
	const conferenceId = conf.id;
	console.log(`Conference created with ID: ${conferenceId}`);

	console.log("Creating committees...");
	const committeeRows = await dbAdmin
		.insert(committees)
		.values(
			DEFAULT_COMMITTEES.map((c, i) => ({
				conferenceId,
				slug: c.slug,
				name: c.name,
				description: c.description,
				icon: c.icon,
				color: c.color,
				sortOrder: i,
				isEnabled: true,
				createdBy: adminId,
			})),
		)
		.returning({ id: committees.id, slug: committees.slug });
	const committeesBySlug = Object.fromEntries(committeeRows.map(c => [c.slug, c.id]));

	console.log("Creating default custom fields...");
	for (const def of DEFAULT_CUSTOM_FIELDS) {
		await dbAdmin.insert(customFieldDefinitions).values({
			conferenceId,
			entity: def.entity,
			fieldKey: def.fieldKey,
			fieldLabel: def.fieldLabel,
			fieldType: def.fieldType,
			isRequired: def.isRequired ?? false,
			isVisibleInList: def.isVisibleInList ?? false,
			isSearchable: def.isSearchable ?? false,
			helpText: def.helpText,
			options: def.options ?? [],
			groupName: def.groupName,
			sortOrder: def.sortOrder ?? 0,
			createdBy: adminId,
		});
	}

	console.log("Creating staff...");
	const staffIds: string[] = [];
	for (let i = 0; i < 20; i++) {
		const gender: "male" | "female" = i % 3 === 0 ? "female" : "male";
		const name = pickIndianName(gender);
		const [row] = await dbAdmin
			.insert(staff)
			.values({
				conferenceId,
				staffCode: `S-${String(i + 1).padStart(3, "0")}`,
				name,
				gender,
				designation: faker.helpers.arrayElement([
					"Coordinator",
					"Member",
					"Lead",
					"Volunteer",
				]),
				institution: faker.helpers.arrayElement([
					"IISc Bengaluru",
					"IIT Madras",
					"NITK Surathkal",
					"BMS College",
					"PES University",
				]),
				prantha: faker.helpers.arrayElement(KARNATAKA_PRANTHAS),
				city: "Bengaluru",
				state: "Karnataka",
				country: "India",
				email: faker.internet
					.email({ firstName: name.split(" ")[0], lastName: name.split(" ")[1] })
					.toLowerCase(),
				phone: indianPhone(),
				bloodGroup: faker.helpers.arrayElement([
					"A+",
					"B+",
					"O+",
					"AB+",
					"A-",
					"B-",
					"O-",
					"AB-",
				]),
				status: "active",
				createdBy: adminId,
			})
			.returning({ id: staff.id });
		if (row) staffIds.push(row.id);
	}

	console.log("Assigning staff to committees...");
	const committeeSlugs = Object.keys(committeesBySlug);
	for (let i = 0; i < staffIds.length; i++) {
		const sId = staffIds[i]!;
		const count = i % 3 === 0 ? 2 : 1;
		const picked = faker.helpers.arrayElements(committeeSlugs, count);

		let isLead = i < 5;
		for (const slug of picked) {
			await dbAdmin.insert(committeeAssignments).values({
				conferenceId,
				committeeId: committeesBySlug[slug]!,
				staffId: sId,
				roleInCommittee: isLead ? "Lead" : "Member",
				isLead,
				createdBy: adminId,
			});
			isLead = false;
		}
	}

	console.log("Creating attendees...");
	const attendeeIds: { id: string; gender: "male" | "female"; name: string }[] = [];
	const categories: Array<"student" | "faculty" | "industry" | "speaker" | "vip" | "guest"> = [
		"student",
		"faculty",
		"industry",
		"speaker",
		"vip",
		"guest",
	];

	for (let i = 0; i < 50; i++) {
		const gender: "male" | "female" = i % 2 === 0 ? "male" : "female";
		const name = pickIndianName(gender);
		const category = i < 4 ? "vip" : i < 8 ? "speaker" : faker.helpers.arrayElement(categories);
		const isVip = category === "vip" || (category === "speaker" && i < 6);

		const [row] = await dbAdmin
			.insert(attendees)
			.values({
				conferenceId,
				attendeeCode: attendeeCode(i + 1),
				name,
				gender,
				salutation:
					gender === "male"
						? faker.helpers.arrayElement(["Mr.", "Dr.", "Prof."])
						: faker.helpers.arrayElement(["Ms.", "Dr.", "Prof.", "Mrs."]),
				designation: faker.helpers.arrayElement([
					"Student",
					"Research Scholar",
					"Assistant Professor",
					"Associate Professor",
					"Professor",
					"Engineer",
					"Founder",
					"Director",
				]),
				institution: faker.helpers.arrayElement([
					"IISc Bengaluru",
					"IIT Madras",
					"IIT Bombay",
					"NITK Surathkal",
					"BMS College of Engineering",
					"PES University",
					"Anna University",
					"Jadavpur University",
				]),
				prantha: faker.helpers.arrayElement(KARNATAKA_PRANTHAS),
				city: faker.helpers.arrayElement([
					"Bengaluru",
					"Chennai",
					"Mumbai",
					"Hyderabad",
					"Delhi",
					"Mysuru",
					"Pune",
				]),
				state: faker.helpers.arrayElement(INDIAN_STATES),
				country: "India",
				email: faker.internet
					.email({ firstName: name.split(" ")[0], lastName: name.split(" ")[1] })
					.toLowerCase(),
				phone: indianPhone(),
				category,
				registrationStatus: i < 45 ? "confirmed" : "registered",
				checkinStatus: i < 30 ? "checked_in" : "not_checked_in",
				checkedInAt:
					i < 30
						? new Date(`2026-12-26T08:${String(i).padStart(2, "0")}:00+05:30`)
						: null,
				badgePrinted: i < 28,
				kitCollected: i < 25,
				dietaryPreference: faker.helpers.arrayElement([
					"vegetarian",
					"non_veg",
					"vegan",
					"jain",
					"none",
				]),
				isVip,
				protocolLevel: isVip ? faker.helpers.arrayElement(["a_plus", "a", "b"]) : "none",
				bloodGroup: faker.helpers.arrayElement([
					"A+",
					"B+",
					"O+",
					"AB+",
					"A-",
					"B-",
					"O-",
					"AB-",
				]),
				registrationFee: category === "student" ? "500.00" : "1500.00",
				tags: faker.helpers.arrayElements(
					["day1", "day2", "day3", "delegate", "guest", "early-bird"],
					{ min: 1, max: 3 },
				),
				createdBy: adminId,
			})
			.returning({ id: attendees.id });
		if (row) attendeeIds.push({ id: row.id, gender, name });
	}

	console.log("Creating vehicles...");
	const vehicleIds: string[] = [];
	for (let i = 0; i < 6; i++) {
		const [row] = await dbAdmin
			.insert(vehicles)
			.values({
				conferenceId,
				vehicleCode: `V-${String(i + 1).padStart(2, "0")}`,
				vehicleType: i < 3 ? "sedan" : i < 5 ? "suv" : "minibus",
				plateNumber: `KA-01-${faker.string.alpha(2).toUpperCase()}-${faker.number.int({ min: 1000, max: 9999 })}`,
				make: i % 2 ? "Toyota" : "Maruti Suzuki",
				model: i % 2 ? "Innova" : "Ertiga",
				capacity: i < 3 ? 4 : i < 5 ? 6 : 14,
				driverName: pickIndianName("male"),
				driverPhone: indianPhone(),
				assignedCommitteeId: committeesBySlug["transportation"]!,
				status: i < 4 ? "available" : "in_use",
				ratePerDay: "2500.00",
				isExternal: i >= 3,
				vendorName: i >= 3 ? "City Cabs Bengaluru" : null,
				createdBy: adminId,
			})
			.returning({ id: vehicles.id });
		if (row) vehicleIds.push(row.id);
	}

	console.log("Creating travel segments...");
	const baseArrival = new Date("2026-12-26T05:00:00+05:30");
	const baseDeparture = new Date("2026-12-29T18:00:00+05:30");
	for (let i = 0; i < attendeeIds.length; i++) {
		const a = attendeeIds[i]!;
		const mode: "flight" | "train" | "car" =
			i % 5 === 0 ? "train" : i % 7 === 0 ? "car" : "flight";

		const arrivalAirport = faker.helpers.arrayElement(INDIAN_AIRPORTS);
		await dbAdmin.insert(travelSegments).values({
			conferenceId,
			attendeeId: a.id,
			direction: "arrival",
			travelMode: mode,
			carrier:
				mode === "flight"
					? faker.helpers.arrayElement(AIRLINE_CARRIERS)
					: "Indian Railways",
			serviceNumber:
				mode === "flight"
					? `6E-${faker.number.int({ min: 100, max: 999 })}`
					: `12${faker.number.int({ min: 600, max: 999 })}`,
			pnr: faker.string.alphanumeric(6).toUpperCase(),
			seatNumber:
				mode === "flight"
					? `${faker.number.int({ min: 1, max: 32 })}${faker.helpers.arrayElement(["A", "B", "C", "D", "E", "F"])}`
					: `S${faker.number.int({ min: 1, max: 12 })}-${faker.number.int({ min: 1, max: 72 })}`,
			originCity: mode === "flight" ? (arrivalAirport[1] ?? null) : "Hubballi",
			originLocation: mode === "flight" ? `${arrivalAirport[0]} airport` : "Hubballi Jn",
			destinationCity: "Bengaluru",
			destinationLocation:
				mode === "flight" ? "Kempegowda International Airport" : "KSR Bengaluru",
			scheduledTime: addMinutes(baseArrival, i * 25),
			actualTime:
				i < 35
					? addMinutes(baseArrival, i * 25 + faker.number.int({ min: -10, max: 20 }))
					: null,
			status: i < 35 ? "arrived" : i < 45 ? "planned" : "delayed",
			pickupRequired: true,
			pickupStatus:
				i < 30 ? "completed" : i < 35 ? "en_route" : i < 45 ? "scheduled" : "not_required",
			pickupPoint: mode === "flight" ? "Terminal 2 Exit Gate" : "KSR Platform 1",
			dropPoint: "IISc Guest House",
			vehicleId: vehicleIds[i % vehicleIds.length],
			createdBy: adminId,
		});

		await dbAdmin.insert(travelSegments).values({
			conferenceId,
			attendeeId: a.id,
			direction: "departure",
			travelMode: mode,
			carrier:
				mode === "flight"
					? faker.helpers.arrayElement(AIRLINE_CARRIERS)
					: "Indian Railways",
			serviceNumber:
				mode === "flight"
					? `AI-${faker.number.int({ min: 100, max: 999 })}`
					: `12${faker.number.int({ min: 600, max: 999 })}`,
			originCity: "Bengaluru",
			originLocation:
				mode === "flight" ? "Kempegowda International Airport" : "KSR Bengaluru",
			destinationCity: mode === "flight" ? (arrivalAirport[1] ?? null) : "Hubballi",
			scheduledTime: addMinutes(baseDeparture, i * 20),
			status: "planned",
			pickupRequired: true,
			pickupStatus: "scheduled",
			pickupPoint: "IISc Guest House",
			dropPoint: mode === "flight" ? "Terminal 2 Departures" : "KSR Platform 1",
			vehicleId: vehicleIds[(i + 2) % vehicleIds.length],
			createdBy: adminId,
		});
	}

	console.log("Creating accommodation block + rooms...");
	const [block] = await dbAdmin
		.insert(accommodationBlocks)
		.values({
			conferenceId,
			code: "GH-1",
			name: "Centenary Guest House",
			address: "IISc Campus, Bengaluru",
			contactName: "Mr. Krishnamurthy",
			contactPhone: indianPhone(),
			createdBy: adminId,
		})
		.returning({ id: accommodationBlocks.id });
	if (!block) throw new Error("Failed to create accommodation block");

	const roomIds: string[] = [];
	for (let i = 1; i <= 12; i++) {
		const [room] = await dbAdmin
			.insert(accommodationRooms)
			.values({
				conferenceId,
				blockId: block.id,
				roomNumber: `${100 + i}`,
				floor: i <= 6 ? "1" : "2",
				roomType: i % 3 === 0 ? "single" : "double",
				capacity: i % 3 === 0 ? 1 : 2,
				occupiedCount: 0,
				genderPreference: i <= 6 ? "male" : "female",
				status: "available",
				amenities: ["ac", "wifi", "attached_bath", "hot_water"],
				ratePerNight: "1800.00",
				createdBy: adminId,
			})
			.returning({ id: accommodationRooms.id });
		if (room) roomIds.push(room.id);
	}

	console.log("Allocating rooms...");
	let roomCursor = 0;
	for (let i = 0; i < 20 && i < attendeeIds.length; i++) {
		const a = attendeeIds[i]!;
		const roomId = roomIds[roomCursor]!;
		if (!roomId) break;
		await dbAdmin.insert(roomAllocations).values({
			conferenceId,
			roomId,
			attendeeId: a.id,
			bedNumber: i % 2 === 0 ? "1" : "2",
			plannedCheckinDate: startDate,
			plannedCheckoutDate: endDate,
			checkinAt:
				i < 12
					? new Date(`2026-12-26T09:${String(i + 10).padStart(2, "0")}:00+05:30`)
					: null,
			keyIssued: i < 12,
			status: i < 12 ? "checked_in" : "pending",
			createdBy: adminId,
		});
		if (i % 2 === 1) roomCursor++;
	}

	await dbAdmin.execute(sql`
		UPDATE accommodation_rooms r
		SET occupied_count = (SELECT COUNT(*)
		                      FROM room_allocations a
		                      WHERE a.room_id = r.id
			                    AND a.status IN ('pending', 'checked_in')
			                    AND a.deleted_at IS NULL),
		    status         = CASE
								 WHEN (SELECT COUNT(*)
			                           FROM room_allocations a
			                           WHERE a.room_id = r.id
				                         AND a.status IN ('pending', 'checked_in')
				                         AND a.deleted_at IS NULL) >= r.capacity THEN 'occupied'::room_status
			                     WHEN (SELECT COUNT(*)
			                           FROM room_allocations a
			                           WHERE a.room_id = r.id
				                         AND a.status IN ('pending', 'checked_in')
				                         AND a.deleted_at IS NULL) > 0 THEN 'reserved'::room_status
			                     ELSE r.status
				END
		WHERE r.conference_id = ${conferenceId}
	`);

	console.log("Creating food plans...");
	for (let d = 0; d < 4; d++) {
		const date = `2026-12-${26 + d}`;
		await dbAdmin.insert(foodPlans).values({
			conferenceId,
			mealDate: date,
			dayLabel: `Day ${d + 1}`,
			breakfastCount: 480 + d * 5,
			lunchCount: 500 + d * 4,
			teaCount: 500,
			dinnerCount: 470 - d * 3,
			snacksCount: 200,
			vegCount: 350,
			nonvegCount: 120,
			veganCount: 10,
			jainCount: 15,
			specialCount: 5,
			venue: "Convention Centre Lawn",
			caterer: "Adigas Caterers",
			createdBy: adminId,
		});
	}

	console.log("Creating programme...");
	const [hallA] = await dbAdmin
		.insert(venues)
		.values({
			conferenceId,
			name: "Main Hall (Hall A)",
			location: "Convention Centre, Ground Floor",
			capacity: 500,
			hasProjector: true,
			hasMic: true,
			hasAc: true,
			hasRecording: true,
			createdBy: adminId,
		})
		.returning({ id: venues.id });
	const [hallB] = await dbAdmin
		.insert(venues)
		.values({
			conferenceId,
			name: "Hall B",
			location: "Convention Centre, First Floor",
			capacity: 200,
			hasProjector: true,
			hasMic: true,
			hasAc: true,
			createdBy: adminId,
		})
		.returning({ id: venues.id });

	const [trackAi] = await dbAdmin
		.insert(tracks)
		.values({
			conferenceId,
			name: "AI & Machine Learning",
			code: "AI",
			color: "violet",
			createdBy: adminId,
		})
		.returning({ id: tracks.id });
	const [trackSustain] = await dbAdmin
		.insert(tracks)
		.values({
			conferenceId,
			name: "Sustainability & Water",
			code: "SUST",
			color: "emerald",
			createdBy: adminId,
		})
		.returning({ id: tracks.id });

	const speakerIds: string[] = [];
	for (let i = 0; i < 6; i++) {
		const gender: "male" | "female" = i % 2 === 0 ? "male" : "female";
		const name = pickIndianName(gender);
		const [row] = await dbAdmin
			.insert(speakers)
			.values({
				conferenceId,
				name,
				salutation: "Prof.",
				designation: "Professor",
				institution: faker.helpers.arrayElement(["IISc", "IIT-M", "IIT-B"]),
				bio: faker.lorem.paragraph(),
				isVip: i < 2,
				sortOrder: i,
				createdBy: adminId,
			})
			.returning({ id: speakers.id });
		if (row) speakerIds.push(row.id);
	}

	const day1 = new Date("2026-12-26T09:00:00+05:30");
	for (let i = 0; i < 8; i++) {
		const start = addHours(day1, i * 1.5);
		const end = addMinutes(start, 75);
		const isKeynote = i === 0 || i === 4;
		const [sess] = await dbAdmin
			.insert(conferenceSessions)
			.values({
				conferenceId,
				title: isKeynote
					? `Keynote: ${faker.company.catchPhrase()}`
					: `Session ${i + 1}: ${faker.company.catchPhrase()}`,
				description: faker.lorem.paragraph(),
				sessionType: isKeynote ? "keynote" : "invited",
				startTime: start,
				endTime: end,
				trackId: i % 2 === 0 ? trackAi?.id : trackSustain?.id,
				venueId: i % 2 === 0 ? hallA?.id : hallB?.id,
				status: i < 2 ? "done" : i === 2 ? "ongoing" : "upcoming",
				publicStatus: "published",
				createdBy: adminId,
			})
			.returning({ id: conferenceSessions.id });
		if (sess) {
			await dbAdmin.insert(sessionSpeakers).values({
				conferenceId,
				sessionId: sess.id,
				speakerId: speakerIds[i % speakerIds.length]!,
				role: isKeynote ? "keynote" : "speaker",
				sortOrder: 0,
			});
		}
	}

	console.log("Creating messaging templates and a draft campaign...");
	const [welcomeTpl] = await dbAdmin
		.insert(messageTemplates)
		.values({
			conferenceId,
			name: "Welcome Email",
			channel: "email",
			subject: "Welcome to {{conference_name}}!",
			body:
				"Dear {{name}},\n\nWelcome to {{conference_name}}!\n\n" +
				"Your attendee code is {{attendee_code}}.\nVenue: {{venue}}\nDates: {{start_date}} - {{end_date}}\n\n" +
				"See you soon!\nThe Organising Committee",
			variables: [
				{ key: "name", label: "Attendee Name", example: "Arjun Sharma", required: true },
				{ key: "conference_name", label: "Conference Name", example: "Demo NCC 2026" },
				{ key: "attendee_code", label: "Attendee Code", example: "NCC26-A0001" },
				{ key: "venue", label: "Venue Name", example: "IISc Convention Centre" },
				{ key: "start_date", label: "Start Date", example: "26 Dec 2026" },
				{ key: "end_date", label: "End Date", example: "29 Dec 2026" },
			],
			createdBy: adminId,
		})
		.returning({ id: messageTemplates.id });

	if (welcomeTpl) {
		await dbAdmin.insert(messageCampaigns).values({
			conferenceId,
			name: "Welcome: All Delegates (Draft)",
			channel: "email",
			templateId: welcomeTpl.id,
			audienceFilter: { category: ["student", "faculty", "industry"] },
			status: "draft",
			createdBy: adminId,
		});
	}

	console.log("Creating sample helpdesk issues...");
	for (let i = 0; i < 5; i++) {
		const a = attendeeIds[i]!;
		await dbAdmin.insert(helpdeskIssues).values({
			conferenceId,
			issueCode: `H-${String(i + 1).padStart(4, "0")}`,
			attendeeId: a.id,
			reportedByName: a.name,
			reporterType: "attendee",
			category: faker.helpers.arrayElement([
				"transport",
				"accommodation",
				"food",
				"badge",
				"technical",
			]),
			title: faker.helpers.arrayElement([
				"Pickup not arrived",
				"Room AC not working",
				"Special meal not provided",
				"Badge typo correction",
				"Wi-Fi password issue",
			]),
			description: faker.lorem.sentence(),
			priority: faker.helpers.arrayElement(["medium", "high", "urgent"]),
			status: i < 2 ? "resolved" : i < 4 ? "in_progress" : "open",
			resolvedAt: i < 2 ? new Date() : null,
			createdBy: adminId,
		});
	}

	console.log("Creating daily control logs...");
	for (let d = 0; d < 2; d++) {
		await dbAdmin.insert(dailyControlLogs).values({
			conferenceId,
			logDate: new Date(`2026-12-${26 + d}T18:00:00+05:30`),
			dayLabel: `Day ${d + 1}`,
			shiftLabel: "evening",
			summary: `Day ${d + 1} concluded smoothly. All sessions ran on time.`,
			incidents: d === 0 ? "Minor power flicker at 14:30, resolved in 2 min." : null,
			actionsTaken: "Catering capacity increased for lunch from Day 2.",
			pendingActions: "Order extra tea urns.",
			stats: {
				registered_today: 12,
				checked_in_today: 8,
				meals_served: 460,
				issues_open: 3,
				issues_resolved: 7,
			},
			shiftHeadName: "Dr. Krishna",
			createdBy: adminId,
		});
	}

	console.log("Creating finance/sponsor sample data...");
	await dbAdmin.insert(financeItems).values([
		{
			conferenceId,
			itemName: "Venue Rental",
			itemType: "expense",
			category: "venue_av",
			budgetAmount: "500000.00",
			actualAmount: "475000.00",
			paymentStatus: "paid",
			vendorOrSource: "IISc Estate Office",
			createdBy: adminId,
		},
		{
			conferenceId,
			itemName: "Catering - 4 days",
			itemType: "expense",
			category: "food",
			budgetAmount: "800000.00",
			actualAmount: "0",
			paymentStatus: "pending",
			vendorOrSource: "Adigas Caterers",
			createdBy: adminId,
		},
		{
			conferenceId,
			itemName: "Registration Fees",
			itemType: "income",
			category: "registration",
			budgetAmount: "750000.00",
			actualAmount: "612000.00",
			paymentStatus: "received",
			vendorOrSource: "Attendee payments",
			createdBy: adminId,
		},
	]);

	await dbAdmin.insert(sponsors).values([
		{
			conferenceId,
			name: "Bharat Electronics Limited",
			tier: "title",
			contributionAmount: "1000000.00",
			website: "https://bel-india.in",
			contactName: "Mr. Suresh",
			contactEmail: "example@example.com",
			contactPhone: indianPhone(),
			createdBy: adminId,
		},
		{
			conferenceId,
			name: "Wipro Limited",
			tier: "platinum",
			contributionAmount: "500000.00",
			contactName: "Ms. Lakshmi",
			contactEmail: "example@example.com",
			createdBy: adminId,
		},
	]);

	console.log(
		"\nDemo conference seeded successfully: demo-2026 | ${attendeeIds.length} attendees, ${staffIds.length} staff, ${committeeRows.length} committees, ${roomIds.length} rooms.",
	);
	process.exit(0);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
