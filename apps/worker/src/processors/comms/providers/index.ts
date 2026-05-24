import type { MessageChannel } from "@conference/shared";
import nodemailer from "nodemailer";

export type SendInput = {
	channel: MessageChannel;
	to: string;
	subject?: string | null;
	body: string;
	fromAddress?: string | null;
	fromName?: string | null;
	provider: string;
	credentials: Record<string, any>;
	configPublic?: Record<string, any> | null;
};

export type SendResult = {
	providerMessageId: string | null;
	rawResponse?: any;
};

export async function sendMessage(input: SendInput): Promise<SendResult> {
	if (input.channel === "email") return sendEmail(input);
	if (input.channel === "sms") return sendSms(input);
	if (input.channel === "whatsapp") return sendWhatsApp(input);
	throw new Error(`unsupported channel ${input.channel}`);
}

async function sendEmail(input: SendInput): Promise<SendResult> {
	const { provider, credentials } = input;
	const from =
		input.fromName && input.fromAddress
			? `"${input.fromName}" <${input.fromAddress}>`
			: (input.fromAddress ?? credentials.fromAddress);

	switch (provider) {
		case "smtp": {
			const t = nodemailer.createTransport({
				host: credentials.host,
				port: credentials.port ?? 587,
				secure: credentials.secure ?? false,
				auth: credentials.user
					? { user: credentials.user, pass: credentials.password }
					: undefined,
			});
			const info = await t.sendMail({
				from,
				to: input.to,
				subject: input.subject ?? "",
				text: input.body,
			});
			return { providerMessageId: info.messageId ?? null };
		}
		case "resend": {
			const res = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${credentials.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					from,
					to: [input.to],
					subject: input.subject ?? "",
					text: input.body,
				}),
			});
			if (!res.ok) {
				throw new Error(`resend HTTP ${res.status}: ${await res.text()}`);
			}
			const data = (await res.json()) as { id?: string };
			return { providerMessageId: data.id ?? null, rawResponse: data };
		}
		case "sendgrid": {
			const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${credentials.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					personalizations: [{ to: [{ email: input.to }] }],
					from: {
						email: input.fromAddress ?? credentials.fromAddress,
						name: input.fromName,
					},
					subject: input.subject ?? "",
					content: [
						{ type: "text/plain", value: input.body || "" },
						{ type: "text/html", value: input.body || "" },
					],
				}),
			});
			if (!res.ok && res.status !== 202) {
				throw new Error(`sendgrid HTTP ${res.status}: ${await res.text()}`);
			}
			return {
				providerMessageId: res.headers.get("x-message-id"),
			};
		}

		default:
			throw new Error(`unknown email provider ${provider}`);
	}
}

async function sendSms(input: SendInput): Promise<SendResult> {
	const { provider, credentials } = input;
	switch (provider) {
		case "twilio": {
			const sid = credentials.accountSid;
			const auth = Buffer.from(`${sid}:${credentials.authToken}`, "utf8").toString("base64");
			const form = new URLSearchParams({
				From: credentials.fromNumber,
				To: input.to,
				Body: input.body,
			});
			const res = await fetch(
				`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
				{
					method: "POST",
					headers: {
						"Authorization": `Basic ${auth}`,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: form.toString(),
				},
			);
			const data = (await res.json()) as any;
			if (!res.ok) {
				throw new Error(`twilio HTTP ${res.status}: ${JSON.stringify(data)}`);
			}
			return { providerMessageId: data.sid ?? null, rawResponse: data };
		}

		case "msg91": {
			const res = await fetch("https://control.msg91.com/api/v5/flow/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"authkey": credentials.authKey,
				},
				body: JSON.stringify({
					template_id: input.subject ?? credentials.templateId,
					sender: credentials.sender,
					short_url: 0,
					recipients: [{ mobiles: input.to.replace(/\D/g, "") }],
				}),
			});
			const data = (await res.json()) as any;
			if (!res.ok) {
				throw new Error(`msg91 HTTP ${res.status}: ${JSON.stringify(data)}`);
			}
			return {
				providerMessageId: data.request_id ?? null,
				rawResponse: data,
			};
		}

		default:
			throw new Error(`unknown sms provider ${provider}`);
	}
}

async function sendWhatsApp(input: SendInput): Promise<SendResult> {
	const { provider, credentials } = input;
	switch (provider) {
		case "twilio_whatsapp": {
			const sid = credentials.accountSid;
			const auth = Buffer.from(`${sid}:${credentials.authToken}`, "utf8").toString("base64");
			const form = new URLSearchParams({
				From: `whatsapp:${credentials.fromNumber}`,
				To: `whatsapp:${input.to}`,
				Body: input.body,
			});
			const res = await fetch(
				`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
				{
					method: "POST",
					headers: {
						"Authorization": `Basic ${auth}`,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: form.toString(),
				},
			);
			const data = (await res.json()) as any;
			if (!res.ok) {
				throw new Error(`twilio_wa HTTP ${res.status}: ${JSON.stringify(data)}`);
			}
			return { providerMessageId: data.sid ?? null, rawResponse: data };
		}
		case "meta_cloud": {
			const phoneId = credentials.phoneNumberId;
			const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${credentials.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messaging_product: "whatsapp",
					to: input.to,
					type: "text",
					text: { body: input.body, preview_url: false },
				}),
			});
			const data = (await res.json()) as any;
			if (!res.ok) {
				throw new Error(`meta whatsapp HTTP ${res.status}: ${JSON.stringify(data)}`);
			}
			return {
				providerMessageId: data.messages?.[0]?.id ?? null,
				rawResponse: data,
			};
		}
		default:
			throw new Error(`unknown whatsapp provider ${provider}`);
	}
}
