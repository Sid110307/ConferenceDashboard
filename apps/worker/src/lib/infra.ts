import { env } from "@/lib/env";
import {
	createLogger,
	decryptJSON as infraDecryptJSON,
	putObject as infraPutObject,
	storageKey as infraStorageKey,
} from "@conference/infra";

export const logger = createLogger({
	level: env.LOG_LEVEL,
	service: "@conference/worker",
	env: env.NODE_ENV,
});

export const storageKey = infraStorageKey;
export const putObject = infraPutObject;

const cryptoCfg = { encryptionKey: env.ENCRYPTION_KEY } as const;
export function decryptJSON<T = unknown>(blob: string): T {
	return infraDecryptJSON<T>(blob, cryptoCfg);
}
