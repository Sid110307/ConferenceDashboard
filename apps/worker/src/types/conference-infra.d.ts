declare module "@conference/infra" {
	export const createLogger: any;
	export const createRedis: any;
	export const s3: any;
	export const storageKey: any;
	export const putObject: any;
	export const getObject: any;
	export const deleteObject: any;
	export const headObject: any;
	export const getSignedDownloadUrl: any;
	export const getSignedUploadUrl: any;
	export const encrypt: any;
	export const decrypt: any;
	export const encryptJSON: any;
	export const decryptJSON: any;
}
