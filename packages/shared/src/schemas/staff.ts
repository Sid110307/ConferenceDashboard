import { z } from "zod";

import { GENDERS, type Gender } from "../constants";
import { uuidSchema } from "./common";

const genderEnum = z.enum(GENDERS as readonly [Gender, ...Gender[]]);
export const staffListQuerySchema = z.object({
	q: z.string().trim().optional(),
	gender: genderEnum.optional(),
	prantha: z.string().optional(),
	status: z.enum(["active", "inactive"]).optional(),
	committeeId: uuidSchema.optional(),
	isLead: z.coerce.boolean().optional(),
});
