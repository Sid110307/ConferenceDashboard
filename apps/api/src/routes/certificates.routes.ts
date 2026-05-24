import { makeCrudRouter } from "@/lib/crud-factory";
import { certificates } from "@conference/db";
import { z } from "zod";

const certificateTypes = ["participation", "speaker", "volunteer", "organizer", "award"] as const;
const certificateStatuses = ["not_issued", "generated", "emailed", "printed", "revoked"] as const;

export const certificatesRouter = makeCrudRouter({
	table: certificates as any,
	entity: "certificate",
	searchColumns: [certificates.certificateCode],
	defaultSort: certificates.createdAt,
	createSchema: z.object({
		attendeeId: z.string().uuid(),
		certificateType: z.enum(certificateTypes).default("participation"),
		certificateCode: z.string().min(1).max(64),
		status: z.enum(certificateStatuses).default("not_issued"),
		generatedAt: z.string().datetime({ offset: true }).optional(),
		issuedAt: z.string().datetime({ offset: true }).optional(),
		emailedAt: z.string().datetime({ offset: true }).optional(),
		printedAt: z.string().datetime({ offset: true }).optional(),
		revokedAt: z.string().datetime({ offset: true }).optional(),
		certificateFileId: z.string().uuid().optional(),
		verificationToken: z.string().max(64).optional(),
	}),
	updateSchema: z
		.object({
			attendeeId: z.string().uuid(),
			certificateType: z.enum(certificateTypes),
			certificateCode: z.string().min(1).max(64),
			status: z.enum(certificateStatuses),
			generatedAt: z.string().datetime({ offset: true }).nullable(),
			issuedAt: z.string().datetime({ offset: true }).nullable(),
			emailedAt: z.string().datetime({ offset: true }).nullable(),
			printedAt: z.string().datetime({ offset: true }).nullable(),
			revokedAt: z.string().datetime({ offset: true }).nullable(),
			certificateFileId: z.string().uuid().nullable(),
			verificationToken: z.string().max(64).nullable(),
		})
		.partial(),
});
