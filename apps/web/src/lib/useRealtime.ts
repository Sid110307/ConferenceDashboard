import { useEffect, useRef, useState } from "react";

export type RealtimeEvent = {
	type: string;
	entity?: string;
	id?: string;
	meta?: Record<string, unknown>;
	ts?: string;
};

export function useRealtime(
	conferenceSlug: string | null | undefined,
	onEvent?: (ev: RealtimeEvent) => void,
) {
	const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
	const [connected, setConnected] = useState(false);
	const onEventRef = useRef(onEvent);

	useEffect(() => {
		if (!conferenceSlug) return;
		const url = `/api/v1/c/${conferenceSlug}/realtime/stream`;
		const es = new EventSource(url, { withCredentials: true });

		const handler = (e: MessageEvent) => {
			try {
				const data = JSON.parse(e.data) as RealtimeEvent;
				setLastEvent(data);
				onEventRef.current?.(data);
			} catch {
				// ignore
			}
		};

		es.addEventListener("message", handler);
		es.addEventListener("ready", () => setConnected(true));
		es.addEventListener("error", () => setConnected(false));

		return () => {
			es.close();
			setConnected(false);
		};
	}, [conferenceSlug]);

	return { lastEvent, connected };
}
